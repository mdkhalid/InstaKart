import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getCart, addItem, updateItem, removeItem, clearCart, applyCoupon } from "../controllers/cart.controller";

const router = Router();

router.use(authenticate);

router.get("/", getCart);
router.post("/items", addItem);
router.put("/items/:productId", updateItem);
router.delete("/items/:productId", removeItem);
router.delete("/", clearCart);
router.post("/coupon", applyCoupon);

export default router;
