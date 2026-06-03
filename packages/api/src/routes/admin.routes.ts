import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import {
  getDashboard, getAllOrders, updateOrderStatus, getOrderDetail,
  getAllUsers, getUserDetail, changeUserRole, toggleUserStatus, deleteUser,
  updateUser, resetUserPassword, uploadUserAvatar,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getAnalytics,
} from "../controllers/admin.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderDetail);
router.put("/orders/:id/status", updateOrderStatus);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetail);
router.put("/users/:id/role", changeUserRole);
router.put("/users/:id/status", toggleUserStatus);
router.put("/users/:id/profile", updateUser);
router.post("/users/:id/avatar", upload.single("avatar"), uploadUserAvatar);
router.put("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);

// Analytics
router.get("/analytics", getAnalytics);

// Coupons
router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

export default router;
