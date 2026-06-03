import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller";

const router = Router();

// Public routes
router.get("/product/:slug", getProductReviews);

// Authenticated routes
router.post("/", authenticate, createReview);
router.put("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);

export default router;
