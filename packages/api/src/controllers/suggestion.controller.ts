import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { withCache, clearCache } from "../utils/cache";

/**
 * Resolve either userId or visitorId from the request.
 * Returns { userId?, visitorId? } — at least one will be present.
 */
function resolveIdentity(req: Request): { userId?: string; visitorId?: string } {
  const userId = (req as any).user?.userId as string | undefined;
  const visitorId = (req.headers["x-visitor-id"] as string) || undefined;
  return { userId, visitorId };
}

/**
 * Ensure a Visitor record exists for the given visitorId.
 */
async function ensureVisitor(visitorId: string, req: Request) {
  const existing = await prisma.visitor.findUnique({ where: { visitorId } });
  if (existing) return existing;

  return prisma.visitor.create({
    data: {
      visitorId,
      sessionId: (req.headers["x-session-id"] as string) || null,
      userAgent: (req.headers["user-agent"] as string)?.slice(0, 500) || null,
    },
  });
}

// ─────────────────────── TRACKING ENDPOINTS ───────────────────────

/**
 * POST /suggestions/track-search
 * Log a search query. Works for both authenticated and anonymous users.
 */
export const trackSearch = async (req: Request, res: Response) => {
  try {
    const { query, resultsCount } = req.body;
    if (!query) return successResponse(res, null);

    const { userId, visitorId } = resolveIdentity(req);

    const data: any = {
      query: query.trim().toLowerCase().slice(0, 200),
      resultsCount: resultsCount || 0,
    };

    if (userId) {
      data.userId = userId;
    } else if (visitorId) {
      const visitor = await ensureVisitor(visitorId, req);
      data.visitorId = visitor.id;
    } else {
      return successResponse(res, null); // no identity, silently ignore
    }

    await prisma.searchActivity.create({ data });
    return successResponse(res, null);
  } catch {
    return successResponse(res, null); // never fail on tracking
  }
};

/**
 * POST /suggestions/track-view
 * Log a product view. Works for both authenticated and anonymous users.
 */
export const trackView = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    if (!productId) return successResponse(res, null);

    const { userId, visitorId } = resolveIdentity(req);

    const data: any = { productId };

    if (userId) {
      data.userId = userId;
    } else if (visitorId) {
      const visitor = await ensureVisitor(visitorId, req);
      data.visitorId = visitor.id;
    } else {
      return successResponse(res, null);
    }

    await prisma.productView.create({ data });
    return successResponse(res, null);
  } catch {
    return successResponse(res, null);
  }
};

/**
 * POST /suggestions/track-event
 * Generic funnel event tracker. Works for both authenticated and anonymous users.
 * Event types: product_click, add_to_cart, remove_from_cart, checkout_start, checkout_complete
 */
export const trackEvent = async (req: Request, res: Response) => {
  try {
    const { eventType, productId, metadata } = req.body;
    if (!eventType) return successResponse(res, null);

    const { userId, visitorId } = resolveIdentity(req);

    const data: any = {
      eventType: eventType.slice(0, 50),
      productId: productId || null,
      metadata: metadata || undefined,
    };

    if (userId) {
      data.userId = userId;
    } else if (visitorId) {
      const visitor = await ensureVisitor(visitorId, req);
      data.visitorId = visitor.id;
    } else {
      return successResponse(res, null);
    }

    await prisma.trackingEvent.create({ data });
    return successResponse(res, null);
  } catch {
    return successResponse(res, null);
  }
};

// ─────────────────────── MERGE ENDPOINT ───────────────────────

/**
 * POST /suggestions/merge
 * Transfer anonymous visitor data to the authenticated user.
 * Called after login/register. Requires JWT auth.
 */
export const mergeVisitorData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const visitorId = (req.headers["x-visitor-id"] as string) || undefined;

    if (!userId) return errorResponse(res, "Authentication required", 401);
    if (!visitorId) return successResponse(res, { merged: false }); // nothing to merge

    const visitor = await prisma.visitor.findUnique({ where: { visitorId } });
    if (!visitor || visitor.userId) {
      return successResponse(res, { merged: false });
    }

    // Merge search activities
    await prisma.searchActivity.updateMany({
      where: { visitorId: visitor.id, userId: null },
      data: { userId },
    });

    // Merge product views
    await prisma.productView.updateMany({
      where: { visitorId: visitor.id, userId: null },
      data: { userId },
    });

    // Merge tracking events
    await prisma.trackingEvent.updateMany({
      where: { visitorId: visitor.id, userId: null },
      data: { userId },
    });

    // Mark visitor as merged
    await prisma.visitor.update({
      where: { id: visitor.id },
      data: { userId, mergedAt: new Date() },
    });

    // Clear suggestion caches for this user
    await clearCache(`suggestions:user:${userId}`);
    await clearCache(`recently-viewed:user:${userId}`);

    return successResponse(res, { merged: true });
  } catch (error) {
    console.error("Merge visitor data error:", error);
    return successResponse(res, { merged: false }); // never fail
  }
};

// ─────────────────────── SUGGESTIONS ENDPOINT ───────────────────────

/**
 * GET /suggestions
 * Personalized product suggestions. Works for both authenticated and anonymous users.
 *
 * For authenticated users:
 * 1. Recent search queries (extract keywords, find matching products)
 * 2. Categories from past order items
 * 3. Categories from recently viewed products
 * 4. Collaborative filtering: products bought by users with similar history
 *
 * For anonymous users: returns trending products.
 * Falls back to trending if no history exists.
 */
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const { userId } = resolveIdentity(req);

    if (!userId) {
      const trending = await getTrendingFallback();
      return successResponse(res, trending);
    }

    const enriched = await withCache(`suggestions:user:${userId}`, async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentSearches, recentViews, pastOrderCategories, pastOrderItems] = await Promise.all([
        prisma.searchActivity.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { query: true, createdAt: true },
        }),
        prisma.productView.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            product: { select: { categoryId: true, tags: true } },
            createdAt: true,
          },
        }),
        prisma.orderItem.findMany({
          where: {
            order: { userId, status: { in: ["DELIVERED", "OUT_FOR_DELIVERY", "CONFIRMED"] } },
          },
          select: { product: { select: { categoryId: true } } },
          take: 50,
          orderBy: { order: { createdAt: "desc" } },
        }),
        prisma.orderItem.findMany({
          where: {
            order: { userId, status: { in: ["DELIVERED", "OUT_FOR_DELIVERY", "CONFIRMED"] } },
          },
          select: { productId: true },
          take: 100,
          orderBy: { order: { createdAt: "desc" } },
        }),
      ]);

      // ── Recency-weighted keywords and categories ──
      const keywords = new Map<string, number>(); // keyword → weight
      const categoryWeights = new Map<string, number>(); // categoryId → weight

      const now = Date.now();
      const DAY_MS = 86400000;

      for (const s of recentSearches) {
        const daysAgo = (now - new Date(s.createdAt).getTime()) / DAY_MS;
        const recencyWeight = Math.max(0.1, 1 - daysAgo / 30); // linear decay over 30 days
        s.query
          .split(/\s+/)
          .filter((w) => w.length > 1)
          .forEach((w) => {
            keywords.set(w, (keywords.get(w) || 0) + recencyWeight);
          });
      }

      for (const v of recentViews) {
        const daysAgo = (now - new Date(v.createdAt).getTime()) / DAY_MS;
        const recencyWeight = Math.max(0.1, 1 - daysAgo / 30);
        if (v.product?.categoryId) {
          categoryWeights.set(
            v.product.categoryId,
            (categoryWeights.get(v.product.categoryId) || 0) + recencyWeight
          );
        }
        v.product?.tags?.forEach((t: string) => {
          const lower = t.toLowerCase();
          keywords.set(lower, (keywords.get(lower) || 0) + recencyWeight * 0.5);
        });
      }

      for (const o of pastOrderCategories) {
        if (o.product?.categoryId) {
          categoryWeights.set(o.product.categoryId, (categoryWeights.get(o.product.categoryId) || 0) + 2); // orders weighted 2x
        }
      }

      // ── Products to exclude (already purchased) ──
      const excludedIds = new Set(pastOrderItems.map((o) => o.productId));

      // ── Build match conditions with weights ──
      const matchConditions: any[] = [];
      const topCategories = Array.from(categoryWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const topKeywords = Array.from(keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([kw]) => kw)
        .filter((kw) => kw.length > 2);

      if (topCategories.length > 0) {
        matchConditions.push({ categoryId: { in: topCategories } });
      }
      if (topKeywords.length > 0) {
        matchConditions.push({ tags: { hasSome: topKeywords } });
        for (const kw of topKeywords.slice(0, 5)) {
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
            _count: { select: { reviews: true, orderItems: true } },
          },
        });
      }

      // ── Collaborative filtering: "users who bought X also bought Y" ──
      if (suggestions.length < 12 && pastOrderItems.length > 0) {
        const purchasedProductIds = [...excludedIds];
        const recentPurchaseIds = purchasedProductIds.slice(0, 10);

        // Find other users who purchased the same products
        const similarUsers = await prisma.orderItem.groupBy({
          by: ["orderId"],
          where: {
            productId: { in: recentPurchaseIds },
            order: {
              userId: { not: userId },
              status: { in: ["DELIVERED", "OUT_FOR_DELIVERY", "CONFIRMED"] },
            },
          },
          _count: { orderId: true },
          having: { orderId: { _count: { gte: 2 } } }, // at least 2 products in common
          orderBy: { _count: { orderId: "desc" } },
          take: 20,
        });

        const similarOrderIds = similarUsers.map((s) => s.orderId);

        if (similarOrderIds.length > 0) {
          const collaborativeProducts = await prisma.orderItem.findMany({
            where: {
              orderId: { in: similarOrderIds },
              productId: { notIn: Array.from(excludedIds) },
            },
            select: { productId: true },
            distinct: ["productId"],
          });

          const collaborativeIds = collaborativeProducts
            .map((p) => p.productId)
            .filter((id) => !suggestions.some((s) => s.id === id))
            .slice(0, 6);

          if (collaborativeIds.length > 0) {
            const extraProducts = await prisma.product.findMany({
              where: { id: { in: collaborativeIds }, isActive: true, isAvailable: true },
              include: {
                category: { select: { id: true, name: true, slug: true } },
                images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
                _count: { select: { reviews: true, orderItems: true } },
              },
            });
            suggestions = [...suggestions, ...extraProducts];
          }
        }
      }

      if (suggestions.length === 0) {
        suggestions = await getTrendingFallback();
      }

      // ── Enrich with ratings and popularity score ──
      const productIds = suggestions.map((p) => p.id);
      const [ratingAggs, viewCounts, orderCounts] = await Promise.all([
        productIds.length > 0
          ? prisma.review.groupBy({
              by: ["productId"],
              where: { productId: { in: productIds } },
              _avg: { rating: true },
              _count: { rating: true },
            })
          : [],
        productIds.length > 0
          ? prisma.productView.groupBy({
              by: ["productId"],
              where: { productId: { in: productIds }, createdAt: { gte: sevenDaysAgo } },
              _count: { productId: true },
            })
          : [],
        productIds.length > 0
          ? prisma.orderItem.groupBy({
              by: ["productId"],
              where: { productId: { in: productIds } },
              _count: { productId: true },
            })
          : [],
      ]);

      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));
      const ratingCountMap = new Map(ratingAggs.map((r) => [r.productId, r._count.rating]));
      const viewMap = new Map(viewCounts.map((v) => [v.productId, v._count.productId]));
      const orderMap = new Map(orderCounts.map((o) => [o.productId, o._count.productId]));

      return suggestions
        .map((p) => {
          const rating = ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0;
          const reviewsCount = ratingCountMap.get(p.id) || 0;
          const views = viewMap.get(p.id) || 0;
          const orders = orderMap.get(p.id) || 0;

          // Popularity score: orders (3x) + views (1x) + rating bonus
          const popularityScore = orders * 3 + views + (rating > 4 ? 5 : rating > 3 ? 2 : 0);

          return {
            ...p,
            price: Number(p.price),
            salePrice: p.salePrice ? Number(p.salePrice) : null,
            discountPercent: p.salePrice
              ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100)
              : 0,
            rating,
            reviewsCount,
            popularityScore,
          };
        })
        .sort((a, b) => b.popularityScore - a.popularityScore);
    }, 300_000); // Cache for 5 minutes

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get suggestions error:", error);
    const trending = await getTrendingFallback();
    return successResponse(res, trending);
  }
};

/**
 * GET /suggestions/recently-viewed
 * Get recently viewed products. Works for both authenticated and anonymous users.
 * For anonymous users, returns trending products instead.
 */
export const getRecentlyViewed = async (req: Request, res: Response) => {
  try {
    const { userId, visitorId } = resolveIdentity(req);

    // For anonymous users, return trending
    if (!userId && !visitorId) {
      const trending = await getTrendingFallback();
      return successResponse(res, trending);
    }

    const cacheKey = userId
      ? `recently-viewed:user:${userId}`
      : `recently-viewed:visitor:${visitorId}`;

    const enriched = await withCache(cacheKey, async () => {
      let productIds: string[] = [];

      if (userId) {
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
        for (const v of views) {
          if (!seen.has(v.productId)) {
            seen.add(v.productId);
            productIds.push(v.productId);
          }
        }
      } else if (visitorId) {
        const visitor = await prisma.visitor.findUnique({ where: { visitorId } });
        if (visitor) {
          const views = await prisma.productView.findMany({
            where: {
              visitorId: visitor.id,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: { productId: true },
          });

          const seen = new Set<string>();
          for (const v of views) {
            if (!seen.has(v.productId)) {
              seen.add(v.productId);
              productIds.push(v.productId);
            }
          }
        }
      }

      productIds = productIds.slice(0, 10);
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
        rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
        reviewsCount: p._count?.reviews ?? 0,
      }));
    }, 300_000);

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get recently viewed error:", error);
    return successResponse(res, []);
  }
};

// ─────────────────────── TRENDING FALLBACK ───────────────────────

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
      _count: { select: { reviews: true, orderItems: true } },
    },
  });

  if (trending.length > 0) return trending;

  return prisma.product.findMany({
    where: { isActive: true, isAvailable: true },
    take: 12,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { reviews: true, orderItems: true } },
    },
  });
}
