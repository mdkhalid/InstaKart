import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { uploadImage } from "../services/upload.service";

// 10 minutes post-delivery window for instant-shopping apps
const ISSUE_WINDOW_MINUTES = Number(process.env.ISSUE_WINDOW_MINUTES) || 10;
// Auto-approve threshold - issues below this amount are auto-approved instantly
const AUTO_APPROVE_LIMIT = Number(process.env.ISSUE_AUTO_APPROVE_LIMIT) || 500;

export const createOrderIssue = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user!.userId;
    const { type, description, photoUrls = [], orderItemId } = req.body;

    if (!type) {
      return errorResponse(res, "Issue type is required", 400);
    }

    const validTypes = ["WRONG_ITEM", "DAMAGED", "MISSING_ITEM", "POOR_QUALITY", "EXPIRED", "OTHER"];
    if (!validTypes.includes(type)) {
      return errorResponse(res, "Invalid issue type", 400);
    }

    if (photoUrls.length > 3) {
      return errorResponse(res, "Maximum 3 photos allowed", 400);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    // Only delivered orders can have issues raised
    if (order.status !== "DELIVERED") {
      return errorResponse(
        res,
        "Issues can only be reported on delivered orders",
        400
      );
    }

    // Check delivery window (fall back to updatedAt if deliveredAt is missing)
    const baseDelivery = order.deliveredAt
      ? new Date(order.deliveredAt)
      : new Date(order.updatedAt);
    const minutesSinceDelivery =
      (Date.now() - baseDelivery.getTime()) / 60000;
    if (minutesSinceDelivery > ISSUE_WINDOW_MINUTES) {
      return errorResponse(
        res,
        `Issue reporting window of ${ISSUE_WINDOW_MINUTES} minutes has expired. Please contact support.`,
        400
      );
    }

    // Validate orderItemId if provided
    let affectedAmount: number | null = null;
    if (orderItemId) {
      const item = order.items.find((i) => i.id === orderItemId);
      if (!item) {
        return errorResponse(res, "Invalid order item", 400);
      }
      affectedAmount = Number(item.totalPrice);
    }

    // Auto-approve small issues: order-level issues use order total, item-level use item total
    const claimAmount =
      affectedAmount !== null ? affectedAmount : Number(order.total);
    const isAutoApprove = claimAmount <= AUTO_APPROVE_LIMIT;
    const initialStatus = isAutoApprove ? "AUTO_APPROVED" : "OPEN";

    const issue = await prisma.orderIssue.create({
      data: {
        orderId,
        reportedById: userId,
        type,
        description: description || null,
        photoUrls,
        orderItemId: orderItemId || null,
        status: initialStatus,
        refundAmount: isAutoApprove ? claimAmount : null,
        refundMethod: isAutoApprove ? "WALLET" : null,
        resolvedAt: isAutoApprove ? new Date() : null,
      },
      include: {
        order: { select: { orderNumber: true, total: true } },
        reportedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // For auto-approved issues, update order payment status
    if (isAutoApprove) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return successResponse(
      res,
      issue,
      isAutoApprove
        ? `Issue auto-approved. ₹${claimAmount} will be refunded to your wallet within 24 hours.`
        : "Issue reported. Our team will review and respond shortly.",
      201
    );
  } catch (error) {
    console.error("Create order issue error:", error);
    return errorResponse(res, "Failed to report issue", 500);
  }
};

export const getOrderIssues = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user!.userId;

    // Verify the order belongs to this user
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    if (!order) return errorResponse(res, "Order not found", 404);

    const issues = await prisma.orderIssue.findMany({
      where: { orderId },
      include: {
        orderItem: { select: { id: true, productName: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute remaining window for the order
    const orderData = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveredAt: true, status: true, updatedAt: true },
    });

    let canReportNew = false;
    let windowExpiresAt: Date | null = null;
    if (orderData?.status === "DELIVERED") {
      // Fall back to updatedAt if deliveredAt is missing (shouldn't happen
      // but makes the UI more forgiving for older / seeded orders).
      const baseTime = orderData.deliveredAt
        ? new Date(orderData.deliveredAt)
        : new Date(orderData.updatedAt);
      const expiresAt = new Date(baseTime);
      expiresAt.setMinutes(expiresAt.getMinutes() + ISSUE_WINDOW_MINUTES);
      windowExpiresAt = expiresAt;
      canReportNew = expiresAt.getTime() > Date.now();
    }

    return successResponse(res, {
      issues,
      canReportNew,
      windowExpiresAt,
      windowMinutes: ISSUE_WINDOW_MINUTES,
    });
  } catch (error) {
    console.error("Get order issues error:", error);
    return errorResponse(res, "Failed to fetch issues", 500);
  }
};

// ----- Admin endpoints -----

export const getAllIssues = async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [issues, total] = await Promise.all([
      prisma.orderIssue.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              deliveredAt: true,
              items: { select: { productName: true, quantity: true, totalPrice: true } },
            },
          },
          reportedBy: { select: { firstName: true, lastName: true, email: true, phone: true } },
          orderItem: { select: { productName: true, quantity: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.orderIssue.count({ where }),
    ]);

    return successResponse(res, {
      issues,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error("Get all issues error:", error);
    return errorResponse(res, "Failed to fetch issues", 500);
  }
};

export const getIssueDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const issue = await prisma.orderIssue.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            address: true,
            items: true,
          },
        },
        reportedBy: { select: { firstName: true, lastName: true, email: true, phone: true } },
        orderItem: true,
      },
    });
    if (!issue) return errorResponse(res, "Issue not found", 404);
    return successResponse(res, issue);
  } catch (error) {
    console.error("Get issue detail error:", error);
    return errorResponse(res, "Failed to fetch issue", 500);
  }
};

export const resolveIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, refundAmount, refundMethod, adminNotes } = req.body;
    const adminId = req.user!.userId;

    if (!["approve", "reject"].includes(action)) {
      return errorResponse(res, "Invalid action. Use 'approve' or 'reject'", 400);
    }

    const issue = await prisma.orderIssue.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!issue) return errorResponse(res, "Issue not found", 404);
    if (["RESOLVED", "REJECTED", "APPROVED"].includes(issue.status)) {
      return errorResponse(res, "Issue already resolved", 400);
    }

    if (action === "reject") {
      const updated = await prisma.orderIssue.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes || null,
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });
      return successResponse(res, updated, "Issue rejected");
    }

    // Approve flow
    const finalAmount = refundAmount !== undefined ? Number(refundAmount) : (issue.refundAmount ? Number(issue.refundAmount) : Number(issue.order.total));
    if (finalAmount < 0 || finalAmount > Number(issue.order.total)) {
      return errorResponse(res, "Invalid refund amount", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.orderIssue.update({
        where: { id },
        data: {
          status: "APPROVED",
          refundAmount: finalAmount,
          refundMethod: refundMethod || "WALLET",
          adminNotes: adminNotes || null,
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });

      // If full refund, mark order as refunded
      if (finalAmount >= Number(issue.order.total)) {
        await tx.order.update({
          where: { id: issue.orderId },
          data: { paymentStatus: "REFUNDED" },
        });
      }

      return updatedIssue;
    });

    return successResponse(res, updated, `Issue approved. ₹${finalAmount} refund initiated.`);
  } catch (error) {
    console.error("Resolve issue error:", error);
    return errorResponse(res, "Failed to resolve issue", 500);
  }
};

export const uploadIssuePhotos = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return errorResponse(res, "No files provided", 400);
    }
    if (files.length > 3) {
      return errorResponse(res, "Maximum 3 photos allowed", 400);
    }
    const urls = await Promise.all(
      files.map((f) => uploadImage(f.buffer, "issues"))
    );
    return successResponse(res, { urls });
  } catch (error) {
    console.error("Upload issue photos error:", error);
    return errorResponse(res, "Failed to upload photos", 500);
  }
};
