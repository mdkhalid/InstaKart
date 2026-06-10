import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { uploadImage } from "../services/upload.service";
import { withCache, clearCache } from "../utils/cache";
import { logger } from "../utils/logger";

// Public routes
export const checkStock = async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return successResponse(res, {});
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

    const where: any = { isActive: true };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category as string } });
      if (cat) where.categoryId = cat.id;
    }

    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { tags: { has: search as string } },
      ];
    }

    if (featured === "true") where.isFeatured = true;
    if (inStock === "true") where.isAvailable = true;

    let orderBy: any = { createdAt: "desc" };
    switch (sort) {
      case "price_asc": orderBy = { price: "asc" }; break;
      case "price_desc": orderBy = { price: "desc" }; break;
      case "newest": orderBy = { createdAt: "desc" }; break;
      case "popular": orderBy = { orderItems: { _count: "desc" } }; break;
    }

    const cacheKey = `products:list:${JSON.stringify({ page, limit, category, minPrice, maxPrice, search, sort, featured, inStock })}`;
    const enriched = await withCache(cacheKey, async () => {
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

      // Get average ratings for all products in one query
      const productIds = products.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return {
        products: products.map((p) => ({
          ...p,
          price: Number(p.price),
          salePrice: p.salePrice ? Number(p.salePrice) : null,
          discountPercent: p.salePrice ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0,
          rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
          reviewsCount: p._count?.reviews ?? 0,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }, 30_000); // Cache for 30 seconds

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("List products error:", error);
    return errorResponse(res, "Failed to list products", 500);
  }
};

export const getTrendingProducts = async (req: Request, res: Response) => {
  try {
    const enriched = await withCache("products:trending", async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const trendingProducts = await prisma.product.findMany({
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
        take: 10,
        orderBy: { orderItems: { _count: "desc" } },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { reviews: true } },
        },
      });

      const productsToReturn = trendingProducts.length > 0
        ? trendingProducts
        : await prisma.product.findMany({
            where: { isActive: true, isAvailable: true },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
              _count: { select: { reviews: true } },
            },
          });

      const productIds = productsToReturn.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return productsToReturn.map((p) => ({
        ...p,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        discountPercent: p.salePrice ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0,
        rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
        reviewsCount: p._count?.reviews ?? 0,
      }));
    }, 60_000); // Cache for 60 seconds (trending changes slowly)

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get trending products error:", error);
    return errorResponse(res, "Failed to get trending products", 500);
  }
};

export const getFeatured = async (req: Request, res: Response) => {
  try {
    const enriched = await withCache("products:featured", async () => {
      const products = await prisma.product.findMany({
        where: { isFeatured: true, isActive: true, isAvailable: true },
        take: 10,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { reviews: true } },
        },
      });

      const productIds = products.map((p) => p.id);
      const ratingAggs = productIds.length > 0 ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
      }) : [];
      const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

      return products.map((p) => ({
        ...p,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        discountPercent: p.salePrice ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0,
        rating: ratingMap.get(p.id) ? Math.round(Number(ratingMap.get(p.id)) * 10) / 10 : 0,
        reviewsCount: p._count?.reviews ?? 0,
      }));
    }, 60_000); // Cache for 60 seconds

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

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, select: { url: true } },
        _count: { select: { reviews: true } },
      },
    });

    const productIds = products.map((p) => p.id);
    const ratingAggs = await prisma.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

    const enriched = products.map((p) => ({
      ...p,
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      discountPercent: p.salePrice
        ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100)
        : 0,
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

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product || !product.isActive) {
      return errorResponse(res, "Product not found", 404);
    }

    // Get review stats
    const reviewAgg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });

    const enriched = {
      ...product,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      discountPercent: product.salePrice
        ? Math.round(((Number(product.price) - Number(product.salePrice)) / Number(product.price)) * 100)
        : 0,
      averageRating: reviewAgg._avg.rating ? Math.round(Number(reviewAgg._avg.rating) * 10) / 10 : 0,
      totalReviews: reviewAgg._count,
    };

    return successResponse(res, enriched);
  } catch (error) {
    logger.error("Get product error:", error);
    return errorResponse(res, "Failed to get product", 500);
  }
};

// Admin routes
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, shortDesc, sku, barcode, price, salePrice, costPrice, stock, lowStockAlert, unit, categoryId, tags, attributes, isFeatured } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse(res, "Product with this name already exists", 409);
    }

    const product = await prisma.product.create({
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

    // Invalidate product list caches since data changed
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
    const data: any = { ...req.body };

    // If name changed, update slug
    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    if (data.stock !== undefined) {
      data.isAvailable = data.stock > 0;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: true,
      },
    });

    // Invalidate product list caches since data changed
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
    // Invalidate product list caches since data changed
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

    // Invalidate product list caches since images changed
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
