import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Public: find stores that can serve a given location
export const getNearbyStores = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return errorResponse(res, "lat and lng query params are required", 400);
    }

    const stores = await prisma.store.findMany({
      where: { isActive: true },
    });

    const serving = stores
      .map((s) => ({
        ...s,
        distance: haversineDistance(lat, lng, s.lat, s.lng),
        deliveryFee: Number(s.deliveryFee),
        minOrderAmount: Number(s.minOrderAmount),
      }))
      .filter((s) => s.distance <= s.deliveryRadiusKm)
      .sort((a, b) => a.distance - b.distance);

    return successResponse(res, serving);
  } catch (error) {
    logger.error("Get nearby stores error:", error);
    return errorResponse(res, "Failed to get nearby stores", 500);
  }
};

// Public: verify if a specific store serves a location
export const verifyStoreServes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return errorResponse(res, "lat and lng query params are required", 400);
    }

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store || !store.isActive) {
      return errorResponse(res, "Store not found", 404);
    }

    const distance = haversineDistance(lat, lng, store.lat, store.lng);
    const serves = distance <= store.deliveryRadiusKm;

    return successResponse(res, {
      serves,
      distance: Math.round(distance * 10) / 10,
      deliveryRadiusKm: store.deliveryRadiusKm,
      ...(serves ? {} : { message: "We don't serve your area from this store. Please choose a nearer store." }),
    });
  } catch (error) {
    logger.error("Verify store serves error:", error);
    return errorResponse(res, "Failed to verify store", 500);
  }
};

// Public: list all active stores
export const listStores = async (_req: Request, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    const enriched = stores.map((s) => ({
      ...s,
      deliveryFee: Number(s.deliveryFee),
      minOrderAmount: Number(s.minOrderAmount),
    }));
    return successResponse(res, enriched);
  } catch (error) {
    logger.error("List stores error:", error);
    return errorResponse(res, "Failed to list stores", 500);
  }
};

// Public: get single store
export const getStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return errorResponse(res, "Store not found", 404);
    return successResponse(res, {
      ...store,
      deliveryFee: Number(store.deliveryFee),
      minOrderAmount: Number(store.minOrderAmount),
    });
  } catch (error) {
    logger.error("Get store error:", error);
    return errorResponse(res, "Failed to get store", 500);
  }
};

// Admin: create store
export const createStore = async (req: Request, res: Response) => {
  try {
    const { name, addressLine1, addressLine2, city, state, pincode, lat, lng, phone, email, openingTime, closingTime, deliveryRadiusKm, deliveryFee, minOrderAmount } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await prisma.store.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse(res, "Store with this name already exists", 409);
    }

    const store = await prisma.store.create({
      data: {
        name, slug, addressLine1, addressLine2, city, state, pincode,
        lat, lng, phone, email, openingTime, closingTime,
        deliveryRadiusKm, deliveryFee, minOrderAmount,
      },
    });

    return successResponse(res, {
      ...store,
      deliveryFee: Number(store.deliveryFee),
      minOrderAmount: Number(store.minOrderAmount),
    }, "Store created", 201);
  } catch (error: any) {
    if (error.code === "P2002") return errorResponse(res, "Store with this name already exists", 409);
    logger.error("Create store error:", error);
    return errorResponse(res, "Failed to create store", 500);
  }
};

// Admin: update store
export const updateStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: any = { ...req.body };

    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    const store = await prisma.store.update({
      where: { id },
      data,
    });

    return successResponse(res, {
      ...store,
      deliveryFee: Number(store.deliveryFee),
      minOrderAmount: Number(store.minOrderAmount),
    }, "Store updated");
  } catch (error) {
    logger.error("Update store error:", error);
    return errorResponse(res, "Failed to update store", 500);
  }
};

// Admin: delete store (soft)
export const deleteStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.store.update({ where: { id }, data: { isActive: false } });
    return successResponse(res, null, "Store deactivated");
  } catch (error) {
    logger.error("Delete store error:", error);
    return errorResponse(res, "Failed to delete store", 500);
  }
};

// Admin: set products for a store (upsert StoreProduct rows)
export const setStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId, items } = req.body;

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return errorResponse(res, "Store not found", 404);

    // Validate all product IDs exist
    const productIds = items.map((i: any) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missing = productIds.filter((id: string) => !existingProductIds.has(id));
    if (missing.length > 0) {
      return errorResponse(res, `Products not found: ${missing.join(", ")}`, 400);
    }

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.storeProduct.upsert({
          where: { storeId_productId: { storeId, productId: item.productId } },
          update: {
            price: item.price,
            salePrice: item.salePrice ?? null,
            costPrice: item.costPrice ?? null,
            stock: item.stock,
            lowStockAlert: item.lowStockAlert,
            isAvailable: item.isAvailable,
          },
          create: {
            storeId,
            productId: item.productId,
            price: item.price,
            salePrice: item.salePrice ?? null,
            costPrice: item.costPrice ?? null,
            stock: item.stock,
            lowStockAlert: item.lowStockAlert,
            isAvailable: item.isAvailable,
          },
        })
      )
    );

    return successResponse(res, null, "Store products updated");
  } catch (error) {
    logger.error("Set store products error:", error);
    return errorResponse(res, "Failed to set store products", 500);
  }
};

// Admin: get products for a store (with StoreProduct info)
export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const skip = (page - 1) * limit;

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return errorResponse(res, "Store not found", 404);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
          storeProducts: {
            where: { storeId: id },
            select: {
              price: true, salePrice: true, costPrice: true,
              stock: true, lowStockAlert: true, isAvailable: true,
            },
          },
        },
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    const enriched = products.map((p) => {
      const sp = p.storeProducts[0];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        unit: p.unit,
        imageUrl: (p as any).images?.[0]?.url || null,
        storeProduct: sp
          ? {
              price: Number(sp.price),
              salePrice: sp.salePrice ? Number(sp.salePrice) : null,
              costPrice: sp.costPrice ? Number(sp.costPrice) : null,
              stock: sp.stock,
              lowStockAlert: sp.lowStockAlert,
              isAvailable: sp.isAvailable,
            }
          : null,
      };
    });

    return successResponse(res, {
      products: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Get store products error:", error);
    return errorResponse(res, "Failed to get store products", 500);
  }
};
