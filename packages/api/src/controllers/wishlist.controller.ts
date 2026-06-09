import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                salePrice: true,
                stock: true,
                unit: true,
                isAvailable: true,
                images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, isPrimary: true } },
                category: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // If no wishlist exists, return empty
    if (!wishlist) {
      return successResponse(res, []);
    }

    const enriched = wishlist.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: {
        ...item.product,
        price: Number(item.product.price),
        salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
        discountPercent: item.product.salePrice
          ? Math.round(((Number(item.product.price) - Number(item.product.salePrice)) / Number(item.product.price)) * 100)
          : 0,
        image: item.product.images[0]?.url || null,
      },
    }));

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get wishlist error:", error);
    return errorResponse(res, "Failed to get wishlist", 500);
  }
};

export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.body;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    // Upsert wishlist and add item
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (existing) {
      return successResponse(res, { id: existing.id, productId }, "Already in wishlist");
    }

    const item = await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
    });

    return successResponse(res, { id: item.id, productId }, "Added to wishlist", 201);
  } catch (error) {
    logger.error("Add to wishlist error:", error);
    return errorResponse(res, "Failed to add to wishlist", 500);
  }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      return errorResponse(res, "Wishlist not found", 404);
    }

    const item = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) {
      return errorResponse(res, "Item not in wishlist", 404);
    }

    await prisma.wishlistItem.delete({ where: { id: item.id } });

    return successResponse(res, null, "Removed from wishlist");
  } catch (error) {
    logger.error("Remove from wishlist error:", error);
    return errorResponse(res, "Failed to remove from wishlist", 500);
  }
};

export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.body;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    // Check if already in wishlist
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      const existing = await prisma.wishlistItem.findUnique({
        where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      });
      if (existing) {
        await prisma.wishlistItem.delete({ where: { id: existing.id } });
        return successResponse(res, { inWishlist: false }, "Removed from wishlist");
      }
    }

    // Add to wishlist
    const newWishlist = wishlist || (await prisma.wishlist.create({ data: { userId } }));
    await prisma.wishlistItem.create({
      data: { wishlistId: newWishlist.id, productId },
    });

    return successResponse(res, { inWishlist: true }, "Added to wishlist", 201);
  } catch (error) {
    logger.error("Toggle wishlist error:", error);
    return errorResponse(res, "Failed to toggle wishlist", 500);
  }
};

export const checkWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return successResponse(res, {});
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: { where: { productId: { in: productIds } }, select: { productId: true } },
      },
    });

    const wishlistMap: Record<string, boolean> = {};
    if (wishlist) {
      for (const item of wishlist.items) {
        wishlistMap[item.productId] = true;
      }
    }

    return successResponse(res, wishlistMap);
  } catch (error) {
    logger.error("Check wishlist error:", error);
    return errorResponse(res, "Failed to check wishlist", 500);
  }
};
