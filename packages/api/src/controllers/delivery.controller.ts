import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { getEffectiveStoreId } from "../middleware/auth.middleware";
import { emitToUser, emitToAdmin } from "../services/socket.service";
import { logger } from "../utils/logger";

// ─────────────────────── DELIVERY PERSONS CRUD ───────────────────────

export const listDeliveryPersons = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, type, search } = req.query;
    const storeId = getEffectiveStoreId(req);

    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
        { employeeId: { contains: search as string } },
      ];
    }

    const [persons, total] = await Promise.all([
      prisma.deliveryPerson.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { assignments: true } },
        },
      }),
      prisma.deliveryPerson.count({ where }),
    ]);

    const enriched = persons.map((p) => ({
      ...p,
      hourlyRate: p.hourlyRate ? Number(p.hourlyRate) : null,
      monthlySalary: p.monthlySalary ? Number(p.monthlySalary) : null,
      totalEarnings: Number(p.totalEarnings),
    }));

    return successResponse(res, {
      persons: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("List delivery persons error:", error);
    return errorResponse(res, "Failed to list delivery persons", 500);
  }
};

export const getDeliveryPerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = getEffectiveStoreId(req);

    const person = await prisma.deliveryPerson.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true } },
        assignments: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!person) return errorResponse(res, "Delivery person not found", 404);
    if (storeId && person.storeId !== storeId) return errorResponse(res, "Delivery person not found", 404);

    return successResponse(res, {
      ...person,
      hourlyRate: person.hourlyRate ? Number(person.hourlyRate) : null,
      monthlySalary: person.monthlySalary ? Number(person.monthlySalary) : null,
      totalEarnings: Number(person.totalEarnings),
      assignments: person.assignments.map((a) => ({
        ...a,
        order: a.order ? { ...a.order, total: Number(a.order.total) } : null,
      })),
    });
  } catch (error) {
    logger.error("Get delivery person error:", error);
    return errorResponse(res, "Failed to get delivery person", 500);
  }
};

export const createDeliveryPerson = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, employeeId, type, hourlyRate, monthlySalary, vehicleType, vehicleNumber, storeId: reqStoreId } = req.body;
    const effectiveStoreId = getEffectiveStoreId(req) || reqStoreId;

    if (!effectiveStoreId) {
      return errorResponse(res, "Store is required", 400);
    }

    if (!phone) {
      return errorResponse(res, "Phone number is required", 400);
    }

    // Check phone uniqueness
    const existing = await prisma.deliveryPerson.findUnique({ where: { phone } });
    if (existing) return errorResponse(res, "A delivery person with this phone already exists", 409);

    if (employeeId) {
      const existingEmp = await prisma.deliveryPerson.findUnique({ where: { employeeId } });
      if (existingEmp) return errorResponse(res, "Employee ID already in use", 409);
    }

    const person = await prisma.deliveryPerson.create({
      data: {
        storeId: effectiveStoreId,
        firstName, lastName, phone, email,
        employeeId: employeeId || undefined,
        type: type || "FULL_TIME",
        hourlyRate: hourlyRate || undefined,
        monthlySalary: monthlySalary || undefined,
        vehicleType: vehicleType || "BIKE",
        vehicleNumber: vehicleNumber || undefined,
      },
    });

    return successResponse(res, {
      ...person,
      hourlyRate: person.hourlyRate ? Number(person.hourlyRate) : null,
      monthlySalary: person.monthlySalary ? Number(person.monthlySalary) : null,
      totalEarnings: Number(person.totalEarnings),
    }, "Delivery person created", 201);
  } catch (error) {
    logger.error("Create delivery person error:", error);
    return errorResponse(res, "Failed to create delivery person", 500);
  }
};

export const updateDeliveryPerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, employeeId, type, hourlyRate, monthlySalary, vehicleType, vehicleNumber, status } = req.body;
    const storeId = getEffectiveStoreId(req);

    const existing = await prisma.deliveryPerson.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Delivery person not found", 404);
    if (storeId && existing.storeId !== storeId) return errorResponse(res, "Delivery person not found", 404);

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) {
      const phoneConflict = await prisma.deliveryPerson.findFirst({ where: { phone, NOT: { id } } });
      if (phoneConflict) return errorResponse(res, "Phone already in use", 409);
      data.phone = phone;
    }
    if (email !== undefined) data.email = email;
    if (employeeId !== undefined) {
      const empConflict = await prisma.deliveryPerson.findFirst({ where: { employeeId, NOT: { id } } });
      if (empConflict) return errorResponse(res, "Employee ID already in use", 409);
      data.employeeId = employeeId;
    }
    if (type !== undefined) data.type = type;
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate;
    if (monthlySalary !== undefined) data.monthlySalary = monthlySalary;
    if (vehicleType !== undefined) data.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber;
    if (status !== undefined) data.status = status;

    const person = await prisma.deliveryPerson.update({ where: { id }, data });

    return successResponse(res, {
      ...person,
      hourlyRate: person.hourlyRate ? Number(person.hourlyRate) : null,
      monthlySalary: person.monthlySalary ? Number(person.monthlySalary) : null,
      totalEarnings: Number(person.totalEarnings),
    }, "Delivery person updated");
  } catch (error) {
    logger.error("Update delivery person error:", error);
    return errorResponse(res, "Failed to update delivery person", 500);
  }
};

export const toggleDeliveryPersonStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const storeId = getEffectiveStoreId(req);

    const person = await prisma.deliveryPerson.findUnique({ where: { id }, select: { id: true, storeId: true } });
    if (!person) return errorResponse(res, "Delivery person not found", 404);
    if (storeId && person.storeId !== storeId) return errorResponse(res, "Delivery person not found", 404);

    // ON_DELIVERY is set automatically by the assignment process, not manually
    if (!["ACTIVE", "INACTIVE", "OFF_DUTY"].includes(status)) {
      return errorResponse(res, "Invalid status. Use ACTIVE, INACTIVE, or OFF_DUTY", 400);
    }

    const updated = await prisma.deliveryPerson.update({
      where: { id },
      data: { status },
    });

    return successResponse(res, updated, `Status updated to ${status}`);
  } catch (error) {
    logger.error("Toggle delivery person status error:", error);
    return errorResponse(res, "Failed to update status", 500);
  }
};

// ─────────────────────── DELIVERY ASSIGNMENT ───────────────────────

export const getAvailableDeliveryPersons = async (req: Request, res: Response) => {
  try {
    const storeId = getEffectiveStoreId(req);
    if (!storeId) return errorResponse(res, "Store ID required", 400);

    // Only include truly available persons — ACTIVE status AND no active (non-completed) assignments
    const persons = await prisma.deliveryPerson.findMany({
      where: {
        storeId,
        status: "ACTIVE",
        assignments: { none: { status: { notIn: ["DELIVERED", "FAILED"] } } },
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        vehicleType: true, vehicleNumber: true,
        status: true, rating: true, totalDeliveries: true,
        currentLat: true, currentLng: true, lastLocationAt: true,
      },
      orderBy: { totalDeliveries: "desc" },
    });

    return successResponse(res, persons);
  } catch (error) {
    logger.error("Get available delivery persons error:", error);
    return errorResponse(res, "Failed to get available delivery persons", 500);
  }
};

export const assignDeliveryPerson = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;
    const { deliveryPersonId } = req.body;
    const storeId = getEffectiveStoreId(req);

    // Verify order exists and belongs to store
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true } } },
    });
    if (!order) return errorResponse(res, "Order not found", 404);
    if (storeId && order.storeId !== storeId) return errorResponse(res, "Order not found", 404);

    // Verify delivery person
    const person = await prisma.deliveryPerson.findUnique({ where: { id: deliveryPersonId } });
    if (!person) return errorResponse(res, "Delivery person not found", 404);
    if (person.storeId !== order.storeId) return errorResponse(res, "Delivery person not from this store", 400);
    if (person.status === "INACTIVE" || person.status === "OFF_DUTY") {
      return errorResponse(res, "Delivery person is not available", 400);
    }

    // Check if order already has an assignment
    const existingAssignment = await prisma.deliveryAssignment.findUnique({ where: { orderId } });
    if (existingAssignment) {
      return errorResponse(res, "Order already has a delivery assignment", 409);
    }

    // Create assignment in transaction
    const assignment = await prisma.$transaction(async (tx) => {
      // Mark delivery person as ON_DELIVERY
      await tx.deliveryPerson.update({
        where: { id: deliveryPersonId },
        data: { status: "ON_DELIVERY" },
      });

      // Create assignment
      const newAssignment = await tx.deliveryAssignment.create({
        data: {
          deliveryPersonId,
          orderId,
          status: "ASSIGNED",
        },
        include: {
          deliveryPerson: { select: { id: true, firstName: true, lastName: true, phone: true, vehicleType: true, vehicleNumber: true } },
        },
      });

      // Add status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.status,
          note: `Assigned to delivery person: ${person.firstName} ${person.lastName} (${person.phone})`,
        },
      });

      return newAssignment;
    });

    // Emit socket events
    emitToUser(order.user.id, "delivery:assigned", {
      orderId,
      deliveryPerson: {
        name: `${person.firstName} ${person.lastName}`,
        phone: person.phone,
        vehicleType: person.vehicleType,
        vehicleNumber: person.vehicleNumber,
      },
    });
    emitToAdmin("delivery:assigned", { orderId, deliveryPersonId, assignment });

    return successResponse(res, assignment, "Delivery person assigned", 201);
  } catch (error) {
    logger.error("Assign delivery person error:", error);
    return errorResponse(res, "Failed to assign delivery person", 500);
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const storeId = getEffectiveStoreId(req);

    const assignment = await prisma.deliveryAssignment.findUnique({
      where: { id },
      include: {
        deliveryPerson: { select: { id: true, storeId: true, firstName: true, lastName: true } },
        order: { select: { id: true, storeId: true, userId: true, status: true, orderNumber: true } },
      },
    });

    if (!assignment) return errorResponse(res, "Assignment not found", 404);
    if (storeId && assignment.deliveryPerson.storeId !== storeId) return errorResponse(res, "Assignment not found", 404);

    const VALID_TRANSITIONS: Record<string, string[]> = {
      ASSIGNED: ["PICKED_UP", "FAILED"],
      PICKED_UP: ["IN_TRANSIT", "FAILED"],
      IN_TRANSIT: ["DELIVERED", "FAILED"],
      DELIVERED: [],
      FAILED: [],
    };

    const allowed = VALID_TRANSITIONS[assignment.status];
    if (!allowed || !allowed.includes(status)) {
      return errorResponse(res, `Cannot transition from ${assignment.status} to ${status}`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status, notes: notes || undefined };
      if (status === "PICKED_UP") updateData.pickedUpAt = new Date();
      if (status === "DELIVERED") updateData.deliveredAt = new Date();
      if (status === "FAILED") updateData.failedAt = new Date();

      const updatedAssignment = await tx.deliveryAssignment.update({
        where: { id },
        data: updateData,
      });

      // Update delivery person status and earnings
      if (status === "DELIVERED" || status === "FAILED") {
        // Calculate earnings for this delivery
        let earningsAmount = 0;
        if (status === "DELIVERED") {
          const person = await tx.deliveryPerson.findUnique({
            where: { id: assignment.deliveryPerson.id },
            select: { type: true, hourlyRate: true, monthlySalary: true },
          });
          if (person) {
            if (person.type === "PART_TIME" && person.hourlyRate) {
              // Estimate 30 min per delivery for part-time
              earningsAmount = Number(person.hourlyRate) * 0.5;
            } else if (person.type === "FULL_TIME" && person.monthlySalary) {
              // Per-delivery share: monthly salary / (avg 22 days * avg 8 deliveries per day)
              earningsAmount = Number(person.monthlySalary) / (22 * 8);
            } else {
              // Default flat rate
              earningsAmount = 30;
            }
          }
        }

        // Check if they have other active assignments
        const otherActive = await tx.deliveryAssignment.count({
          where: {
            deliveryPersonId: assignment.deliveryPerson.id,
            id: { not: id },
            status: { notIn: ["DELIVERED", "FAILED"] },
          },
        });

        await tx.deliveryPerson.update({
          where: { id: assignment.deliveryPerson.id },
          data: {
            status: otherActive > 0 ? "ON_DELIVERY" : "ACTIVE",
            ...(status === "DELIVERED" ? {
              totalDeliveries: { increment: 1 },
              totalEarnings: { increment: earningsAmount },
            } : {}),
          },
        });

        // Update/upsert daily activity with earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.deliveryActivity.upsert({
          where: {
            deliveryPersonId_date: {
              deliveryPersonId: assignment.deliveryPerson.id,
              date: today,
            },
          },
          update: {
            ordersAssigned: { increment: 1 },
            ...(status === "DELIVERED" ? {
              ordersCompleted: { increment: 1 },
              earnings: { increment: earningsAmount },
            } : {
              ordersFailed: { increment: 1 },
            }),
          },
          create: {
            deliveryPersonId: assignment.deliveryPerson.id,
            date: today,
            ordersAssigned: 1,
            ordersCompleted: status === "DELIVERED" ? 1 : 0,
            ordersFailed: status === "FAILED" ? 1 : 0,
            earnings: status === "DELIVERED" ? earningsAmount : 0,
          },
        });

      }

      // Update order status if delivered
      if (status === "DELIVERED") {
        await tx.order.update({
          where: { id: assignment.orderId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            paymentStatus: "PAID",
            statusHistory: {
              create: { status: "DELIVERED", note: notes || "Delivered successfully" },
            },
          },
        });
      }

      if (status === "FAILED") {
        await tx.orderStatusHistory.create({
          data: {
            orderId: assignment.orderId,
            status: assignment.order.status,
            note: notes || "Delivery failed",
          },
        });
      }

      return updatedAssignment;
    });

    // Emit socket events
    if (status === "DELIVERED") {
      emitToUser(assignment.order.userId, "order:delivered", {
        orderId: assignment.orderId,
        deliveredAt: new Date(),
      });
    }

    return successResponse(res, updated, `Assignment status updated to ${status}`);
  } catch (error) {
    logger.error("Update assignment status error:", error);
    return errorResponse(res, "Failed to update assignment status", 500);
  }
};

// ─────────────────────── ACTIVITY & STATS ───────────────────────

export const getDeliveryPersonActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = getEffectiveStoreId(req);
    const days = parseInt(req.query.days as string) || 30;

    const person = await prisma.deliveryPerson.findUnique({ where: { id }, select: { id: true, storeId: true } });
    if (!person) return errorResponse(res, "Delivery person not found", 404);
    if (storeId && person.storeId !== storeId) return errorResponse(res, "Delivery person not found", 404);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const activities = await prisma.deliveryActivity.findMany({
      where: {
        deliveryPersonId: id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivity = activities.find((a) =>
      a.date instanceof Date
        ? a.date.toISOString().split("T")[0] === today.toISOString().split("T")[0]
        : String(a.date).split("T")[0] === today.toISOString().split("T")[0]
    );

    const summary = {
      totalOrdersAssigned: activities.reduce((s, a) => s + a.ordersAssigned, 0),
      totalOrdersCompleted: activities.reduce((s, a) => s + a.ordersCompleted, 0),
      totalOrdersFailed: activities.reduce((s, a) => s + a.ordersFailed, 0),
      totalEarnings: activities.reduce((s, a) => s + Number(a.earnings), 0),
      totalDistanceKm: activities.reduce((s, a) => s + a.distanceKm, 0),
      today: todayActivity ? {
        ordersAssigned: todayActivity.ordersAssigned,
        ordersCompleted: todayActivity.ordersCompleted,
        ordersFailed: todayActivity.ordersFailed,
        earnings: Number(todayActivity.earnings),
        distanceKm: todayActivity.distanceKm,
        startTime: todayActivity.startTime,
        endTime: todayActivity.endTime,
      } : null,
    };

    return successResponse(res, {
      activities: activities.map((a) => ({ ...a, earnings: Number(a.earnings) })),
      summary,
    });
  } catch (error) {
    logger.error("Get delivery person activity error:", error);
    return errorResponse(res, "Failed to get activity", 500);
  }
};

export const getDeliveryStats = async (req: Request, res: Response) => {
  try {
    const storeId = getEffectiveStoreId(req);
    const where: any = {};
    if (storeId) where.storeId = storeId;

    const [totalPersons, activePersons, onDelivery, offDuty, inactive, todayAssignments, activeAssignments] = await Promise.all([
      prisma.deliveryPerson.count({ where }),
      prisma.deliveryPerson.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.deliveryPerson.count({ where: { ...where, status: "ON_DELIVERY" } }),
      prisma.deliveryPerson.count({ where: { ...where, status: "OFF_DUTY" } }),
      prisma.deliveryPerson.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.deliveryAssignment.count({
        where: {
          assignedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          deliveryPerson: storeId ? { storeId } : {},
        },
      }),
      prisma.deliveryAssignment.count({
        where: {
          status: { notIn: ["DELIVERED", "FAILED"] },
          deliveryPerson: storeId ? { storeId } : {},
        },
      }),
    ]);

    return successResponse(res, {
      totalPersons,
      activePersons,
      onDelivery,
      offDuty,
      inactive,
      todayAssignments,
      activeAssignments,
    });
  } catch (error) {
    logger.error("Get delivery stats error:", error);
    return errorResponse(res, "Failed to get delivery stats", 500);
  }
};
