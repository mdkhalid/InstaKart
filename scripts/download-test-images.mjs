// scripts/download-test-images.mjs
// Pulls test product images from Open Food Facts (CC-licensed real products)
// with a Picsum fallback. Writes manifest for the Prisma seed to consume.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "packages", "api", "uploads", "products");
const MANIFEST = path.join(__dirname, "seed-images-manifest.json");

// Mirror of the 20 seed products in packages/api/prisma/seed.ts.
// Each entry: { sku, offCategory, offQuery } - first hit with a real image wins.
const PRODUCTS = [
  { sku: "SKU-FRUIT-001", name: "Fresh Apple (1 kg)",  offQuery: "apple",   offCategory: "en:apples" },
  { sku: "SKU-FRUIT-002", name: "Banana (1 dozen)",    offQuery: "banana",  offCategory: "en:bananas" },
  { sku: "SKU-FRUIT-003", name: "Organic Tomatoes",    offQuery: "tomato",  offCategory: "en:tomatoes" },
  { sku: "SKU-FRUIT-004", name: "Pomegranate (1 kg)",  offQuery: "pomegranate", offCategory: "en:pomegranates" },
  { sku: "SKU-FRUIT-005", name: "Spinach (500 g)",     offQuery: "spinach", offCategory: "en:spinachs" },
  { sku: "SKU-FRUIT-006", name: "Onion (1 kg)",        offQuery: "onion",   offCategory: "en:onions" },
  { sku: "SKU-FRUIT-007", name: "Carrot (500 g)",      offQuery: "carrot",  offCategory: "en:carrots" },
  { sku: "SKU-DAIRY-001", name: "Fresh Milk (1 L)",    offQuery: "milk",    offCategory: "en:milks" },
  { sku: "SKU-DAIRY-002", name: "Eggs (12 pcs)",       offQuery: "egg",     offCategory: "en:eggs" },
  { sku: "SKU-DAIRY-003", name: "Butter (500 g)",      offQuery: "butter",  offCategory: "en:butters" },
  { sku: "SKU-DAIRY-004", name: "Greek Yogurt (400 g)",offQuery: "greek yogurt", offCategory: "en:greek-yogurts" },
  { sku: "SKU-DAIRY-005", name: "Cheddar Cheese (200 g)", offQuery: "cheddar", offCategory: "en:cheddar-cheeses" },
  { sku: "SKU-DAIRY-006", name: "Paneer (200 g)",      offQuery: "paneer",  offCategory: "en: paneer" },
  { sku: "SKU-BEV-001",   name: "Coca-Cola (2 L)",     offQuery: "cola",    offCategory: "en:sodas" },
  { sku: "SKU-BEV-002",   name: "Orange Juice (1 L)",  offQuery: "orange juice", offCategory: "en:orange-juices" },
  { sku: "SKU-BEV-003",   name: "Green Tea (25 bags)", offQuery: "green tea",    offCategory: "en:green-teas" },
  { sku: "SKU-BEV-004",   name: "Mineral Water (1 L)", offQuery: "mineral water", offCategory: "en:mineral-waters" },
  { sku: "SKU-BEV-005",   name: "Ground Coffee (200 g)", offQuery: "coffee",     offCategory: "en:coffees" },
  { sku: "SKU-BEV-006",   name: "Mango Lassi (200 ml)",  offQuery: "mango lassi", offCategory: "en:lassis" },
  { sku: "SKU-SNACK-001", name: "Potato Chips (100 g)",offQuery: "potato chips", offCategory: "en:potato-chips" },
  { sku: "SKU-SNACK-002", name: "Mixed Nuts (200 g)",  offQuery: "mixed nuts",   offCategory: "en:mixed-nuts" },
  { sku: "SKU-SNACK-003", name: "Chocolate Bar",       offQuery: "chocolate",    offCategory: "en:chocolates" },
  { sku: "SKU-SNACK-004", name: "Cream Biscuits (300 g)", offQuery: "biscuits", offCategory: "en:biscuits" },
  { sku: "SKU-SNACK-005", name: "Popcorn (100 g)",     offQuery: "popcorn",  offCategory: "en:popcorns" },
  { sku: "SKU-SNACK-006", name: "Nachos (150 g)",      offQuery: "nachos",   offCategory: "en:nachos" },
  { sku: "SKU-BAKE-001",  name: "Whole Wheat Bread",   offQuery: "bread",        offCategory: "en:breads" },
  { sku: "SKU-BAKE-002",  name: "Croissant (2 pcs)",   offQuery: "croissant",    offCategory: "en:croissants" },
  { sku: "SKU-BAKE-003",  name: "Chocolate Muffin (1 pc)", offQuery: "muffin",   offCategory: "en:muffins" },
  { sku: "SKU-BAKE-004",  name: "Bagel (4 pcs)",       offQuery: "bagel",    offCategory: "en:bagels" },
  { sku: "SKU-BAKE-005",  name: "Burger Bun (4 pcs)",  offQuery: "burger bun", offCategory: "en:burger-buns" },
  { sku: "SKU-MEAT-001",  name: "Chicken Breast (500 g)", offQuery: "chicken breast", offCategory: "en:chicken-breasts" },
  { sku: "SKU-MEAT-002",  name: "Salmon Fillet (250 g)",  offQuery: "salmon",         offCategory: "en:salmon" },
  { sku: "SKU-MEAT-003",  name: "Mutton (500 g)",          offQuery: "mutton",         offCategory: "en:mutton" },
  { sku: "SKU-MEAT-004",  name: "Tuna Can (185 g)",        offQuery: "tuna",           offCategory: "en:tunas" },
  { sku: "SKU-HOUSE-001", name: "Dish Soap (500 ml)",      offQuery: "dish soap",      offCategory: "en:dishwashing-detergents" },
  { sku: "SKU-HOUSE-002", name: "Toilet Paper (6 rolls)",  offQuery: "toilet paper",   offCategory: "en:toilet-papers" },
  { sku: "SKU-HOUSE-003", name: "Floor Cleaner (1 L)",     offQuery: "floor cleaner",  offCategory: "en:floor-cleaners" },
  { sku: "SKU-HOUSE-004", name: "Laundry Detergent (1 kg)",offQuery: "laundry detergent", offCategory: "en:laundry-detergents" },
  { sku: "SKU-HOUSE-005", name: "Trash Bags (30 pcs)",     offQuery: "trash bags",     offCategory: "en:trash-bags" },
  { sku: "SKU-CARE-001",  name: "Shampoo (200 ml)",         offQuery: "shampoo",        offCategory: "en:shampoos" },
  { sku: "SKU-CARE-002",  name: "Toothpaste (100 g)",       offQuery: "toothpaste",     offCategory: "en:toothpastes" },
  { sku: "SKU-CARE-003",  name: "Hand Soap (125 g)",        offQuery: "hand soap",      offCategory: "en:soaps" },
  { sku: "SKU-CARE-004",  name: "Face Wash (100 ml)",       offQuery: "face wash",      offCategory: "en:face-washes" },
  { sku: "SKU-CARE-005",  name: "Deodorant (150 ml)",       offQuery: "deodorant",      offCategory: "en:deodorants" },
];

const UA = "InstamartSeedScript/1.0 (test data; contact: dev@instamart.local)";

async function fetchJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function fetchBuffer(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function findOffImage({ offCategory, offQuery }) {
  // Try category search first, then free-text search as backup.
  const urls = [
    `https://world.openfoodfacts.org/api/v2/search?categories_tags=${encodeURIComponent(offCategory)}&page_size=10&fields=product_name,image_front_url,image_front_small_url`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(offQuery)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,image_url,image_front_url`,
  ];
  for (const url of urls) {
    try {
      const j = await fetchJson(url);
      const items = j.products || j.products || [];
      for (const p of items) {
        const img = p.image_front_url || p.image_front_small_url || p.image_url;
        if (img) return { url: img, name: p.product_name || "" };
      }
    } catch (e) {
      console.warn(`  [OFF retry] ${e.message}`);
    }
  }
  return null;
}

async function picsumImage(sku) {
  return `https://picsum.photos/seed/${encodeURIComponent(sku)}/600/600`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), images: [] };
  let offHits = 0, picsumHits = 0, failures = 0;

  for (const p of PRODUCTS) {
    const file = `${p.sku}.jpg`;
    const dest = path.join(OUT_DIR, file);
    process.stdout.write(`  ${p.sku.padEnd(15)} `);

    let source = null;
    let buf = null;
    let sourceUrl = null;
    let productName = null;

    try {
      const off = await findOffImage(p);
      if (off) {
        try {
          buf = await fetchBuffer(off.url);
          if (buf.length > 1500) {
            source = "openfoodfacts";
            sourceUrl = off.url;
            productName = off.name;
            offHits++;
          } else {
            console.warn(`[OFF image too small (${buf.length}B), falling back]`);
            buf = null;
          }
        } catch (e) {
          console.warn(`[OFF fetch fail: ${e.message}]`);
        }
      }

      if (!buf) {
        const url = await picsumImage(p.sku);
        buf = await fetchBuffer(url);
        source = "picsum";
        sourceUrl = url;
        picsumHits++;
      }

      await fs.writeFile(dest, buf);
      const rel = path.relative(ROOT, dest).replace(/\\/g, "/");
      manifest.images.push({
        sku: p.sku,
        productName: productName || p.name,
        source,
        sourceUrl,
        file: rel,
        url: `/uploads/products/${file}`,
        bytes: buf.length,
      });
      console.log(`OK  ${source.padEnd(13)} ${(buf.length/1024).toFixed(1)} KB`);
    } catch (e) {
      failures++;
      console.log(`FAIL  ${e.message}`);
      manifest.images.push({ sku: p.sku, productName: p.name, source: "none", error: e.message });
    }
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. OFF: ${offHits}, Picsum: ${picsumHits}, Failures: ${failures}`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}`);
  console.log(`Images in: ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
