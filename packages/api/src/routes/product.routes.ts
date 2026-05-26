import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { upload } from "../middleware/upload.middleware";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";
import {
  listProducts, getFeatured, searchProducts, getProduct,
  createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage,
} from "../controllers/product.controller";

const router = Router();

// Public routes
router.get("/", listProducts);
router.get("/featured", getFeatured);
router.get("/search", searchProducts);
router.get("/:slug", getProduct);

// Admin routes
router.post("/", authenticate, requireAdmin, validate(createProductSchema), createProduct);
router.put("/:id", authenticate, requireAdmin, validate(updateProductSchema), updateProduct);
router.delete("/:id", authenticate, requireAdmin, deleteProduct);
router.post("/:id/images", authenticate, requireAdmin, upload.array("images", 10), uploadProductImages);
router.delete("/:id/images/:imageId", authenticate, requireAdmin, deleteProductImage);

export default router;
