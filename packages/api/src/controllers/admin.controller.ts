import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { emitToUser } from "../services/socket.service";
import { uploadImage } from "../services/upload.service";
import { getLowStockItems } from "../services/lowStock.service";
import { getEffectiveStoreId } from "../middleware/auth.middleware";
import { logger } from "../utils/logger";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

// Dashboard
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build store-scoped where clause
    const orderWhere: any = {};
    if (storeId) orderWhere.storeId = storeId;

    // Run all independent queries in parallel via Prisma
    const [
      totalRevenueAgg,
      todayRevenueAgg,
      totalOrders,
      pendingOrders,
      totalProducts,
      totalUsers,
      newUsersToday,
      recentOrders,
      topProducts,
      dailyRevenue,
      totalStores,
      activeDeliveryPersons,
      pendingDeliveries,
      recentDeliveryAssignments,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: "PAID", ...orderWhere },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: "PAID", createdAt: { gte: today }, ...orderWhere },
      }),
      prisma.order.count({ where: { ...orderWhere } }),
      prisma.order.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
          ...orderWhere,
        },
      }),
      // Products: if store-scoped, count products that have StoreProduct in that store
      storeId
        ? prisma.storeProduct.count({ where: { storeId } })
        : prisma.product.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.order.findMany({
        where: orderWhere,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId", "productName"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
        ...(storeId ? { where: { order: { storeId } } } : {}),
      } as any),
      // Revenue chart - aggregate by day in SQL
      prisma.$queryRawUnsafe<Array<{ date: string; revenue: number }>>(
        `SELECT DATE("createdAt") as date, COALESCE(SUM("total"), 0) as revenue
         FROM "Order"
         WHERE "paymentStatus" = 'PAID' AND "createdAt" >= $1${storeId ? ` AND "storeId" = $2` : ""}
         GROUP BY DATE("createdAt")
         ORDER BY date ASC`,
        thirtyDaysAgo,
        ...(storeId ? [storeId] : [])
      ),
      storeId ? 1 : prisma.store.count({ where: { isActive: true } }),
      prisma.deliveryPerson.count({ where: storeId ? { storeId, status: { notIn: ["INACTIVE"] } } : { status: { notIn: ["INACTIVE"] } } }),
      prisma.deliveryAssignment.count({ where: { status: { notIn: ["DELIVERED", "FAILED"] }, deliveryPerson: storeId ? { storeId } : {} } }),
      prisma.deliveryAssignment.findMany({
        where: storeId ? { deliveryPerson: { storeId } } : {},
        take: 10,
        orderBy: { assignedAt: "desc" },
        include: {
          deliveryPerson: { select: { id: true, firstName: true, lastName: true, phone: true, vehicleType: true, vehicleNumber: true } },
          order: { select: { id: true, orderNumber: true, status: true, total: true, createdAt: true } },
        },
      }),
    ]);

    // Build a complete 30-day chart (fill in missing days with 0)
    const revenueMap = new Map(
      (dailyRevenue || []).map((r: any) => [
        r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
        Number(r.revenue),
      ])
    );
    const revenueChart: { date: string; revenue: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      revenueChart.push({ date: dateStr, revenue: revenueMap.get(dateStr) || 0 });
    }

    return successResponse(res, {
      stats: {
        totalRevenue: totalRevenueAgg._sum.total || 0,
        todayRevenue: todayRevenueAgg._sum.total || 0,
        totalOrders,
        pendingOrders,
        totalProducts,
        lowStockProducts: 0,
        totalUsers,
        newUsersToday,
        totalStores,
        activeDeliveryPersons,
        pendingDeliveries,
      },
      recentOrders: recentOrders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        deliveryFee: Number(o.deliveryFee),
        discount: Number(o.discount),
        tax: Number(o.tax),
      })),
      topProducts,
      revenueChart,
      recentDeliveryAssignments: recentDeliveryAssignments.map((a) => ({
        ...a,
        order: a.order ? { ...a.order, total: Number(a.order.total) } : null,
      })),
    });
  } catch (error) {
    logger.error("Dashboard error:", error);
    return errorResponse(res, "Failed to get dashboard data", 500);
  }
};

// All orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, search } = req.query;
    const storeId = getEffectiveStoreId(req);

    const where: any = {};
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: "insensitive" } },
        { user: { email: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const enriched = orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      deliveryFee: Number(o.deliveryFee),
      discount: Number(o.discount),
      tax: Number(o.tax),
      items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
    }));

    return successResponse(res, {
      orders: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Get all orders error:", error);
    return errorResponse(res, "Failed to get orders", 500);
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    // STORE_ADMIN can only manage orders from their own store
    if (req.user?.role === "STORE_ADMIN" && order.storeId !== req.user.storeId) {
      return errorResponse(res, "You can only manage orders from your store", 403);
    }

    const allowedTransitions = VALID_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return errorResponse(res, `Cannot transition from ${order.status} to ${status}`, 400);
    }

    // Handle refund or cancellation - restore stock
    if (status === "REFUNDED" || status === "CANCELLED") {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } });
      const storeId = order.storeId;
      for (const item of items) {
        if (storeId) {
          await prisma.storeProduct.update({
            where: { storeId_productId: { storeId, productId: item.productId } },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === "DELIVERED" ? { deliveredAt: new Date(), paymentStatus: "PAID" } : {}),
        ...(status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        statusHistory: {
          create: { status, note: note || `Status updated to ${status}` },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });

    // Emit socket events
    const socketEvents: Record<string, string> = {
      CONFIRMED: "order:confirmed",
      PREPARING: "order:preparing",
      OUT_FOR_DELIVERY: "order:out_for_delivery",
      DELIVERED: "order:delivered",
      CANCELLED: "order:cancelled",
    };

    const event = socketEvents[status];
    if (event) {
      const agentName = process.env.DEFAULT_DELIVERY_AGENT_NAME || "Delivery Agent";
      const agentPhone = process.env.DEFAULT_DELIVERY_AGENT_PHONE || "+91-XXXXXXXXXX";
      emitToUser(order.user.id, event, {
        orderId: id,
        estimatedDelivery: order.estimatedDelivery,
        ...(status === "OUT_FOR_DELIVERY" ? { agentName, agentPhone } : {}),
        ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(status === "CANCELLED" ? { reason: note } : {}),
      });
    }

    return successResponse(res, {
      ...updatedOrder,
      subtotal: Number(updatedOrder.subtotal),
      total: Number(updatedOrder.total),
    }, "Order status updated");
  } catch (error) {
    logger.error("Update order status error:", error);
    return errorResponse(res, "Failed to update order status", 500);
  }
};

// Get single order detail
export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        address: true,
        store: { select: { id: true, name: true, slug: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    // STORE_ADMIN can only view orders from their own store
    if (req.user?.role === "STORE_ADMIN" && order.storeId !== req.user.storeId) {
      return errorResponse(res, "Order not found", 404);
    }

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
    logger.error("Get order detail error:", error);
    return errorResponse(res, "Failed to get order", 500);
  }
};

// Users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const { search, role } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          role: true, isActive: true, isEmailVerified: true, avatarUrl: true,
          createdAt: true, _count: { select: { orders: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(res, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Get all users error:", error);
    return errorResponse(res, "Failed to get users", 500);
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isActive: true, isEmailVerified: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
        _count: { select: { orders: true, addresses: true } },
        orders: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true } },
      },
    });

    if (!user) return errorResponse(res, "User not found", 404);

    return successResponse(res, {
      ...user,
      orders: user.orders.map((o) => ({ ...o, total: Number(o.total) })),
    });
  } catch (error) {
    logger.error("Get user detail error:", error);
    return errorResponse(res, "Failed to get user details", 500);
  }
};

export const changeUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["CUSTOMER", "ADMIN", "SUPER_ADMIN", "STORE_ADMIN", "DELIVERY_AGENT"].includes(role)) {
      return errorResponse(res, "Invalid role", 400);
    }

    await prisma.user.update({ where: { id }, data: { role } });
    return successResponse(res, null, "User role updated");
  } catch (error) {
    logger.error("Change user role error:", error);
    return errorResponse(res, "Failed to update user role", 500);
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    if (!user) return errorResponse(res, "User not found", 404);

    await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    return successResponse(res, null, `User ${user.isActive ? "deactivated" : "activated"}`);
  } catch (error) {
    logger.error("Toggle user status error:", error);
    return errorResponse(res, "Failed to toggle user status", 500);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return successResponse(res, null, "User deactivated");
  } catch (error) {
    logger.error("Delete user error:", error);
    return errorResponse(res, "Failed to deactivate user", 500);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email } = req.body;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return errorResponse(res, "User not found", 404);

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) {
      // Check email uniqueness
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (existing) return errorResponse(res, "Email already in use", 409);
      data.email = email;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isActive: true, isEmailVerified: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
      },
    });

    return successResponse(res, updated, "User updated");
  } catch (error) {
    logger.error("Update user error:", error);
    return errorResponse(res, "Failed to update user", 500);
  }
};

// ─────────────────────── Coupons ───────────────────────

export const getCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    const enriched = coupons.map((c) => ({
      ...c,
      discountValue: Number(c.discountValue),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    }));

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get coupons error:", error);
    return errorResponse(res, "Failed to get coupons", 500);
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return errorResponse(res, "Coupon code already exists", 409);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || null,
        maxDiscount: maxDiscount || null,
        usageLimit: usageLimit || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return successResponse(res, {
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    }, "Coupon created", 201);
  } catch (error) {
    logger.error("Create coupon error:", error);
    return errorResponse(res, "Failed to create coupon", 500);
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt, isActive } = req.body;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Coupon not found", 404);

    const data: any = {};
    if (description !== undefined) data.description = description;
    if (discountType !== undefined) data.discountType = discountType;
    if (discountValue !== undefined) data.discountValue = discountValue;
    if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount || null;
    if (maxDiscount !== undefined) data.maxDiscount = maxDiscount || null;
    if (usageLimit !== undefined) data.usageLimit = usageLimit || null;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) data.isActive = isActive;

    const coupon = await prisma.coupon.update({
      where: { id },
      data,
    });

    return successResponse(res, {
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    }, "Coupon updated");
  } catch (error) {
    logger.error("Update coupon error:", error);
    return errorResponse(res, "Failed to update coupon", 500);
  }
};

export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Coupon not found", 404);

    await prisma.coupon.delete({ where: { id } });
    return successResponse(res, null, "Coupon deleted");
  } catch (error) {
    logger.error("Delete coupon error:", error);
    return errorResponse(res, "Failed to delete coupon", 500);
  }
};

export const uploadUserAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) return errorResponse(res, "No file provided", 400);

    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return errorResponse(res, "User not found", 404);

    const imageUrl = await uploadImage(req.file.buffer, "avatars", id);

    const updated = await prisma.user.update({
      where: { id },
      data: { avatarUrl: imageUrl },
      select: { id: true, avatarUrl: true },
    });

    return successResponse(res, updated, "Avatar uploaded");
  } catch (error) {
    logger.error("Upload user avatar error:", error);
    return errorResponse(res, "Failed to upload avatar", 500);
  }
};

// ─────────────────────── Analytics ───────────────────────

export const getAnalytics = async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      topSearches,
      topViewedProducts,
      searchTrend,
      uniqueSearchers,
      uniqueSearchTerms,
    ] = await Promise.all([
      // Top search queries (last 30 days)
      prisma.searchActivity.groupBy({
        by: ["query"],
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        where: { createdAt: { gte: thirtyDaysAgo } },
        take: 20,
      }),

      // Top viewed products (last 30 days)
      prisma.productView.groupBy({
        by: ["productId"],
        _count: { productId: true },
        orderBy: { _count: { productId: "desc" } },
        where: { createdAt: { gte: thirtyDaysAgo } },
        take: 10,
      }),

      // Search trends (searches per day, last 14 days)
      prisma.$queryRawUnsafe<Array<{ date: string; count: number }>>(
        `SELECT DATE("createdAt") as date, COUNT(*)::int as count
         FROM "SearchActivity"
         WHERE "createdAt" >= $1
         GROUP BY DATE("createdAt")
         ORDER BY date ASC`,
        thirtyDaysAgo
      ),

      // Unique users who searched
      prisma.searchActivity.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { userId: true },
      }),

      // Unique search terms count
      prisma.searchActivity.groupBy({
        by: ["query"],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Enrich top viewed products with names and images
    const viewedProductIds = topViewedProducts.map((v) => v.productId);
    const products = viewedProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: viewedProductIds } },
          select: { id: true, name: true, slug: true, price: true, salePrice: true, images: { take: 1, select: { url: true } } },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const enrichedViewed = topViewedProducts.map((v) => ({
      productId: v.productId,
      views: v._count.productId,
      product: productMap.get(v.productId) || null,
    }));

    // Build complete 14-day search trend chart
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const trendMap = new Map(
      (searchTrend || []).map((r: any) => [
        r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
        Number(r.count),
      ])
    );
    const searchChart: { date: string; searches: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      searchChart.push({ date: dateStr, searches: trendMap.get(dateStr) || 0 });
    }

    const totalUniqueSearchers = uniqueSearchers.length;
    const totalSearches = topSearches.reduce((sum, s) => sum + s._count.query, 0);

    return successResponse(res, {
      topSearches: topSearches.map((s) => ({ query: s.query, count: s._count.query })),
      topViewedProducts: enrichedViewed,
      searchTrend: searchChart,
      summary: {
        totalSearches,
        uniqueSearchers: totalUniqueSearchers,
        uniqueSearchTerms: uniqueSearchTerms.length,
      },
    });
  } catch (error) {
    logger.error("Analytics error:", error);
    return errorResponse(res, "Failed to get analytics", 500);
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return errorResponse(res, "Password must be at least 8 characters", 400);
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return errorResponse(res, "User not found", 404);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Use transaction to update password and invalidate all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { passwordHash },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: id },
      }),
    ]);

    return successResponse(res, null, "Password reset successful");
  } catch (error) {
    logger.error("Reset user password error:", error);
    return errorResponse(res, "Failed to reset password", 500);
  }
};

// Admin: list all products (including inactive) for the admin panel
export const adminListProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const skip = (page - 1) * limit;
    const { search, categoryId, isActive } = req.query;
    const storeId = getEffectiveStoreId(req);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { sku: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId as string;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const includeClause: any = {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, isPrimary: true } },
      _count: { select: { orderItems: true, reviews: true } },
    };

    if (storeId) {
      includeClause.storeProducts = {
        where: { storeId: storeId as string },
        select: { price: true, salePrice: true, costPrice: true, stock: true, lowStockAlert: true, isAvailable: true },
      };
    } else {
      // Include all store product associations (used by edit page)
      includeClause.storeProducts = {
        select: { storeId: true, price: true, salePrice: true, costPrice: true, stock: true, lowStockAlert: true, isAvailable: true },
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: includeClause,
      }),
      prisma.product.count({ where }),
    ]);

    const enriched = products.map((p: any) => {
      const sp = storeId ? p.storeProducts?.[0] : null;
      return {
        ...p,
        price: sp ? Number(sp.price) : Number(p.price),
        salePrice: sp ? (sp.salePrice ? Number(sp.salePrice) : null) : (p.salePrice ? Number(p.salePrice) : null),
        costPrice: sp ? (sp.costPrice ? Number(sp.costPrice) : null) : (p.costPrice ? Number(p.costPrice) : null),
        stock: sp ? sp.stock : p.stock,
        lowStockAlert: sp ? sp.lowStockAlert : p.lowStockAlert,
        isAvailable: sp ? sp.isAvailable : p.isAvailable,
      };
    });

    return successResponse(res, {
      products: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Admin list products error:", error);
    return errorResponse(res, "Failed to list products", 500);
  }
};

// Admin: get a product by id (works for active and inactive)
export const adminGetProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = getEffectiveStoreId(req);

    const includeClause: any = {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { orderItems: true, reviews: true } },
    };

    if (storeId) {
      includeClause.storeProducts = {
        where: { storeId },
        select: { price: true, salePrice: true, costPrice: true, stock: true, lowStockAlert: true, isAvailable: true },
      };
    } else {
      // Include all store product associations (used by edit page)
      includeClause.storeProducts = {
        select: { storeId: true, price: true, salePrice: true, costPrice: true, stock: true, lowStockAlert: true, isAvailable: true },
      };
    }

    const product: any = await prisma.product.findUnique({
      where: { id },
      include: includeClause,
    });
    if (!product) return errorResponse(res, "Product not found", 404);

      const sp = storeId ? product.storeProducts?.[0] : null;

    return successResponse(res, {
      ...product,
      price: sp ? Number(sp.price) : Number(product.price),
      salePrice: sp ? (sp.salePrice ? Number(sp.salePrice) : null) : (product.salePrice ? Number(product.salePrice) : null),
      costPrice: sp ? (sp.costPrice ? Number(sp.costPrice) : null) : (product.costPrice ? Number(product.costPrice) : null),
      stock: sp ? sp.stock : product.stock,
      lowStockAlert: sp ? sp.lowStockAlert : product.lowStockAlert,
      isAvailable: sp ? sp.isAvailable : product.isAvailable,
    });
  } catch (error) {
    logger.error("Admin get product error:", error);
    return errorResponse(res, "Failed to get product", 500);
  }
};

// ─────────────────────── Low Stock ───────────────────────

export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const items = await getLowStockItems(storeId);
    return successResponse(res, items);
  } catch (error) {
    logger.error("Get low stock products error:", error);
    return errorResponse(res, "Failed to get low stock products", 500);
  }
};
