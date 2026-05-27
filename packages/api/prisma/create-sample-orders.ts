import { PrismaClient, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get some existing products to use in orders
  const products = await prisma.product.findMany({
    take: 10, // Get first 10 products
    select: { id: true, price: true, name: true }
  })

  if (products.length === 0) {
    console.error('No products found. Please run db:seed first.')
    return
  }

  // Create 5 sample orders
  for (let i = 0; i < 5; i++) {
    // Select 2-4 random products for this order
    const selectedProducts = []
    const numProducts = 2 + Math.floor(Math.random() * 3) // 2-4 products
    
    // Shuffle products and take first numProducts
    const shuffled = [...products].sort(() => 0.5 - Math.random())
    for (let j = 0; j < numProducts && j < shuffled.length; j++) {
      selectedProducts.push(shuffled[j])
    }

    // Calculate total amount
    let totalAmount = 0
    const orderItemsData = selectedProducts.map(product => {
      const quantity = 1 + Math.floor(Math.random() * 3) // 1-3 quantity
      const price = Number(product.price) // Convert Decimal to number for calculation
      totalAmount += price * quantity
      return {
        productId: product.id,
        quantity,
        price: product.price // Keep as Decimal for Prisma
      }
    })

    // Create order with random date within last 7 days
    const daysAgo = Math.floor(Math.random() * 7) // 0-6 days ago
    const hoursAgo = Math.floor(Math.random() * 24) // 0-23 hours ago
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)
    createdAt.setHours(createdAt.getHours() - hoursAgo)

    // Random order status from the ones considered in trending algorithm
    const statuses: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    try {
      const order = await prisma.order.create({
        data: {
          userId: 'customer@example.com', // Assuming this is the customer user ID from seed
          status,
          total: new Prisma.Decimal(totalAmount), // Convert back to Decimal
          subtotal: new Prisma.Decimal(totalAmount),
          tax: new Prisma.Decimal(0),
          deliveryFee: new Prisma.Decimal(0),
          createdAt,
          updatedAt: createdAt,
          orderItems: {
            create: orderItemsData
          }
        }
      })
      console.log(`Created order ${order.id} with ${orderItemsData.length} items, total: $${totalAmount.toFixed(2)}, status: ${status}`)
    } catch (error) {
      console.error(`Error creating order ${i}:`, error)
    }
  }

  console.log('Sample orders creation completed.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })