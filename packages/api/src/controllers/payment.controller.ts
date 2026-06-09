import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import {
import { logger } from "../utils/logger";
  createPaymentIntent,
  verifyPayment,
  handleRazorpayWebhook,
  handleStripeWebhook,
  PaymentMethod,
} from "../services/payment.service";

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, method = "RAZORPAY" } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.userId },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    if (order.paymentStatus === "PAID") {
      return errorResponse(res, "Order already paid", 400);
    }

    const paymentIntent = await createPaymentIntent(
      Number(order.total),
      "INR",
      { orderId: order.id, userId: req.user!.userId },
      method as PaymentMethod
    );

    return successResponse(res, {
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      provider: paymentIntent.provider,
      clientSecret: paymentIntent.clientSecret,
      orderId: paymentIntent.orderId,
    });
  } catch (error) {
    logger.error("Create payment error:", error);
    return errorResponse(res, "Failed to create payment", 500);
  }
};

export const verifyPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentId, orderId, method = "RAZORPAY" } = req.body;

    const result = await verifyPayment(paymentId, orderId, method as PaymentMethod);

    if (!result.success) {
      return errorResponse(res, result.error || "Payment verification failed", 400);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentId: result.paymentId,
        status: "CONFIRMED",
      },
    });

    return successResponse(res, result, "Payment verified successfully");
  } catch (error) {
    logger.error("Verify payment error:", error);
    return errorResponse(res, "Failed to verify payment", 500);
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature =
      req.headers["x-razorpay-signature"] || req.headers["stripe-signature"];

    if (!signature) {
      return errorResponse(res, "Missing signature header", 400);
    }

    let result: any = null;

    if (req.headers["x-razorpay-signature"]) {
      result = await handleRazorpayWebhook(req.body, signature as string);
    } else if (req.headers["stripe-signature"]) {
      result = await handleStripeWebhook(req.body, signature as string);
    }

    if (!result) {
      return successResponse(res, null, "Webhook received (no action)");
    }

    if (result.success && result.orderId) {
      await prisma.order.update({
        where: { id: result.orderId },
        data: {
          paymentStatus: "PAID",
          paymentId: result.paymentId,
          status: "CONFIRMED",
        },
      });
    }

    return successResponse(res, result, "Webhook processed");
  } catch (error) {
    logger.error("Webhook error:", error);
    return errorResponse(res, "Webhook processing failed", 500);
  }
};