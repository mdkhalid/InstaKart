import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createStoreSchema, updateStoreSchema, setStoreProductSchema } from "../validators/store.validator";
import {
  listStores, getStore, getNearbyStores, verifyStoreServes,
  createStore, updateStore, deleteStore,
  setStoreProducts, getStoreProducts,
} from "../controllers/store.controller";

const router = Router();

// Public routes
router.get("/nearby", getNearbyStores);
router.get("/", listStores);
router.get("/:id", getStore);
router.get("/:id/verify", verifyStoreServes);

// Admin routes
router.post("/", authenticate, requireAdmin, validate(createStoreSchema), createStore);
router.put("/:id", authenticate, requireAdmin, validate(updateStoreSchema), updateStore);
router.delete("/:id", authenticate, requireAdmin, deleteStore);

// Admin: store product inventory
router.get("/:id/products", authenticate, requireAdmin, getStoreProducts);
router.post("/products", authenticate, requireAdmin, validate(setStoreProductSchema), setStoreProducts);

export default router;
