import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createOrder, getMyOrders, getOrder, getReorderPreview, cancelOrder } from "../controllers/order.controller";
import { createOrderIssue, getOrderIssues } from "../controllers/issue.controller";

const router = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id/reorder", getReorderPreview);
router.get("/:id", getOrder);
router.post("/:id/cancel", cancelOrder);
router.post("/:id/issues", createOrderIssue);
router.get("/:id/issues", getOrderIssues);

export default router;
