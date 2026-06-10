import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { uploadImage } from "../services/upload.service";
import { logger } from "../utils/logger";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, role: true, isEmailVerified: true, defaultAddressId: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, user);
  } catch (error) {
    logger.error("Get profile error:", error);
    return errorResponse(res, "Failed to get profile", 500);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, defaultAddressId } = req.body;
    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (defaultAddressId !== undefined) data.defaultAddressId = defaultAddressId;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatarUrl: true, role: true, isEmailVerified: true, createdAt: true, updatedAt: true,
      },
    });
    return successResponse(res, user, "Profile updated");
  } catch (error) {
    logger.error("Update profile error:", error);
    return errorResponse(res, "Failed to update profile", 500);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { passwordHash: true },
    });

    if (!user) return errorResponse(res, "User not found", 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return errorResponse(res, "Current password is incorrect", 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { passwordHash },
    });

    return successResponse(res, null, "Password changed successfully");
  } catch (error) {
    logger.error("Change password error:", error);
    return errorResponse(res, "Failed to change password", 500);
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) return errorResponse(res, "No file provided", 400);

    const imageUrl = await uploadImage(req.file.buffer, "avatars", req.user!.userId);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl: imageUrl },
      select: { id: true, avatarUrl: true },
    });

    return successResponse(res, user, "Avatar uploaded");
  } catch (error) {
    logger.error("Upload avatar error:", error);
    return errorResponse(res, "Failed to upload avatar", 500);
  }
};

// Addresses
export const getAddresses = async (req: Request, res: Response) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.userId },
      orderBy: { isDefault: "desc" },
    });
    return successResponse(res, addresses);
  } catch (error) {
    logger.error("Get addresses error:", error);
    return errorResponse(res, "Failed to get addresses", 500);
  }
};

export const addAddress = async (req: Request, res: Response) => {
  try {
    const { label, street, city, state, pincode, landmark, lat, lng, isDefault } = req.body;

    // If this should be default, unset others
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.userId,
        label: label || "Home",
        street,
        city,
        state,
        pincode,
        landmark,
        lat,
        lng,
        isDefault: isDefault || false,
      },
    });

    if (isDefault) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { defaultAddressId: address.id },
      });
    }

    return successResponse(res, address, "Address added", 201);
  } catch (error) {
    logger.error("Add address error:", error);
    return errorResponse(res, "Failed to add address", 500);
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, street, city, state, pincode, landmark, lat, lng, isDefault } = req.body;

    const address = await prisma.address.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!address) return errorResponse(res, "Address not found", 404);

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        label, street, city, state, pincode, landmark, lat, lng,
        isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      },
    });

    if (isDefault) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { defaultAddressId: id },
      });
    }

    return successResponse(res, updated, "Address updated");
  } catch (error) {
    logger.error("Update address error:", error);
    return errorResponse(res, "Failed to update address", 500);
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!address) return errorResponse(res, "Address not found", 404);

    await prisma.address.delete({ where: { id } });
    return successResponse(res, null, "Address deleted");
  } catch (error) {
    logger.error("Delete address error:", error);
    return errorResponse(res, "Failed to delete address", 500);
  }
};

export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!address) return errorResponse(res, "Address not found", 404);

    await prisma.address.updateMany({
      where: { userId: req.user!.userId },
      data: { isDefault: false },
    });

    await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { defaultAddressId: id },
    });

    return successResponse(res, null, "Default address updated");
  } catch (error) {
    logger.error("Set default address error:", error);
    return errorResponse(res, "Failed to set default address", 500);
  }
};
