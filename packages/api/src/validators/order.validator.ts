import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["COD", "RAZORPAY", "STRIPE", "UPI"]).default("COD"),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
});
