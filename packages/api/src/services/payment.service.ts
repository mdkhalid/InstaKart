import { config } from "dotenv";
config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const DEFAULT_CURRENCY = "INR";

let razorpay: any = null;
let stripe: any = null;

function getRazorpay() {
  if (!razorpay && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    const Razorpay = require("razorpay");
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

function getStripe() {
  if (!stripe && STRIPE_SECRET_KEY) {
    const Stripe = require("stripe");
    stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  }
  return stripe;
}

export type PaymentProvider = "razorpay" | "stripe" | "cod";

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  if (method === "RAZORPAY") return "razorpay";
  if (method === "STRIPE") return "stripe";
  return "cod";
}

export type PaymentMethod = "COD" | "RAZORPAY" | "STRIPE" | "UPI";

export interface PaymentIntentResult {
  id: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  clientSecret?: string;
  orderId?: string;
}

export interface VerifiedPayment {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  method?: PaymentMethod;
  error?: string;
}

export const createPaymentIntent = async (
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  metadata: Record<string, string> = {},
  method: PaymentMethod = "RAZORPAY"
): Promise<PaymentIntentResult> => {
  const provider = getPaymentProvider(method);

  if (provider === "razorpay") {
    const rzp = getRazorpay();
    if (!rzp) throw new Error("Razorpay not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");

    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: metadata.receipt || `rcpt_${Date.now()}`,
      notes: metadata,
    });

    return {
      id: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      provider: "razorpay",
      orderId: order.id,
    };
  }

  if (provider === "stripe") {
    const stp = getStripe();
    if (!stp) throw new Error("Stripe not configured: set STRIPE_SECRET_KEY");

    const paymentIntent = await stp.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      provider: "stripe",
      clientSecret: paymentIntent.client_secret,
    };
  }

  throw new Error(`Unsupported payment method: ${method}`);
};

export const verifyPayment = async (
  paymentId: string,
  orderId: string,
  method: PaymentMethod = "RAZORPAY"
): Promise<VerifiedPayment> => {
  const provider = getPaymentProvider(method);

  if (provider === "razorpay") {
    const rzp = getRazorpay();
    if (!rzp) return { success: false, error: "Razorpay not configured" };

    try {
      const payment = await rzp.payments.fetch(paymentId);
      const isValid = payment.order_id === orderId && payment.status === "captured";

      return {
        success: isValid,
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        method: "RAZORPAY",
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (provider === "stripe") {
    const stp = getStripe();
    if (!stp) return { success: false, error: "Stripe not configured" };

    try {
      const paymentIntent = await stp.paymentIntents.retrieve(paymentId);
      const isValid = paymentIntent.metadata.orderId === orderId && paymentIntent.status === "succeeded";

      return {
        success: isValid,
        paymentId: paymentIntent.id,
        orderId: paymentIntent.metadata.orderId,
        amount: paymentIntent.amount / 100,
        method: "STRIPE",
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: `Unsupported payment method: ${method}` };
};

export const handleRazorpayWebhook = async (body: any, signature: string): Promise<VerifiedPayment | null> => {
  const rzp = getRazorpay();
  if (!rzp) throw new Error("Razorpay not configured");

  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET!)
    .update(JSON.stringify(body))
    .digest("hex");

  if (expectedSignature !== signature) {
    return { success: false, error: "Invalid webhook signature" };
  }

  if (body.event === "payment.captured") {
    const payment = body.payload.payment.entity;
    return {
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount / 100,
      method: "RAZORPAY",
    };
  }

  return null;
};

export const handleStripeWebhook = async (body: any, signature: string): Promise<VerifiedPayment | null> => {
  const stp = getStripe();
  if (!stp) throw new Error("Stripe not configured");

  let event;
  try {
    event = stp.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return { success: false, error: `Webhook signature verification failed: ${err.message}` };
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    return {
      success: true,
      paymentId: paymentIntent.id,
      orderId: paymentIntent.metadata.orderId,
      amount: paymentIntent.amount / 100,
      method: "STRIPE",
    };
  }

  return null;
};

export const getAvailableProviders = (): PaymentProvider[] => {
  const providers: PaymentProvider[] = ["cod"];
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) providers.push("razorpay");
  if (STRIPE_SECRET_KEY) providers.push("stripe");
  return providers;
};