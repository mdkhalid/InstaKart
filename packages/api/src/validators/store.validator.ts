import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(2).max(200),
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(1).max(20),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").optional(),
  deliveryRadiusKm: z.number().min(0).default(5),
  deliveryFee: z.number().min(0).default(0),
  minOrderAmount: z.number().min(0).default(0),
  isActive: z.boolean().optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

export const setStoreProductSchema = z.object({
  storeId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    price: z.number().positive(),
    salePrice: z.number().positive().optional().nullable(),
    costPrice: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0).default(0),
    lowStockAlert: z.number().int().min(0).default(10),
    isAvailable: z.boolean().default(true),
  })).min(1),
});
