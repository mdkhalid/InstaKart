import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
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

  for (const name of categories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
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
    { name: "Fresh Milk (1 L)", slug: "fresh-milk-1l", sku: "SKU-DAIRY-001", price: 56, unit: "L", category: "Dairy & Eggs", stock: 60, isFeatured: true },
    { name: "Eggs (12 pcs)", slug: "eggs-12-pcs", sku: "SKU-DAIRY-002", price: 72, unit: "pack", category: "Dairy & Eggs", stock: 90, isFeatured: true },
    { name: "Butter (500 g)", slug: "butter-500g", sku: "SKU-DAIRY-003", price: 260, salePrice: 235, unit: "500 g", category: "Dairy & Eggs", stock: 40 },
    { name: "Coca-Cola (2 L)", slug: "coca-cola-2l", sku: "SKU-BEV-001", price: 85, unit: "2 L", category: "Beverages", stock: 100, isFeatured: true },
    { name: "Orange Juice (1 L)", slug: "orange-juice-1l", sku: "SKU-BEV-002", price: 120, salePrice: 99, unit: "L", category: "Beverages", stock: 50 },
    { name: "Green Tea (25 bags)", slug: "green-tea-25-bags", sku: "SKU-BEV-003", price: 150, unit: "pack", category: "Beverages", stock: 40 },
    { name: "Potato Chips (100 g)", slug: "potato-chips-100g", sku: "SKU-SNACK-001", price: 30, unit: "pack", category: "Snacks", stock: 200, isFeatured: true },
    { name: "Mixed Nuts (200 g)", slug: "mixed-nuts-200g", sku: "SKU-SNACK-002", price: 180, salePrice: 159, unit: "200 g", category: "Snacks", stock: 60 },
    { name: "Chocolate Bar", slug: "chocolate-bar", sku: "SKU-SNACK-003", price: 45, unit: "pcs", category: "Snacks", stock: 150 },
    { name: "Whole Wheat Bread", slug: "whole-wheat-bread", sku: "SKU-BAKE-001", price: 40, unit: "400 g", category: "Bakery", stock: 50, isFeatured: true },
    { name: "Croissant (2 pcs)", slug: "croissant-2-pcs", sku: "SKU-BAKE-002", price: 60, unit: "pack", category: "Bakery", stock: 30 },
    { name: "Chicken Breast (500 g)", slug: "chicken-breast-500g", sku: "SKU-MEAT-001", price: 180, unit: "500 g", category: "Meat & Fish", stock: 40, isFeatured: true },
    { name: "Salmon Fillet (250 g)", slug: "salmon-fillet-250g", sku: "SKU-MEAT-002", price: 320, salePrice: 299, unit: "250 g", category: "Meat & Fish", stock: 20 },
    { name: "Dish Soap (500 ml)", slug: "dish-soap-500ml", sku: "SKU-HOUSE-001", price: 95, unit: "500 ml", category: "Household", stock: 70 },
    { name: "Toilet Paper (6 rolls)", slug: "toilet-paper-6-rolls", sku: "SKU-HOUSE-002", price: 210, unit: "pack", category: "Household", stock: 90, isFeatured: true },
    { name: "Shampoo (200 ml)", slug: "shampoo-200ml", sku: "SKU-CARE-001", price: 140, unit: "200 ml", category: "Personal Care", stock: 55 },
    { name: "Toothpaste (100 g)", slug: "toothpaste-100g", sku: "SKU-CARE-002", price: 85, unit: "100 g", category: "Personal Care", stock: 80 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
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
      },
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
