import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating stores and store admins...");

  // 1. Create stores
  const store1 = await prisma.store.upsert({
    where: { slug: "instamart-mumbai" },
    update: {},
    create: {
      name: "InstaMart Mumbai",
      slug: "instamart-mumbai",
      addressLine1: "10, MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      lat: 19.076,
      lng: 72.8777,
      phone: "+91-9876543210",
      email: "mumbai@instamart.com",
      deliveryRadiusKm: 10,
      deliveryFee: 40,
      minOrderAmount: 99,
      openingTime: "08:00",
      closingTime: "22:00",
    },
  });
  console.log(`  ✅ Store: ${store1.name}`);

  const store2 = await prisma.store.upsert({
    where: { slug: "instamart-delhi" },
    update: {},
    create: {
      name: "InstaMart Delhi",
      slug: "instamart-delhi",
      addressLine1: "25, Connaught Place",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      lat: 28.6139,
      lng: 77.209,
      phone: "+91-9876543211",
      email: "delhi@instamart.com",
      deliveryRadiusKm: 12,
      deliveryFee: 50,
      minOrderAmount: 99,
      openingTime: "08:00",
      closingTime: "22:00",
    },
  });
  console.log(`  ✅ Store: ${store2.name}`);

  // 2. Create StoreProduct entries (link all products to store1)
  const products = await prisma.product.findMany({ where: { isActive: true } });
  let spCount = 0;

  for (const product of products) {
    // Link to store1 with default pricing
    await prisma.storeProduct.upsert({
      where: {
        storeId_productId: { storeId: store1.id, productId: product.id },
      },
      update: {},
      create: {
        storeId: store1.id,
        productId: product.id,
        price: product.price,
        salePrice: product.salePrice,
        stock: Math.max(0, product.stock - Math.floor(Math.random() * 10)),
        lowStockAlert: 10,
        isAvailable: true,
      },
    });
    spCount++;

    // Link about 60% of products to store2 (with slightly different pricing)
    if (Math.random() < 0.6) {
      await prisma.storeProduct.upsert({
        where: {
          storeId_productId: { storeId: store2.id, productId: product.id },
        },
        update: {},
        create: {
          storeId: store2.id,
          productId: product.id,
          price: Number(product.price) + Math.floor(Math.random() * 20),
          salePrice: product.salePrice
            ? Number(product.salePrice) + Math.floor(Math.random() * 10)
            : null,
          stock: Math.max(0, product.stock - Math.floor(Math.random() * 15)),
          lowStockAlert: 10,
          isAvailable: true,
        },
      });
      spCount++;
    }
  }
  console.log(`  ✅ Created ${spCount} StoreProduct links`);

  // 3. Create STORE_ADMIN user for store1
  const hash = await bcrypt.hash("Store@123", 12);
  await prisma.user.upsert({
    where: { email: "store-admin-mumbai@instamart.com" },
    update: { storeId: store1.id },
    create: {
      email: "store-admin-mumbai@instamart.com",
      passwordHash: hash,
      firstName: "Mumbai",
      lastName: "Admin",
      role: "STORE_ADMIN",
      storeId: store1.id,
      isEmailVerified: true,
    },
  });
  console.log("  ✅ Store Admin: store-admin-mumbai@instamart.com / Store@123 (Mumbai store)");

  // 4. Create STORE_ADMIN user for store2
  await prisma.user.upsert({
    where: { email: "store-admin-delhi@instamart.com" },
    update: { storeId: store2.id },
    create: {
      email: "store-admin-delhi@instamart.com",
      passwordHash: hash,
      firstName: "Delhi",
      lastName: "Admin",
      role: "STORE_ADMIN",
      storeId: store2.id,
      isEmailVerified: true,
    },
  });
  console.log("  ✅ Store Admin: store-admin-delhi@instamart.com / Store@123 (Delhi store)");

  const totalSp = await prisma.storeProduct.count();
  console.log(`\n📊 Summary:`);
  console.log(`  Stores: 2`);
  console.log(`  Products: ${products.length}`);
  console.log(`  StoreProduct links: ${totalSp}`);
  console.log(`  Store Admins: 2`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`  SUPER_ADMIN:   admin@instamart.com / Admin@123`);
  console.log(`  Store Admin 1: store-admin-mumbai@instamart.com / Store@123`);
  console.log(`  Store Admin 2: store-admin-delhi@instamart.com / Store@123`);
  console.log(`  Customer:      customer@example.com / Customer@123`);
}

main()
  .catch((e) => {
    console.error("Seed stores failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
