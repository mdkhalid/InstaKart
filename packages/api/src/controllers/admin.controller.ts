import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { emitToUser } from "../services/socket.service";

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
export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalRevenueAgg,
      todayRevenueAgg,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalUsers,
      newUsersToday,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: "PAID" },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: "PAID", createdAt: { gte: today } },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: { lte: prisma.product.fields.lowStockAlert } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true, email: true } }, items: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId", "productName"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    // Revenue chart - last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const orders = await prisma.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, createdAt: true },
    });

    const revenueChart: { date: string; revenue: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayRevenue = orders
        .filter((o) => o.createdAt.toISOString().split("T")[0] === dateStr)
        .reduce((sum, o) => sum + Number(o.total), 0);
      revenueChart.push({ date: dateStr, revenue: dayRevenue });
    }

    return successResponse(res, {
      stats: {
        totalRevenue: totalRevenueAgg._sum.total || 0,
        todayRevenue: todayRevenueAgg._sum.total || 0,
        totalOrders,
        pendingOrders,
        totalProducts,
        lowStockProducts,
        totalUsers,
        newUsersToday,
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
    });
  } catch (error) {
    console.error("Dashboard error:", error);
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

    const where: any = {};
    if (status) where.status = status;
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
    console.error("Get all orders error:", error);
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

    const allowedTransitions = VALID_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return errorResponse(res, `Cannot transition from ${order.status} to ${status}`, 400);
    }

    // Handle refund or cancellation - restore stock
    if (status === "REFUNDED" || status === "CANCELLED") {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
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
      emitToUser(order.user.id, event, {
        orderId: id,
        estimatedDelivery: order.estimatedDelivery,
        ...(status === "OUT_FOR_DELIVERY" ? { agentName: "Delivery Agent", agentPhone: "+91XXXXXXXXXX" } : {}),
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
    console.error("Update order status error:", error);
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
        items: true,
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
    console.error("Get order detail error:", error);
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
    console.error("Get all users error:", error);
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
    console.error("Get user detail error:", error);
    return errorResponse(res, "Failed to get user details", 500);
  }
};

export const changeUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["CUSTOMER", "ADMIN", "DELIVERY_AGENT"].includes(role)) {
      return errorResponse(res, "Invalid role", 400);
    }

    await prisma.user.update({ where: { id }, data: { role } });
    return successResponse(res, null, "User role updated");
  } catch (error) {
    console.error("Change user role error:", error);
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
    console.error("Toggle user status error:", error);
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
    console.error("Delete user error:", error);
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
    console.error("Update user error:", error);
    return errorResponse(res, "Failed to update user", 500);
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
    console.error("Reset user password error:", error);
    return errorResponse(res, "Failed to reset password", 500);
  }
};
