import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlist,
} from "../controllers/wishlist.controller";

const router = Router();

// All wishlist routes require authentication
router.get("/", authenticate, getWishlist);
router.post("/add", authenticate, addToWishlist);
router.post("/toggle", authenticate, toggleWishlist);
router.post("/check", authenticate, checkWishlist);
router.delete("/:productId", authenticate, removeFromWishlist);

export default router;
