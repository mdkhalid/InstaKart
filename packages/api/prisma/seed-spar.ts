import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

function loadPriceMap(): Record<string, { price: number; salePrice: number | null }> {
  const priceMapPath = path.join(SCRIPTS_DIR, "spar-price-map.json");
  if (!fs.existsSync(priceMapPath)) {
    console.warn("WARNING: Price map not found at " + priceMapPath + ". Using default prices.");
    return {};
  }
  return JSON.parse(fs.readFileSync(priceMapPath, "utf8"));
}

const prisma = new PrismaClient();

type ImageEntry = {
  sku: string;
  productName: string;
  source: string;
  sourceUrl: string;
  url: string;
  file: string;
  bytes: number;
};

const SPAR_DATA_DIR = path.resolve(__dirname, "..", "..", "..", "scripts");
const SCRIPTS_DIR = path.resolve(__dirname, "..", "..", "..", "scripts");

function loadSparData(): any[] {
  const dataPath = path.join(SPAR_DATA_DIR, "spar-products.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`SPAR data not found at ${dataPath}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function loadImageManifest(): Map<string, ImageEntry> {
  const manifestPath = path.join(SCRIPTS_DIR, "seed-images-manifest-spar.json");
  if (!fs.existsSync(manifestPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { images: ImageEntry[] };
  return new Map(data.images.map((i) => [i.sku, i]));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function parseUnit(weight: string | null): string {
  if (!weight) return "pcs";
  const upper = weight.toUpperCase();
  if (upper.includes("KG")) return "kg";
  if (upper.includes("G")) return "g";
  if (upper.includes("L") && !upper.includes("ML")) return "L";
  if (upper.includes("ML")) return "ml";
  return "pcs";
}

function extractDescription(p: any): string {
  if (p.description) return p.description;
  const parts = [p.name];
  if (p.brand) parts.push(`Brand: ${p.brand}`);
  if (p.weight) parts.push(`Weight: ${p.weight}`);
  if (p.leaf_category) parts.push(`Category: ${p.leaf_category}`);
  return parts.join(" - ");
}

async function main() {
  console.log("Loading SPAR India data...");
  const sparData = loadSparData();
  const imageManifest = loadImageManifest();
  const priceMap = loadPriceMap();
  console.log("Loaded " + Object.keys(priceMap).length + " price entries");

  if (sparData.length === 0) {
    console.error("No SPAR data loaded. Aborting.");
    process.exit(1);
  }

  console.log(`Loaded ${sparData.length} products from SPAR India`);
  console.log(`Image manifest entries: ${imageManifest.size}`);

  // ==========================================
  // STEP 1: Create Categories
  // ==========================================
  console.log("\nCreating categories...");

  // Extract unique categories
  const categoryMap: Record<string, { name: string; path: string }> = {};
  for (const p of sparData) {
    const catName = p.category;
    if (catName && !categoryMap[catName]) {
      categoryMap[catName] = { name: catName, path: p.category_path || "" };
    }
  }

  // Top-level parent categories
  const topCategories = [
    "Grocery", "Fruits & Vegetables", "Fish & Meat", "Packaged Food",
    "Dairy & Beverages", "Home & Kitchen", "Personal Care",
    "Baby Care & Kids", "Pet Food"
  ];

  // Create parent categories first
  for (const catName of topCategories) {
    if (!categoryMap[catName]) continue;
    await prisma.category.upsert({
      where: { slug: slugify(catName) },
      update: { name: catName, isActive: true },
      create: {
        name: catName,
        slug: slugify(catName),
        description: `${catName} - from SPAR India`,
        isActive: true,
        sortOrder: 1,
      },
    });
  }

  // Fetch existing categories
  const allDbCategories = await prisma.category.findMany();
  const parentCatMap: Record<string, string> = {};
  for (const c of allDbCategories) {
    parentCatMap[c.name] = c.id;
  }

  // Create SPAR sub-categories
  let catCount = 0;
  for (const [catName] of Object.entries(categoryMap)) {
    const slug = slugify(catName);
    if (!slug) continue;
    if (parentCatMap[catName]) continue;

    try {
      await prisma.category.upsert({
        where: { slug },
        update: { name: catName, isActive: true },
        create: {
          name: catName,
          slug,
          description: `SPAR India - ${catName}`,
          isActive: true,
          sortOrder: 10,
        },
      });
      catCount++;
    } catch (e: any) {
      console.error(`  Failed to create category "${catName}": ${e.message}`);
    }
  }

  console.log(`Created/updated ${catCount} SPAR categories`);

  // Refresh category ID map
  const refreshedCats = await prisma.category.findMany();
  const categoryIdByName: Record<string, string> = {};
  for (const c of refreshedCats) {
    categoryIdByName[c.name] = c.id;
  }

  // ==========================================
  // STEP 2: Create Products
  // ==========================================
  console.log("\nCreating products...");

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let totalImageCount = 0;

  for (let i = 0; i < sparData.length; i++) {
    const p = sparData[i];
    const sku = p.sku || `SPAR-${p.id}`;
    const name = p.name || "Unnamed Product";
    const slug = slugify(name) + "-" + sku.replace(/[^a-z0-9-]/gi, "-").slice(-20).toLowerCase();
    const catName = p.category || "Grocery";
    const categoryId = categoryIdByName[catName];

    if (!categoryId) {
      skippedCount++;
      continue;
    }

    const unit = parseUnit(p.weight);
    const desc = extractDescription(p);
    const brand = p.brand || null;

    // Build images from manifest (before attributes so we can use local paths)
    const imagesCreate: { url: string; altText: string; isPrimary: boolean; sortOrder: number }[] = [];
    const galleryLocalUrls: string[] = [];
    const imageEntry = imageManifest.get(sku);
    if (imageEntry) {
      imagesCreate.push({
        url: imageEntry.url,
        altText: name,
        isPrimary: true,
        sortOrder: 0,
      });
    }
    for (let gi = 0; gi < 3; gi++) {
      const galleryKey = `${sku}_gallery_${gi}`;
      const galleryEntry = imageManifest.get(galleryKey);
      if (galleryEntry) {
        imagesCreate.push({
          url: galleryEntry.url,
          altText: `${name} (View ${gi + 1})`,
          isPrimary: false,
          sortOrder: gi + 1,
        });
        galleryLocalUrls.push(galleryEntry.url);
      }
    }

    // Build attributes JSON
    const attributes: Record<string, any> = {};
    if (p.weight) attributes.weight = p.weight;
    if (p.brand) attributes.brand = p.brand;
    if (p.leaf_category) attributes.leaf_category = p.leaf_category;
    if (p.all_categories && p.all_categories.length > 0) {
      attributes.spar_categories = p.all_categories;
    }
    // Use local paths from manifest instead of CDN URLs
    if (imageEntry) attributes.spar_image_url = imageEntry.url;
    if (galleryLocalUrls.length > 0) {
      attributes.spar_gallery = galleryLocalUrls;
    }

    const pricing = priceMap[sku] || { price: 100, salePrice: null };
    const productData = {
      name,
      slug,
      sku,
      barcode: sku,
      price: pricing.price,
      salePrice: pricing.salePrice as number | null,
      costPrice: null as number | null,
      stock: 100,
      lowStockAlert: 10,
      unit,
      categoryId,
      shortDesc: desc.slice(0, 200),
      description: desc,
      isActive: true,
      isAvailable: true,
      isFeatured: false,
      tags: [catName],
      attributes: attributes as any,
    };



    try {
      const existing = await prisma.product.findUnique({
        where: { sku },
        include: { images: { take: 1 } },
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            ...productData,
            ...(imagesCreate.length > 0
              ? { images: { create: imagesCreate } }
              : {}),
          },
        });
        createdCount++;
        totalImageCount += imagesCreate.length;
      } else {
        await prisma.product.update({
          where: { sku },
          data: productData,
        });

        if (existing.images.length === 0 && imagesCreate.length > 0) {
          await prisma.productImage.createMany({
            data: imagesCreate.map((img) => ({
              url: img.url,
              altText: img.altText,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
              productId: existing.id,
            })),
          });
          totalImageCount += imagesCreate.length;
        }
        updatedCount++;
      }
    } catch (e: any) {
      console.error(`  Failed to create product "${name}": ${e.message}`);
      skippedCount++;
    }

    if ((i + 1) % 200 === 0) {
      console.log(`  Progress: ${i + 1}/${sparData.length} products processed...`);
    }
  }

  // ==========================================
  // SUMMARY
  // ==========================================
  const totalProducts = await prisma.product.count();
  const totalImages = await prisma.productImage.count();
  const totalCategories = await prisma.category.count();

  console.log("\n" + "=".repeat(60));
  console.log("SPAR DATA SEEDING COMPLETE!");
  console.log("=".repeat(60));
  console.log(`  Categories: ${totalCategories}`);
  console.log(`  Products: ${totalProducts}`);
  console.log(`    - Created: ${createdCount}`);
  console.log(`    - Updated: ${updatedCount}`);
  console.log(`    - Skipped: ${skippedCount}`);
  console.log(`  Product Images: ${totalImages}`);
  console.log(`  Source: SPAR India (https://www.sparindia.com/)`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
