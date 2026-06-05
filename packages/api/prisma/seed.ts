import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ImageEntry = {
  sku: string;
  productName?: string;
  source: string;
  url: string;
};

function loadImageManifest(): Map<string, ImageEntry> {
  const manifestPath = path.resolve(__dirname, "..", "..", "..", "scripts", "seed-images-manifest.json");
  if (!fs.existsSync(manifestPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { images: ImageEntry[] };
  return new Map(data.images.map((i) => [i.sku, i]));
}

function loadCategoryImageManifest(): Map<string, { url: string; name: string }> {
  const manifestPath = path.resolve(__dirname, "..", "..", "..", "scripts", "seed-category-images-manifest.json");
  if (!fs.existsSync(manifestPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    categories: { slug: string; name: string; url: string }[];
  };
  return new Map(data.categories.map((c) => [c.slug, { url: c.url, name: c.name }]));
}

async function main() {
  const imageManifest = loadImageManifest();
  const categoryImageManifest = loadCategoryImageManifest();
  console.log(`📸 Loaded ${imageManifest.size} product images, ${categoryImageManifest.size} category images`);
  // Admin user
  await prisma.user.upsert({
    where: { email: "admin@instamart.com" },
    update: {},
    create: {
      email: "admin@instamart.com",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      firstName: "Super",
      lastName: "Admin",
      role: "ADMIN",
      isEmailVerified: true,
    },
  });

  // Customer user
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      passwordHash: await bcrypt.hash("Customer@123", 12),
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
      isEmailVerified: true,
    },
  });

  // Categories
  const categories = [
    "Fruits & Vegetables",
    "Dairy & Eggs",
    "Beverages",
    "Snacks",
    "Bakery",
    "Meat & Fish",
    "Household",
    "Personal Care",
  ];

  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const catImage = categoryImageManifest.get(slug);
    const data = {
      name,
      slug,
      sortOrder: i,
      ...(catImage && { imageUrl: catImage.url }),
    };
    await prisma.category.upsert({
      where: { slug },
      update: { sortOrder: i, ...(catImage && { imageUrl: catImage.url }) },
      create: data,
    });
  }

  // Products
  const categoryMap: Record<string, string> = {};
  const cats = await prisma.category.findMany();
  for (const c of cats) {
    categoryMap[c.name] = c.id;
  }

  const products = [
    { name: "Fresh Apple (1 kg)", slug: "fresh-apple-1kg", sku: "SKU-FRUIT-001", price: 120, salePrice: 99, unit: "kg", category: "Fruits & Vegetables", stock: 100, isFeatured: true },
    { name: "Banana (1 dozen)", slug: "banana-1-dozen", sku: "SKU-FRUIT-002", price: 60, salePrice: 49, unit: "dozen", category: "Fruits & Vegetables", stock: 80, isFeatured: true },
    { name: "Organic Tomatoes (500 g)", slug: "organic-tomatoes-500g", sku: "SKU-FRUIT-003", price: 40, salePrice: 35, unit: "500 g", category: "Fruits & Vegetables", stock: 120 },
    { name: "Pomegranate (1 kg)", slug: "pomegranate-1kg", sku: "SKU-FRUIT-004", price: 180, salePrice: 159, unit: "kg", category: "Fruits & Vegetables", stock: 60 },
    { name: "Spinach (500 g)", slug: "spinach-500g", sku: "SKU-FRUIT-005", price: 40, unit: "500 g", category: "Fruits & Vegetables", stock: 80 },
    { name: "Onion (1 kg)", slug: "onion-1kg", sku: "SKU-FRUIT-006", price: 35, unit: "kg", category: "Fruits & Vegetables", stock: 200 },
    { name: "Carrot (500 g)", slug: "carrot-500g", sku: "SKU-FRUIT-007", price: 30, unit: "500 g", category: "Fruits & Vegetables", stock: 100 },
    { name: "Fresh Milk (1 L)", slug: "fresh-milk-1l", sku: "SKU-DAIRY-001", price: 56, unit: "L", category: "Dairy & Eggs", stock: 60, isFeatured: true },
    { name: "Eggs (12 pcs)", slug: "eggs-12-pcs", sku: "SKU-DAIRY-002", price: 72, unit: "pack", category: "Dairy & Eggs", stock: 90, isFeatured: true },
    { name: "Butter (500 g)", slug: "butter-500g", sku: "SKU-DAIRY-003", price: 260, salePrice: 235, unit: "500 g", category: "Dairy & Eggs", stock: 40 },
    { name: "Greek Yogurt (400 g)", slug: "greek-yogurt-400g", sku: "SKU-DAIRY-004", price: 80, unit: "400 g", category: "Dairy & Eggs", stock: 50 },
    { name: "Cheddar Cheese (200 g)", slug: "cheddar-cheese-200g", sku: "SKU-DAIRY-005", price: 180, unit: "200 g", category: "Dairy & Eggs", stock: 45 },
    { name: "Paneer (200 g)", slug: "paneer-200g", sku: "SKU-DAIRY-006", price: 90, unit: "200 g", category: "Dairy & Eggs", stock: 70 },
    { name: "Coca-Cola (2 L)", slug: "coca-cola-2l", sku: "SKU-BEV-001", price: 85, unit: "2 L", category: "Beverages", stock: 100, isFeatured: true },
    { name: "Orange Juice (1 L)", slug: "orange-juice-1l", sku: "SKU-BEV-002", price: 120, salePrice: 99, unit: "L", category: "Beverages", stock: 50 },
    { name: "Green Tea (25 bags)", slug: "green-tea-25-bags", sku: "SKU-BEV-003", price: 150, unit: "pack", category: "Beverages", stock: 40 },
    { name: "Mineral Water (1 L)", slug: "mineral-water-1l", sku: "SKU-BEV-004", price: 20, unit: "L", category: "Beverages", stock: 300 },
    { name: "Ground Coffee (200 g)", slug: "ground-coffee-200g", sku: "SKU-BEV-005", price: 350, salePrice: 299, unit: "200 g", category: "Beverages", stock: 35 },
    { name: "Mango Lassi (200 ml)", slug: "mango-lassi-200ml", sku: "SKU-BEV-006", price: 30, unit: "200 ml", category: "Beverages", stock: 80 },
    { name: "Potato Chips (100 g)", slug: "potato-chips-100g", sku: "SKU-SNACK-001", price: 30, unit: "pack", category: "Snacks", stock: 200, isFeatured: true },
    { name: "Mixed Nuts (200 g)", slug: "mixed-nuts-200g", sku: "SKU-SNACK-002", price: 180, salePrice: 159, unit: "200 g", category: "Snacks", stock: 60 },
    { name: "Chocolate Bar", slug: "chocolate-bar", sku: "SKU-SNACK-003", price: 45, unit: "pcs", category: "Snacks", stock: 150 },
    { name: "Cream Biscuits (300 g)", slug: "cream-biscuits-300g", sku: "SKU-SNACK-004", price: 60, unit: "300 g", category: "Snacks", stock: 90 },
    { name: "Popcorn (100 g)", slug: "popcorn-100g", sku: "SKU-SNACK-005", price: 40, unit: "100 g", category: "Snacks", stock: 100 },
    { name: "Nachos (150 g)", slug: "nachos-150g", sku: "SKU-SNACK-006", price: 90, unit: "150 g", category: "Snacks", stock: 70 },
    { name: "Whole Wheat Bread", slug: "whole-wheat-bread", sku: "SKU-BAKE-001", price: 40, unit: "400 g", category: "Bakery", stock: 50, isFeatured: true },
    { name: "Croissant (2 pcs)", slug: "croissant-2-pcs", sku: "SKU-BAKE-002", price: 60, unit: "pack", category: "Bakery", stock: 30 },
    { name: "Chocolate Muffin (1 pc)", slug: "chocolate-muffin-1pc", sku: "SKU-BAKE-003", price: 50, unit: "pcs", category: "Bakery", stock: 25 },
    { name: "Bagel (4 pcs)", slug: "bagel-4-pcs", sku: "SKU-BAKE-004", price: 120, unit: "pack", category: "Bakery", stock: 20 },
    { name: "Burger Bun (4 pcs)", slug: "burger-bun-4-pcs", sku: "SKU-BAKE-005", price: 60, unit: "pack", category: "Bakery", stock: 40 },
    { name: "Chicken Breast (500 g)", slug: "chicken-breast-500g", sku: "SKU-MEAT-001", price: 180, unit: "500 g", category: "Meat & Fish", stock: 40, isFeatured: true },
    { name: "Salmon Fillet (250 g)", slug: "salmon-fillet-250g", sku: "SKU-MEAT-002", price: 320, salePrice: 299, unit: "250 g", category: "Meat & Fish", stock: 20 },
    { name: "Mutton (500 g)", slug: "mutton-500g", sku: "SKU-MEAT-003", price: 450, unit: "500 g", category: "Meat & Fish", stock: 15 },
    { name: "Tuna Can (185 g)", slug: "tuna-can-185g", sku: "SKU-MEAT-004", price: 150, unit: "185 g", category: "Meat & Fish", stock: 50 },
    { name: "Dish Soap (500 ml)", slug: "dish-soap-500ml", sku: "SKU-HOUSE-001", price: 95, unit: "500 ml", category: "Household", stock: 70 },
    { name: "Toilet Paper (6 rolls)", slug: "toilet-paper-6-rolls", sku: "SKU-HOUSE-002", price: 210, unit: "pack", category: "Household", stock: 90, isFeatured: true },
    { name: "Floor Cleaner (1 L)", slug: "floor-cleaner-1l", sku: "SKU-HOUSE-003", price: 120, unit: "L", category: "Household", stock: 50 },
    { name: "Laundry Detergent (1 kg)", slug: "laundry-detergent-1kg", sku: "SKU-HOUSE-004", price: 220, salePrice: 199, unit: "kg", category: "Household", stock: 60 },
    { name: "Trash Bags (30 pcs)", slug: "trash-bags-30-pcs", sku: "SKU-HOUSE-005", price: 150, unit: "pack", category: "Household", stock: 80 },
    { name: "Shampoo (200 ml)", slug: "shampoo-200ml", sku: "SKU-CARE-001", price: 140, unit: "200 ml", category: "Personal Care", stock: 55 },
    { name: "Toothpaste (100 g)", slug: "toothpaste-100g", sku: "SKU-CARE-002", price: 85, unit: "100 g", category: "Personal Care", stock: 80 },
    { name: "Hand Soap (125 g)", slug: "hand-soap-125g", sku: "SKU-CARE-003", price: 55, unit: "125 g", category: "Personal Care", stock: 90 },
    { name: "Face Wash (100 ml)", slug: "face-wash-100ml", sku: "SKU-CARE-004", price: 180, unit: "100 ml", category: "Personal Care", stock: 45 },
    { name: "Deodorant (150 ml)", slug: "deodorant-150ml", sku: "SKU-CARE-005", price: 220, unit: "150 ml", category: "Personal Care", stock: 40 },
  ];

  for (const p of products) {
    const image = imageManifest.get(p.sku);
    const productData = {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      salePrice: p.salePrice || null,
      unit: p.unit,
      categoryId: categoryMap[p.category],
      stock: p.stock,
      lowStockAlert: 10,
      isActive: true,
      isAvailable: true,
      isFeatured: p.isFeatured || false,
      shortDesc: `Fresh ${p.name.toLowerCase()} — perfect for your daily needs.`,
    };
    const imagesCreate = image
      ? [{ url: image.url, altText: p.name, isPrimary: true, sortOrder: 0 }]
      : undefined;

    const existing = await prisma.product.findUnique({
      where: { sku: p.sku },
      include: { images: { take: 1 } },
    });

    if (!existing) {
      await prisma.product.create({
        data: { ...productData, ...(imagesCreate && { images: { create: imagesCreate } }) },
      });
    } else if (existing.images.length === 0 && imagesCreate) {
      await prisma.productImage.createMany({
        data: imagesCreate.map((img) => ({ ...img, productId: existing.id })),
      });
    }
  }

  const imageCount = await prisma.productImage.count();
  console.log(`✅ Seed complete (${imageCount} product images)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
