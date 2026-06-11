import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";


function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /auth/send-otp
 * Generates a 6-digit OTP for the given phone number.
 * In development, OTP is logged to console.
 * In production, send via SMS/WhatsApp gateway.
 */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return errorResponse(res, "Valid phone number is required", 400);
    }

    // Rate limit: 1 OTP per minute per phone
    const recent = await prisma.otp.findFirst({
      where: { phone, createdAt: { gte: new Date(Date.now() - 60000) }, used: false },
    });
    if (recent) {
      return errorResponse(res, "Please wait 1 minute before requesting another OTP", 429);
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otp.create({
      data: { phone, code, expiresAt },
    });

    // In development, log the OTP
    logger.info(`OTP for ${phone}: ${code}`);

    // Return OTP in dev mode (no SMS gateway configured)
    const isDev = process.env.NODE_ENV !== "production";
    return successResponse(res, isDev ? { otp: code } : null, "OTP sent successfully");
  } catch (error) {
    logger.error("Send OTP error:", error);
    return errorResponse(res, "Failed to send OTP", 500);
  }
};

/**
 * POST /auth/verify-otp
 * Verifies OTP and logs in returning user, or creates a minimal account
 * for first-time phone users. Core identity is phone-only; the user can
 * fill in their name, email, and other details later from their profile page.
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return errorResponse(res, "Phone and OTP are required", 400);
    }

    const otp = await prisma.otp.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return errorResponse(res, "Invalid or expired OTP", 400);
    }

    // Mark OTP as used
    await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });

    // Find or create user — OTP acts as both registration + login for phone-first users
    const randomPassword = crypto.randomBytes(16).toString("hex");

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone}@placeholder.instamart`,
          passwordHash: randomPassword,
          firstName: phone,
          lastName: "",
          role: "CUSTOMER",
        },
      });

      await prisma.cart.create({ data: { userId: user.id } });
    }

    // Generate tokens
    const accessToken = signAccessToken(user.id, user.role, user.storeId || undefined);
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return successResponse(res, { user: userWithoutPassword, accessToken }, "Login successful");
  } catch (error) {
    logger.error("Verify OTP error:", error);
    return errorResponse(res, "Failed to verify OTP", 500);
  }
};
