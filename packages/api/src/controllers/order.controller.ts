import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { emitToAdmin, emitToUser } from "../services/socket.service";
import { sendOrderConfirmationEmail } from "../services/email.service";

const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD) || 499;
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE) || 40;
const TAX_RATE = Number(process.env.TAX_RATE) || 0.05;

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { addressId, paymentMethod = "COD", couponCode, notes, estimatedDelivery: preferredDelivery } = req.body;
    const userId = req.user!.userId;

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, salePrice: true, stock: true, isAvailable: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return errorResponse(res, "Cart is empty", 400);
    }

    // Validate address
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) return errorResponse(res, "Invalid delivery address", 400);

    // Validate stock and build order items
    const orderItems: any[] = [];
    for (const item of cart.items) {
      if (!item.product.isAvailable) {
        return errorResponse(res, `${item.product.name} is not available`, 400);
      }
      if (item.quantity > item.product.stock) {
        return errorResponse(res, `Insufficient stock for ${item.product.name}`, 400);
      }

      const unitPrice = item.product.salePrice || item.product.price;
      orderItems.push({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: Number(unitPrice) * item.quantity,
      });
    }

    // Calculate totals
    const subtotal = orderItems.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount))) {
        discount = coupon.discountType === "PERCENTAGE"
          ? Math.min(subtotal * Number(coupon.discountValue) / 100, Number(coupon.maxDiscount || Infinity))
          : Number(coupon.discountValue);

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const tax = (subtotal - discount) * TAX_RATE;
    const total = subtotal + deliveryFee - discount + tax;

    // Generate order number using atomic counter (prevents race condition)
    const year = new Date().getFullYear();

    // Calculate estimated delivery (use preferred time or default to 30-60 min from now)
    const estimatedDelivery = preferredDelivery
      ? new Date(preferredDelivery)
      : new Date(Date.now() + (30 + Math.floor(Math.random() * 30)) * 60 * 1000);

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Atomically increment the order counter
      const counter = await tx.orderCounter.upsert({
        where: { year },
        update: { lastValue: { increment: 1 } },
        create: { year, lastValue: 1 },
      });
      const orderNumber = `IM-${year}-${String(counter.lastValue).padStart(5, "0")}`;

      // Decrement stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            isAvailable: { set: item.product.stock - item.quantity > 0 },
          },
        });
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
          subtotal,
          deliveryFee,
          discount,
          tax,
          total,
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? "UNPAID" : "UNPAID",
          couponCode: couponCode || null,
          notes,
          estimatedDelivery,
          items: {
            create: orderItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
          statusHistory: {
            create: {
              status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
              note: paymentMethod === "COD" ? "Order confirmed (COD)" : "Order placed",
            },
          },
        },
        include: {
          items: true,
          address: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      return newOrder;
    });

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Remove ordered products from the user's wishlist (so the wishlist
    // doesn't keep showing items the customer has just bought).
    const orderedProductIds = orderItems.map((i: any) => i.productId);
    await prisma.wishlistItem.deleteMany({
      where: {
        productId: { in: orderedProductIds },
        wishlist: { userId },
      },
    });

    // Send confirmation email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendOrderConfirmationEmail(
        user.email,
        user.firstName,
        order.orderNumber,
        orderItems.map((i: any) => ({ name: i.productName, quantity: i.quantity, price: Number(i.unitPrice) })),
        Number(total),
        estimatedDelivery.toISOString()
      ).catch(() => {});
    }

    // Emit socket events
    emitToAdmin("order:new", { order });
    emitToUser(userId, "order:confirmed", { orderId: order.id, estimatedDelivery });

    return successResponse(res, {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
    }, "Order placed successfully", 201);
  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse(res, "Failed to create order", 500);
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user!.userId },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId: req.user!.userId } }),
    ]);

    const enriched = orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      discount: Number(o.discount),
      tax: Number(o.tax),
      total: Number(o.total),
      items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
    }));

    return successResponse(res, {
      orders: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    return errorResponse(res, "Failed to get orders", 500);
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user!.userId },
      include: {
        items: true,
        address: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    return successResponse(res, {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      items: order.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
    });
  } catch (error) {
    console.error("Get order error:", error);
    return errorResponse(res, "Failed to get order", 500);
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user!.userId },
      include: { items: true },
    });

    if (!order) return errorResponse(res, "Order not found", 404);
    if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
      return errorResponse(res, "Order cannot be cancelled at current status", 400);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason || null,
          statusHistory: {
            create: { status: "CANCELLED", note: reason || "Cancelled by customer" },
          },
        },
        include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
      });
    });

    emitToUser(req.user!.userId, "order:cancelled", { orderId: id, reason });
    emitToAdmin("order:cancelled", { orderId: id });

    return successResponse(res, updatedOrder, "Order cancelled");
  } catch (error) {
    console.error("Cancel order error:", error);
    return errorResponse(res, "Failed to cancel order", 500);
  }
};
