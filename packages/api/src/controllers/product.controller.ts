import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { uploadImage, deleteImage } from "../services/upload.service";

// Public routes
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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const enriched = products.map((p) => ({
      ...p,
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      discountPercent: p.salePrice ? Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100) : 0,
    }));

    return successResponse(res, {
      products: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List products error:", error);
    return errorResponse(res, "Failed to list products", 500);
  }
};

export const getFeatured = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isFeatured: true, isActive: true, isAvailable: true },
      take: 10,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { url: true, isPrimary: true, altText: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    const enriched = products.map((p) => ({
      ...p,
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
    }));

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get featured error:", error);
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
      },
    });

    return successResponse(res, products);
  } catch (error) {
    console.error("Search products error:", error);
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

    const enriched = {
      ...product,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      discountPercent: product.salePrice
        ? Math.round(((Number(product.price) - Number(product.salePrice)) / Number(product.price)) * 100)
        : 0,
    };

    return successResponse(res, enriched);
  } catch (error) {
    console.error("Get product error:", error);
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

    return successResponse(res, { ...product, price: Number(product.price) }, "Product created", 201);
  } catch (error) {
    console.error("Create product error:", error);
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

    return successResponse(res, product, "Product updated");
  } catch (error) {
    console.error("Update product error:", error);
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
    return successResponse(res, null, "Product deactivated");
  } catch (error) {
    console.error("Delete product error:", error);
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

    return successResponse(res, product, "Images uploaded");
  } catch (error) {
    console.error("Upload images error:", error);
    return errorResponse(res, "Failed to upload images", 500);
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    await prisma.productImage.delete({ where: { id: imageId } });
    return successResponse(res, null, "Image deleted");
  } catch (error) {
    console.error("Delete image error:", error);
    return errorResponse(res, "Failed to delete image", 500);
  }
};
