import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/category.controller";

const router = Router();

router.get("/", listCategories);
router.post("/", authenticate, requireAdmin, createCategory);
router.put("/:id", authenticate, requireAdmin, updateCategory);
router.delete("/:id", authenticate, requireAdmin, deleteCategory);

export default router;
