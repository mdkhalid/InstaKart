import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { uploadImage } from "../services/upload.service";
import { withCache, clearCache } from "../utils/cache";
import { logger } from "../utils/logger";

// ── Helpers ────────────────────────────────────────────

/** Resolve a concrete storeId from query params: explicit storeId, or
 *  auto-detect the nearest serving store from lat/lng. Returns null when
 *  neither is available (caller falls back to Product-level fields). */
async function resolveStoreId(req: Request): Promise<string | null> {
  const storeId = req.query.storeId as string;
  if (storeId) return storeId;

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) return null;

  const stores = await prisma.store.findMany({ where: { isActive: true } });

  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  let nearest: { id: string; distance: number; deliveryRadiusKm: number } | null = null;
  for (const s of stores) {
    const dLat = toRad(lat - s.lat);
    const dLng = toRad(lng - s.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(s.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const dist = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist <= s.deliveryRadiusKm && (!nearest || dist < nearest.distance)) {
      nearest = { id: s.id, distance: dist, deliveryRadiusKm: s.deliveryRadiusKm };
    }
  }

  return nearest?.id ?? null;
}

function enrichProduct(
  p: any,
  sp?: { price: any; salePrice: any; stock: number; isAvailable: boolean } | null,
) {
  const price = sp ? Number(sp.price) : Number(p.price);
  const salePrice = sp
    ? sp.salePrice ? Number(sp.salePrice) : null
    : p.salePrice ? Number(p.salePrice) : null;
  const stock = sp ? sp.stock : p.stock;
  const isAvailable = sp ? sp.isAvailable : p.isAvailable;

  return {
    ...p,
    price,
    salePrice,
    costPrice: undefined,
    stock,
    lowStockAlert: sp ? (sp as any).lowStockAlert ?? p.lowStockAlert : p.lowStockAlert,
    isAvailable,
    discountPercent: salePrice ? Math.round(((price - salePrice) / price) * 100) : 0,
  };
}

// ── Public routes ──────────────────────────────────────

export const checkStock = async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return successResponse(res, {});
    }

    const storeId = await resolveStoreId(req);

    if (storeId) {
      const sps = await prisma.storeProduct.findMany({
        where: { storeId, productId: { in: productIds } },
        select: { productId: true, stock: true, isAvailable: true },
      });
      const stockMap: Record<string, { stock: number; isAvailable: boolean }> = {};
      for (const sp of sps) {
        stockMap[sp.productId] = { stock: sp.stock, isAvailable: sp.isAvailable };
      }
      return successResponse(res, stockMap);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, isAvailable: true },
    });
    const stockMap: Record<string, { stock: number; isAvailable: boolean }> = {};
    for (const p of products) {
      stockMap[p.id] = { stock: p.stock, isAvailable: p.isAvailable };
    }
    return successResponse(res, stockMap);
  } catch (error) {
    logger.error("Check stock error:", error);
    return errorResponse(res, "Failed to check stock", 500);
  }
};

export const listProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const { category, minPrice, maxPrice, search, sort, featured, inStock } = req.query;

    const storeId = await resolveStoreId(req);

    const productWhere: any = { isActive: true };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category as string } });
      if (cat) productWhere.categoryId = cat.id;
    }

    if (search) {
      productWhere.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { tags: { has: search as string } },
      ];
    }

    if (featured === "true") productWhere.isFeatured = true;

    const cacheKey = `products:list:${storeId || "global"}:${JSON.stringify({ page, limit, category, minPrice, maxPrice, search, sort, featured, inStock })}`;

    const enriched = await withCache(cacheKey, async () => {
      if (storeId) {
        // ── Store-scoped query via StoreProduct ──
        const spWhere: any = { storeId, product: productWhere };

        if (minPrice) spWhere.price = { ...spWhere.price, gte: parseFloat(minPrice as string) };
        if (maxPrice) spWhere.price = { ...spWhere.price, lte: parseFloat(maxPrice as string) };
        if (inStock === "true") spWhere.isAvailable = true;

        let orderBy: any = { createdAt: "desc" as const };
        switch (sort) {
          case "price_asc": orderBy = { price: "asc" as const }; break;
          case "price_desc": orderBy = { price: "desc" as const }; break;
          case "newest": orderBy = { product: { createdAt: "desc" as const } }; break;
          case "popular": orderBy = { product: { orderItems: { _count: "desc" as const } } }; break;
        }

        const [spRows, total] = await Promise.all([
          prisma.storeProduct.findMany({
            where: spWhere,
            skip,
            take: limit,
            orderBy,
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
                  _count: { select: { reviews: true } },
                },
              },
            },
          }),
          prisma.storeProduct.count({ where: spWhere }),
        ]);

        const products = spRows.map((sp) => ({
          ...sp.product,
          storeProduct: {
            price: Number(sp.price),
            salePrice: sp.salePrice ? Number(sp.salePrice) : null,
            stock: sp.stock,
            isAvailable: sp.isAvailable,
          },
        }));

        const productIds = products.map((p: any) => p.id);
        const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _avg: { rating: true },
        }) : [];
        const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

        return {
          products: products.map((p: any) => ({
            ...enrichProduct(p, p.storeProduct),
            rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
            reviewsCount: (p as any)._count?.reviews ?? 0,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
      }

      // ── Fallback: Product-level fields ──
      const where: any = { ...productWhere };
      if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) };
      if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) };
      if (inStock === "true") where.isAvailable = true;

      let orderBy: any = { createdAt: "desc" };
      switch (sort) {
        case "price_asc": orderBy = { price: "asc" }; break;
        case "price_desc": orderBy = { price: "desc" }; break;
        case "newest": orderBy = { createdAt: "desc" }; break;
        case "popular": orderBy = { orderItems: { _count: "desc" } }; break;
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
            _count: { select: { reviews: true } },
          },
        }),
        prisma.product.count({ where }),
      ]);

      const productIds = products.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return {
        products: products.map((p) => ({
          ...enrichProduct(p),
          rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
          reviewsCount: p._count?.reviews ?? 0,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }, 30_000);

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("List products error:", error);
    return errorResponse(res, "Failed to list products", 500);
  }
};

export const getTrendingProducts = async (req: Request, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    const cacheKey = `products:trending:${storeId || "global"}`;

    const enriched = await withCache(cacheKey, async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const trendingWhere: any = {
        isActive: true,
        orderItems: {
          some: {
            order: {
              createdAt: { gte: oneWeekAgo },
              status: { in: ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] },
            },
          },
        },
      };

      if (storeId) {
        trendingWhere.storeProducts = {
          some: { storeId, isAvailable: true },
        };
      } else {
        trendingWhere.isAvailable = true;
      }

      let products = await prisma.product.findMany({
        where: trendingWhere,
        take: 10,
        orderBy: { orderItems: { _count: "desc" } },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { reviews: true } },
          ...(storeId ? { storeProducts: { where: { storeId }, take: 1 } } : {}),
        },
      });

      if (products.length === 0) {
        const fallbackWhere: any = { isActive: true };
        if (storeId) {
          fallbackWhere.storeProducts = { some: { storeId, isAvailable: true } };
        } else {
          fallbackWhere.isAvailable = true;
        }
        products = await prisma.product.findMany({
          where: fallbackWhere,
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
            _count: { select: { reviews: true } },
            ...(storeId ? { storeProducts: { where: { storeId }, take: 1 } } : {}),
          },
        });
      }

      const productIds = products.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return products.map((p: any) => ({
        ...enrichProduct(p, storeId ? p.storeProducts?.[0] : null),
        rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
        reviewsCount: p._count?.reviews ?? 0,
      }));
    }, 60_000);

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get trending products error:", error);
    return errorResponse(res, "Failed to get trending products", 500);
  }
};

export const getFeatured = async (req: Request, res: Response) => {
  try {
    const storeId = await resolveStoreId(req);
    const cacheKey = `products:featured:${storeId || "global"}`;

    const enriched = await withCache(cacheKey, async () => {
      const productWhere: any = { isFeatured: true, isActive: true };
      if (storeId) {
        productWhere.storeProducts = { some: { storeId, isAvailable: true } };
      } else {
        productWhere.isAvailable = true;
      }

      const products = await prisma.product.findMany({
        where: productWhere,
        take: 10,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { reviews: true } },
          ...(storeId ? { storeProducts: { where: { storeId }, take: 1 } } : {}),
        },
      });

      const productIds = products.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return products.map((p: any) => ({
        ...enrichProduct(p, storeId ? p.storeProducts?.[0] : null),
        rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
        reviewsCount: p._count?.reviews ?? 0,
      }));
    }, 60_000);

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get featured error:", error);
    return errorResponse(res, "Failed to get featured products", 500);
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return successResponse(res, []);

    const storeId = await resolveStoreId(req);

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    };

    if (storeId) {
      where.storeProducts = { some: { storeId, isAvailable: true } };
    }

    const products = await prisma.product.findMany({
      where,
      take: 20,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, select: { url: true } },
        _count: { select: { reviews: true } },
        ...(storeId ? { storeProducts: { where: { storeId }, take: 1 } } : {}),
      },
    });

    const productIds = products.map((p) => p.id);
    const ratingAggs = await prisma.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

    const enriched = products.map((p: any) => ({
      ...enrichProduct(p, storeId ? p.storeProducts?.[0] : null),
      averageRating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
    }));

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Search products error:", error);
    return errorResponse(res, "Failed to search products", 500);
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const storeId = await resolveStoreId(req);

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" } },
        ...(storeId ? { storeProducts: { where: { storeId }, take: 1 } } : {}),
      },
    });

    if (!product || !product.isActive) {
      return errorResponse(res, "Product not found", 404);
    }

    const sp = storeId ? (product as any).storeProducts?.[0] : null;

    // Get review stats
    const reviewAgg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });

    const enriched = {
      ...enrichProduct(product, sp),
      costPrice: sp ? (sp.costPrice ? Number(sp.costPrice) : null) : (product.costPrice ? Number(product.costPrice) : null),
      averageRating: reviewAgg._avg.rating ? Math.round(Number(reviewAgg._avg.rating) * 10) / 10 : 0,
      totalReviews: reviewAgg._count,
    };

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get product error:", error);
    return errorResponse(res, "Failed to get product", 500);
  }
};

// ── Admin routes (unchanged — operate on Product-level fields) ────────────

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, shortDesc, sku, barcode, price, salePrice, costPrice, stock, lowStockAlert, unit, categoryId, tags, attributes, isFeatured, storeProducts } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse(res, "Product with this name already exists", 409);
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name, slug, description, shortDesc, sku, barcode,
          price, salePrice, costPrice,
          stock, lowStockAlert, unit, categoryId,
          tags: tags || [], attributes, isFeatured: isFeatured || false,
          isAvailable: stock > 0,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: true,
        },
      });

      if (storeProducts && storeProducts.length > 0) {
        for (const sp of storeProducts) {
          await tx.storeProduct.create({
            data: {
              storeId: sp.storeId,
              productId: newProduct.id,
              price: sp.price,
              salePrice: sp.salePrice ?? null,
              costPrice: sp.costPrice ?? null,
              stock: sp.stock,
              lowStockAlert: sp.lowStockAlert,
              isAvailable: sp.isAvailable,
            },
          });
        }
      }

      return newProduct;
    });

    clearCache("products:");

    return successResponse(res, { ...product, price: Number(product.price) }, "Product created", 201);
  } catch (error) {
    logger.error("Create product error:", error);
    return errorResponse(res, "Failed to create product", 500);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { storeProducts, ...data } = req.body;

    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    if (data.stock !== undefined) {
      data.isAvailable = data.stock > 0;
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: true,
        },
      });

      if (storeProducts && storeProducts.length > 0) {
        for (const sp of storeProducts) {
          await tx.storeProduct.upsert({
            where: { storeId_productId: { storeId: sp.storeId, productId: id } },
            update: {
              price: sp.price,
              salePrice: sp.salePrice ?? null,
              costPrice: sp.costPrice ?? null,
              stock: sp.stock,
              lowStockAlert: sp.lowStockAlert,
              isAvailable: sp.isAvailable,
            },
            create: {
              storeId: sp.storeId,
              productId: id,
              price: sp.price,
              salePrice: sp.salePrice ?? null,
              costPrice: sp.costPrice ?? null,
              stock: sp.stock,
              lowStockAlert: sp.lowStockAlert,
              isAvailable: sp.isAvailable,
            },
          });
        }
      }

      return updated;
    });

    clearCache("products:");

    return successResponse(res, product, "Product updated");
  } catch (error) {
    logger.error("Update product error:", error);
    return errorResponse(res, "Failed to update product", 500);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    clearCache("products:");
    return successResponse(res, null, "Product deactivated");
  } catch (error) {
    logger.error("Delete product error:", error);
    return errorResponse(res, "Failed to delete product", 500);
  }
};

export const uploadProductImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return errorResponse(res, "No files provided", 400);
    }

    const images = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadImage(files[i].buffer, "products");
      images.push({
        productId: id,
        url,
        altText: files[i].originalname,
        isPrimary: i === 0,
        sortOrder: i,
      });
    }

    await prisma.productImage.createMany({ data: images });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    clearCache("products:");

    return successResponse(res, product, "Images uploaded");
  } catch (error) {
    logger.error("Upload images error:", error);
    return errorResponse(res, "Failed to upload images", 500);
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    await prisma.productImage.delete({ where: { id: imageId } });
    return successResponse(res, null, "Image deleted");
  } catch (error) {
    logger.error("Delete image error:", error);
    return errorResponse(res, "Failed to delete image", 500);
  }
};
