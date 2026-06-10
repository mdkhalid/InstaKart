import { Router } from "express";
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import {
  getDashboard, getAllOrders, updateOrderStatus, getOrderDetail,
  getAllUsers, getUserDetail, changeUserRole, toggleUserStatus, deleteUser,
  updateUser, resetUserPassword, uploadUserAvatar,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getAnalytics,
  adminListProducts, adminGetProduct,
  getLowStockProducts,
} from "../controllers/admin.controller";
import { getAllIssues, getIssueDetail, resolveIssue } from "../controllers/issue.controller";

const router = Router();

router.use(authenticate, requireAdmin);

// ── Store-scoped routes (accessible by SUPER_ADMIN and STORE_ADMIN) ──
router.get("/dashboard", getDashboard);
router.get("/low-stock", getLowStockProducts);
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderDetail);
router.put("/orders/:id/status", updateOrderStatus);
router.get("/products", adminListProducts);
router.get("/products/:id", adminGetProduct);
router.get("/issues", getAllIssues);
router.get("/issues/:id", getIssueDetail);
router.post("/issues/:id/resolve", resolveIssue);

// ── Super-admin-only routes (STORE_ADMIN cannot access) ──
router.get("/users", requireSuperAdmin, getAllUsers);
router.get("/users/:id", requireSuperAdmin, getUserDetail);
router.put("/users/:id/role", requireSuperAdmin, changeUserRole);
router.put("/users/:id/status", requireSuperAdmin, toggleUserStatus);
router.put("/users/:id/profile", requireSuperAdmin, updateUser);
router.post("/users/:id/avatar", requireSuperAdmin, upload.single("avatar"), uploadUserAvatar);
router.put("/users/:id/reset-password", requireSuperAdmin, resetUserPassword);
router.delete("/users/:id", requireSuperAdmin, deleteUser);

router.get("/analytics", requireSuperAdmin, getAnalytics);

router.get("/coupons", requireSuperAdmin, getCoupons);
router.post("/coupons", requireSuperAdmin, createCoupon);
router.put("/coupons/:id", requireSuperAdmin, updateCoupon);
router.delete("/coupons/:id", requireSuperAdmin, deleteCoupon);

export default router;
