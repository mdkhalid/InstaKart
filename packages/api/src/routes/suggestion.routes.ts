import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { trackSearch, trackView, getSuggestions, getRecentlyViewed } from "../controllers/suggestion.controller";

const router = Router();

// All suggestion endpoints require authentication
router.post("/track-search", authenticate, trackSearch);
router.post("/track-view", authenticate, trackView);
router.get("/", authenticate, getSuggestions);
router.get("/recently-viewed", authenticate, getRecentlyViewed);

export default router;
