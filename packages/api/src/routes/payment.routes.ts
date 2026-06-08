import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createPayment, verifyPaymentStatus, handleWebhook } from "../controllers/payment.controller";

const router = Router();

router.post("/create", authenticate, createPayment);
router.post("/verify", authenticate, verifyPaymentStatus);
router.post("/webhook", handleWebhook);

export default router;