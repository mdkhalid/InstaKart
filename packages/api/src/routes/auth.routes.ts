import { Router } from "express";
import { register, login, refresh, logout, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { sendOtp, verifyOtp } from "../controllers/otp.controller";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// OTP routes (no validation — phone is validated in controller)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

export default router;
