import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { withCache } from "../utils/cache";

/**
 * Log a user's search query (fire-and-forget).
 */
export const trackSearch = async (req: Request, res: Response) => {
  try {
    const { query, resultsCount } = req.body;
    if (!query || !req.user) {
      return successResponse(res, null); // silently ignore
    }

    await prisma.searchActivity.create({
      data: {
        userId: req.user.userId,
        query: query.trim().toLowerCase().slice(0, 200),
        resultsCount: resultsCount || 0,
      },
    });

    return successResponse(res, null);
  } catch {
    return successResponse(res, null); // never fail on tracking
  }
};

/**
 * Log a product view (fire-and-forget).
 */
export const trackView = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    if (!productId || !req.user) {
      return successResponse(res, null);
    }

    await prisma.productView.create({
      data: {
        userId: req.user.userId,
        productId,
      },
    });

    return successResponse(res, null);
  } catch {
    return successResponse(res, null); // never fail on tracking
  }
};

/**
 * Get personalized product suggestions based on:
 * 1. Recent search queries (extract keywords, find matching products)
 * 2. Categories from past order items
 * 3. Categories from recently viewed products
 *
 * Returns up to 12 products. Falls back to trending if no history.
 */
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      const trending = await getTrendingFallback();
      return successResponse(res, trending);
    }

    const enriched = await withCache(`suggestions:user:${req.user.userId}`, async () => {
      const userId = req.user!.userId;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentSearches, recentViews, pastOrderCategories] = await Promise.all([
        prisma.searchActivity.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { query: true },
        }),
        prisma.productView.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { product: { select: { categoryId: true, tags: true } } },
        }),
        prisma.orderItem.findMany({
          where: {
            order: { userId, status: { in: ["DELIVERED", "OUT_FOR_DELIVERY", "CONFIRMED"] } },
          },
          select: { product: { select: { categoryId: true } } },
          take: 50,
          orderBy: { order: { createdAt: "desc" } },
        }),
      ]);

      const keywords = new Set<string>();
      const categoryIds = new Set<string>();

      for (const s of recentSearches) {
        s.query.split(/\s+/).filter((w) => w.length > 1).forEach((w) => keywords.add(w));
      }
      for (const v of recentViews) {
        if (v.product?.categoryId) categoryIds.add(v.product.categoryId);
        v.product?.tags?.forEach((t: string) => keywords.add(t.toLowerCase()));
      }
      for (const o of pastOrderCategories) {
        if (o.product?.categoryId) categoryIds.add(o.product.categoryId);
      }

      const orderedProductIds = await prisma.orderItem.findMany({
        where: { order: { userId } },
        select: { productId: true },
        distinct: ["productId"],
      });
      const excludedIds = new Set(orderedProductIds.map((o) => o.productId));

      const matchConditions: any[] = [];
      const kwArray = Array.from(keywords).filter((k) => k.length > 2);

      if (categoryIds.size > 0) {
        matchConditions.push({ categoryId: { in: Array.from(categoryIds) } });
      }
      if (kwArray.length > 0) {
        matchConditions.push({ name: { in: kwArray } });
        matchConditions.push({ tags: { hasSome: kwArray } });
        for (const kw of kwArray.slice(0, 5)) {
          matchConditions.push({ name: { contains: kw, mode: "insensitive" } });
        }
      }

      let suggestions: any[] = [];

      if (matchConditions.length > 0) {
        suggestions = await prisma.product.findMany({
          where: {
            isActive: true,
            isAvailable: true,
            id: { notIn: Array.from(excludedIds) },
            OR: matchConditions.slice(0, 15),
          },
          take: 12,
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
            _count: { select: { reviews: true } },
          },
        });
      }

      if (suggestions.length === 0) {
        suggestions = await getTrendingFallback();
      }

      const productIds = suggestions.map((p) => p.id);
      const ratingAggs = productIds.length > 0
        ? await prisma.review.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
            _avg: { rating: true },
          })
        : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return suggestions.map((p) => ({
        ...p,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        discountPercent: p.salePrice
          ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100)
          : 0,
        averageRating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
      }));
    }, 300_000); // Cache for 5 minutes

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get suggestions error:", error);
    const trending = await getTrendingFallback();
    return successResponse(res, trending);
  }
};

/**
 * Get recently viewed products for the logged-in user.
 * Returns up to 10 products with full details, ordered by most recent view.
 */
export const getRecentlyViewed = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return successResponse(res, []);
    }

    const enriched = await withCache(`recently-viewed:user:${req.user.userId}`, async () => {
      const userId = req.user!.userId;

      const views = await prisma.productView.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { productId: true },
      });

      const seen = new Set<string>();
      const uniqueIds: string[] = [];
      for (const v of views) {
        if (!seen.has(v.productId)) {
          seen.add(v.productId);
          uniqueIds.push(v.productId);
        }
      }

      const productIds = uniqueIds.slice(0, 10);
      if (productIds.length === 0) return [];

      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { reviews: true } },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      const ordered = productIds.map((id) => productMap.get(id)).filter(Boolean) as any[];

      const ratingAggs = productIds.length > 0
        ? await prisma.review.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
            _avg: { rating: true },
          })
        : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return ordered.map((p) => ({
        ...p,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        discountPercent: p.salePrice
          ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100)
          : 0,
        averageRating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
      }));
    }, 300_000); // Cache for 5 minutes

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get recently viewed error:", error);
    return successResponse(res, []);
  }
};

/**
 * Fallback: get trending or newest products when no history exists.
 */
async function getTrendingFallback() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const trending = await prisma.product.findMany({
    where: {
      isActive: true,
      isAvailable: true,
      orderItems: {
        some: {
          order: {
            createdAt: { gte: oneWeekAgo },
            status: { in: ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] },
          },
        },
      },
    },
    take: 12,
    orderBy: { orderItems: { _count: "desc" } },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { reviews: true } },
    },
  });

  if (trending.length > 0) return trending;

  // Fall back to newest
  return prisma.product.findMany({
    where: { isActive: true, isAvailable: true },
    take: 12,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { reviews: true } },
    },
  });
}
