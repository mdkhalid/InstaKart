import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting store migration...");

  // 1. Create default store if none exists
  let defaultStore = await prisma.store.findFirst({ where: { isActive: true } });

  if (!defaultStore) {
    defaultStore = await prisma.store.create({
      data: {
        name: "Main Store",
        slug: "main-store",
        addressLine1: "123 Main Street",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        lat: 19.076,
        lng: 72.8777,
        phone: "+91-9876543210",
        email: "store@instamart.com",
        deliveryRadiusKm: 10,
        deliveryFee: 40,
        minOrderAmount: 0,
        openingTime: "06:00",
        closingTime: "23:00",
        isActive: true,
      },
    });
    console.log(`Created default store: ${defaultStore.name} (${defaultStore.id})`);
  } else {
    console.log(`Using existing store: ${defaultStore.name} (${defaultStore.id})`);
  }

  // 2. Migrate existing products to StoreProduct rows
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      costPrice: true,
      stock: true,
      lowStockAlert: true,
      isAvailable: true,
    },
  });

  console.log(`Found ${products.length} active products to migrate`);

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const existing = await prisma.storeProduct.findUnique({
      where: { storeId_productId: { storeId: defaultStore.id, productId: product.id } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.storeProduct.create({
      data: {
        storeId: defaultStore.id,
        productId: product.id,
        price: product.price,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        isAvailable: product.isAvailable,
      },
    });
    created++;
  }

  console.log(`Migration complete: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
