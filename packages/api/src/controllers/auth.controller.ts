import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { successResponse, errorResponse } from "../utils/response";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.service";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse(res, "Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, phone, role: "CUSTOMER" },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, isEmailVerified: true, createdAt: true },
    });

    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create empty cart for user
    await prisma.cart.create({ data: { userId: user.id } });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send welcome email in background
    sendWelcomeEmail(email, firstName).catch(() => {});

    return successResponse(res, { user, accessToken }, "Registration successful", 201);
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse(res, "Registration failed", 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, passwordHash: true, isEmailVerified: true, isActive: true, createdAt: true },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const accessToken = signAccessToken(user.id, user.role);
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

    const { passwordHash: _, ...userWithoutPassword } = user;
    return successResponse(res, { user: userWithoutPassword, accessToken }, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Login failed", 500);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(res, "Refresh token not found", 401);
    }

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return errorResponse(res, "Invalid refresh token", 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { role: true } } },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return errorResponse(res, "Refresh token expired or revoked", 401);
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newAccessToken = signAccessToken(payload.userId, storedToken.user.role);
    const newRefreshToken = signRefreshToken(payload.userId);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, { accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    return errorResponse(res, "Token refresh failed", 500);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie("refreshToken");
    return successResponse(res, null, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse(res, "Logout failed", 500);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return successResponse(res, null, "If the email exists, a reset link has been sent");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    await prisma.passwordReset.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(email, resetToken);

    return successResponse(res, null, "If the email exists, a reset link has been sent");
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse(res, "Failed to process request", 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordReset.findFirst({
      where: { token: hashedToken, used: false, expiresAt: { gt: new Date() } },
    });

    if (!resetRecord) {
      return errorResponse(res, "Invalid or expired reset token", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return successResponse(res, null, "Password reset successful");
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, "Password reset failed", 500);
  }
};
