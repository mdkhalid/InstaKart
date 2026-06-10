import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testController() {
  const storeId = 'cmq7xgli20000j6axgu4836gy';
  
  // This is what the controller does for store-scoped queries
  const productWhere = { isActive: true };
  
  const spWhere = { storeId, product: productWhere };
  
  const [spRows, total] = await Promise.all([
    prisma.storeProduct.findMany({
      where: spWhere,
      take: 20,
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: 'asc' } },
            _count: { select: { reviews: true } },
          },
        },
      },
    }),
    prisma.storeProduct.count({ where: spWhere }),
  ]);
  
  console.log('StoreProduct rows:', spRows.length);
  console.log('Total:', total);
  if (spRows[0]) {
    console.log('First product:', spRows[0].product.name);
    console.log('Price:', spRows[0].price);
    console.log('Stock:', spRows[0].stock);
  }
}

testController()
  .catch(console.error)
  .finally(() => prisma.$disconnect());