// Payment service stub - will integrate Razorpay/Stripe
// Configuration is done via environment variables

export const createPaymentIntent = async (
  amount: number,
  currency: string = "INR",
  metadata: Record<string, string> = {}
): Promise<{ id: string; amount: number; currency: string }> => {
  // Placeholder: return a mock payment intent
  // TODO: Integrate with Razorpay or Stripe SDK
  return {
    id: `pi_mock_${Date.now()}`,
    amount,
    currency,
  };
};

export const verifyPayment = async (
  paymentId: string,
  orderId: string
): Promise<boolean> => {
  // Placeholder: always return true
  // TODO: Verify with Razorpay/Stripe webhook
  return true;
};
