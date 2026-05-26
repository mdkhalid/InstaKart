import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import {
  getDashboard, getAllOrders, updateOrderStatus,
  getAllUsers, getUserDetail, changeUserRole, toggleUserStatus, deleteUser,
} from "../controllers/admin.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetail);
router.put("/users/:id/role", changeUserRole);
router.put("/users/:id/status", toggleUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
