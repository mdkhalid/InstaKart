import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { createPaymentIntent } from "../services/payment.service";

export const createPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.userId },
    });

    if (!order) return errorResponse(res, "Order not found", 404);

    const paymentIntent = await createPaymentIntent(Number(order.total), "INR", {
      orderId: order.id,
      userId: req.user!.userId,
    });

    return successResponse(res, {
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return errorResponse(res, "Failed to create payment", 500);
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  // Placeholder for payment webhook
  // Will process Razorpay/Stripe webhook events
  return successResponse(res, null, "Webhook received");
};
