// scripts/download-category-images.mjs
// Downloads one CC-licensed stock image per seed category.
// Uses Lorem Picsum (CC-licensed, no key) with stable seeds per category.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "packages", "api", "uploads", "categories");
const MANIFEST = path.join(__dirname, "seed-category-images-manifest.json");

// Mirrors the 8 categories in packages/api/prisma/seed.ts (slug -> label + search terms for OFF fallback)
const CATEGORIES = [
  { slug: "fruits-vegetables", name: "Fruits & Vegetables" },
  { slug: "dairy-eggs",        name: "Dairy & Eggs" },
  { slug: "beverages",         name: "Beverages" },
  { slug: "snacks",            name: "Snacks" },
  { slug: "bakery",            name: "Bakery" },
  { slug: "meat-fish",         name: "Meat & Fish" },
  { slug: "household",         name: "Household" },
  { slug: "personal-care",     name: "Personal Care" },
];

const UA = "InstamartSeedScript/1.0 (test data)";

async function fetchBuffer(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), categories: [] };

  for (const c of CATEGORIES) {
    const file = `${c.slug}.jpg`;
    const dest = path.join(OUT_DIR, file);
    process.stdout.write(`  ${c.slug.padEnd(20)} `);
    try {
      // 800x500 = 16:10 ratio matching the aspect-w-16 aspect-h-9 container the web app uses
      const url = `https://picsum.photos/seed/${encodeURIComponent(c.slug)}/800/500`;
      const buf = await fetchBuffer(url);
      await fs.writeFile(dest, buf);
      const rel = path.relative(ROOT, dest).replace(/\\/g, "/");
      manifest.categories.push({
        slug: c.slug,
        name: c.name,
        source: "picsum",
        sourceUrl: url,
        file: rel,
        url: `/uploads/categories/${file}`,
        bytes: buf.length,
      });
      console.log(`OK  picsum  ${(buf.length/1024).toFixed(1)} KB`);
    } catch (e) {
      console.log(`FAIL  ${e.message}`);
      manifest.categories.push({ slug: c.slug, name: c.name, source: "none", error: e.message });
    }
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. Manifest: ${path.relative(ROOT, MANIFEST)}`);
  console.log(`Images in:    ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
