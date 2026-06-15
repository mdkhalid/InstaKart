import { Router } from "express";
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import {
  getDashboard, getAllOrders, updateOrderStatus, getOrderDetail,
  getAllUsers, getUserDetail, changeUserRole, toggleUserStatus, deleteUser,
  updateUser, resetUserPassword, uploadUserAvatar,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getAnalytics,
  adminListProducts, adminGetProduct, adminListStores,
  getLowStockProducts,
} from "../controllers/admin.controller";
import { getAllIssues, getIssueDetail, resolveIssue } from "../controllers/issue.controller";
import {
  listDeliveryPersons, getDeliveryPerson, createDeliveryPerson, updateDeliveryPerson,
  toggleDeliveryPersonStatus, deleteDeliveryPerson, getAvailableDeliveryPersons,
  assignDeliveryPerson, updateAssignmentStatus,
  getDeliveryPersonActivity, getDeliveryStats,
  getMyProfile, getMyAssignments, getMyStats, getMyActivity, updateMyLocation, toggleMyStatus,
} from "../controllers/delivery.controller";

const router = Router();

router.use(authenticate, requireAdmin);

// ── Store-scoped routes (accessible by SUPER_ADMIN and STORE_ADMIN) ──
router.get("/dashboard", getDashboard);
router.get("/stores", adminListStores);
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

// ── Delivery Management (store-scoped) ──
// Agent Self-Service (mobile app)
router.get("/delivery-persons/me", getMyProfile);
router.get("/delivery-persons/me/assignments", getMyAssignments);
router.get("/delivery-persons/me/stats", getMyStats);
router.get("/delivery-persons/me/activity", getMyActivity);
router.put("/delivery-persons/me/location", updateMyLocation);
router.put("/delivery-persons/me/status", toggleMyStatus);
router.get("/delivery-persons", listDeliveryPersons);
router.get("/delivery-persons/available", getAvailableDeliveryPersons);
router.get("/delivery-persons/stats", getDeliveryStats);
router.get("/delivery-persons/:id", getDeliveryPerson);
router.post("/delivery-persons", createDeliveryPerson);
router.put("/delivery-persons/:id", updateDeliveryPerson);
router.put("/delivery-persons/:id/status", toggleDeliveryPersonStatus);
router.delete("/delivery-persons/:id", deleteDeliveryPerson);
router.get("/delivery-persons/:id/activity", getDeliveryPersonActivity);

// ── Delivery Assignments ──
router.post("/orders/:id/assign-delivery", assignDeliveryPerson);
router.put("/delivery-assignments/:id/status", updateAssignmentStatus);

export default router;
