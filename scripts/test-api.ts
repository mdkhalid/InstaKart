import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  console.log('Store:', store!.id, store!.name);
  
  // Test the query that product controller uses
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { 
      storeProducts: { where: { storeId: store!.id } },
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 }
    },
    take: 10
  });
  console.log('Products with SP:', products.length);
  console.log('Sample:', products[0] ? { name: products[0].name, sp: products[0].storeProducts[0], image: products[0].images[0]?.url } : 'none');
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());