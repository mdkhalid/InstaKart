import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createOrderSchema } from "../validators/order.validator";
import { createOrder, getMyOrders, getOrder, getReorderPreview, cancelOrder } from "../controllers/order.controller";
import { createOrderIssue, getOrderIssues } from "../controllers/issue.controller";

const router = Router();

router.use(authenticate);

router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getMyOrders);
router.get("/:id/reorder", getReorderPreview);
router.get("/:id", getOrder);
router.post("/:id/cancel", cancelOrder);
router.post("/:id/issues", createOrderIssue);
router.get("/:id/issues", getOrderIssues);

export default router;
