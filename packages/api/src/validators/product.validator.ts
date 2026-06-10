import { z } from "zod";
import { ProductUnit } from "@instamart/types";

const storeProductSchema = z.object({
  storeId: z.string(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional().nullable(),
  costPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(10),
  isAvailable: z.boolean().default(true),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  shortDesc: z.string().max(300).optional(),
  sku: z.string().min(1).max(50),
  barcode: z.string().optional(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional().nullable(),
  costPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(10),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.PCS),
  categoryId: z.string(),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.any()).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().optional(),
  storeProducts: z.array(storeProductSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();
