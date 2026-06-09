import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) return errorResponse(res, "Product not found", 404);

    const [reviews, total, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.review.count({ where: { productId: product.id } }),
      prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
      }),
    ]);

    return successResponse(res, {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
      totalReviews: total,
    });
  } catch (error) {
    logger.error("Get product reviews error:", error);
    return errorResponse(res, "Failed to get reviews", 500);
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user!.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return errorResponse(res, "Product not found", 404);

    // Check if user already reviewed this product
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) return errorResponse(res, "You have already reviewed this product", 409);

    // Check if user has purchased this product (for verified badge)
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: ["DELIVERED", "OUT_FOR_DELIVERY"] } },
      },
    });

    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        isVerifiedPurchase: !!purchased,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return successResponse(res, review, "Review created", 201);
  } catch (error) {
    logger.error("Create review error:", error);
    return errorResponse(res, "Failed to create review", 500);
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { rating, title, comment } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return errorResponse(res, "Review not found", 404);
    if (review.userId !== userId) return errorResponse(res, "Not authorized", 403);

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating }),
        ...(title !== undefined && { title: title?.trim() || null }),
        ...(comment !== undefined && { comment: comment?.trim() || null }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return successResponse(res, updated, "Review updated");
  } catch (error) {
    logger.error("Update review error:", error);
    return errorResponse(res, "Failed to update review", 500);
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return errorResponse(res, "Review not found", 404);
    if (review.userId !== userId) return errorResponse(res, "Not authorized", 403);

    await prisma.review.delete({ where: { id } });
    return successResponse(res, null, "Review deleted");
  } catch (error) {
    logger.error("Delete review error:", error);
    return errorResponse(res, "Failed to delete review", 500);
  }
};
