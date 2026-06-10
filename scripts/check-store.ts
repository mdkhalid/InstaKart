import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  console.log('Store:', store?.id, store?.name);
  
  const sps = await prisma.storeProduct.findMany({ 
    where: { storeId: store!.id },
    take: 5
  });
  console.log('StoreProducts count:', sps.length);
  console.log('Sample:', sps[0]);
  
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { storeProducts: { where: { storeId: store!.id } } },
    take: 3
  });
  console.log('Products with StoreProduct:', products.map(p => ({ name: p.name, sp: p.storeProducts[0] })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());