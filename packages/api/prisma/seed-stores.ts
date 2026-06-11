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

  // ── Create Additional Stores ──
  const mainStore = await prisma.store.upsert({
    where: { slug: "main-store" },
    update: {},
    create: {
      name: "Main Store",
      slug: "main-store",
      addressLine1: "1, Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      lat: 19.076,
      lng: 72.8777,
      phone: "+91-9876543200",
      email: "main@instamart.com",
      deliveryRadiusKm: 15,
      deliveryFee: 30,
      minOrderAmount: 49,
      openingTime: "07:00",
      closingTime: "23:00",
    },
  });
  console.log(`  ✅ Store: ${mainStore.name}`);

  const instakartMumbai = await prisma.store.upsert({
    where: { slug: "instakart-mumbai" },
    update: {},
    create: {
      name: "InstaKart Mumbai",
      slug: "instakart-mumbai",
      addressLine1: "42, Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      lat: 19.0596,
      lng: 72.8295,
      phone: "+91-9876543220",
      email: "mumbai@instakart.com",
      deliveryRadiusKm: 8,
      deliveryFee: 35,
      minOrderAmount: 99,
      openingTime: "08:00",
      closingTime: "22:00",
    },
  });
  console.log(`  ✅ Store: ${instakartMumbai.name}`);

  const instakartDelhi = await prisma.store.upsert({
    where: { slug: "instakart-delhi" },
    update: {},
    create: {
      name: "InstaKart Delhi",
      slug: "instakart-delhi",
      addressLine1: "55, Janpath",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      lat: 28.6289,
      lng: 77.2145,
      phone: "+91-9876543221",
      email: "delhi@instakart.com",
      deliveryRadiusKm: 10,
      deliveryFee: 45,
      minOrderAmount: 99,
      openingTime: "08:00",
      closingTime: "22:00",
    },
  });
  console.log(`  ✅ Store: ${instakartDelhi.name}`);

  // ── Create Delivery Persons for all stores ──
  const deliveryPersons = [
    // InstaMart Mumbai (store1)
    { storeId: store1.id, firstName: "Rajesh", lastName: "Kumar", phone: "9876543211", type: "FULL_TIME" as const, vehicleType: "BIKE" as const, vehicleNumber: "MH-01-AB-1234", monthlySalary: 18000 },
    { storeId: store1.id, firstName: "Suresh", lastName: "Patel", phone: "9876543212", type: "FULL_TIME" as const, vehicleType: "SCOOTER" as const, vehicleNumber: "MH-02-CD-5678", monthlySalary: 15000 },
    { storeId: store1.id, firstName: "Amit", lastName: "Sharma", phone: "9876543213", type: "PART_TIME" as const, vehicleType: "BIKE" as const, hourlyRate: 120 },
    // InstaMart Delhi (store2)
    { storeId: store2.id, firstName: "Vijay", lastName: "Singh", phone: "9876543214", type: "FULL_TIME" as const, vehicleType: "BIKE" as const, vehicleNumber: "DL-03-EF-9012", monthlySalary: 17000 },
    { storeId: store2.id, firstName: "Ravi", lastName: "Verma", phone: "9876543215", type: "PART_TIME" as const, vehicleType: "SCOOTER" as const, hourlyRate: 110 },
    // Main Store
    { storeId: mainStore.id, firstName: "Arjun", lastName: "Mehta", phone: "9876543216", type: "FULL_TIME" as const, vehicleType: "BIKE" as const, vehicleNumber: "MH-04-GH-3456", monthlySalary: 20000 },
    { storeId: mainStore.id, firstName: "Priya", lastName: "Shah", phone: "9876543217", type: "FULL_TIME" as const, vehicleType: "SCOOTER" as const, vehicleNumber: "MH-05-IJ-7890", monthlySalary: 16000 },
    // InstaKart Mumbai
    { storeId: instakartMumbai.id, firstName: "Deepak", lastName: "Joshi", phone: "9876543218", type: "FULL_TIME" as const, vehicleType: "BIKE" as const, vehicleNumber: "MH-06-KL-1234", monthlySalary: 17500 },
    { storeId: instakartMumbai.id, firstName: "Neha", lastName: "Gupta", phone: "9876543219", type: "PART_TIME" as const, vehicleType: "WALK" as const, hourlyRate: 100 },
    // InstaKart Delhi
    { storeId: instakartDelhi.id, firstName: "Rohit", lastName: "Malik", phone: "9876543220", type: "FULL_TIME" as const, vehicleType: "SCOOTER" as const, vehicleNumber: "DL-07-MN-5678", monthlySalary: 16500 },
    { storeId: instakartDelhi.id, firstName: "Anjali", lastName: "Agarwal", phone: "9876543221", type: "PART_TIME" as const, vehicleType: "BIKE" as const, hourlyRate: 115 },
  ];

  let dpCount = 0;
  for (const dp of deliveryPersons) {
    const existingDp = await prisma.deliveryPerson.findUnique({ where: { phone: dp.phone } });
    if (!existingDp) {
      await prisma.deliveryPerson.create({
        data: {
          storeId: dp.storeId,
          firstName: dp.firstName,
          lastName: dp.lastName,
          phone: dp.phone,
          type: dp.type,
          vehicleType: dp.vehicleType,
          vehicleNumber: dp.vehicleNumber,
          hourlyRate: dp.hourlyRate || null,
          monthlySalary: dp.monthlySalary || null,
          rating: Number((4.5 + Math.random() * 0.5).toFixed(1)),
          totalDeliveries: Math.floor(Math.random() * 500) + 50,
        },
      });
      dpCount++;
    }
  }
  if (dpCount > 0) {
    console.log(`  ✅ Created ${dpCount} delivery persons`);
  }
}

main()
  .catch((e) => {
    console.error("Seed stores failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
