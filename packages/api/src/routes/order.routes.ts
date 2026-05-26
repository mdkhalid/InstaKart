import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createOrder, getMyOrders, getOrder, cancelOrder } from "../controllers/order.controller";

const router = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrder);
router.post("/:id/cancel", cancelOrder);

export default router;
