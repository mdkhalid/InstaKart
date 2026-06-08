import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  trackSearch,
  trackView,
  trackEvent,
  mergeVisitorData,
  getSuggestions,
  getRecentlyViewed,
} from "../controllers/suggestion.controller";

const router = Router();

// Tracking endpoints — public (accept JWT or x-visitor-id header)
router.post("/track-search", trackSearch);
router.post("/track-view", trackView);
router.post("/track-event", trackEvent);

// Merge — requires authentication
router.post("/merge", authenticate, mergeVisitorData);

// Suggestions — public (returns trending for anonymous, personalized for authenticated)
router.get("/", getSuggestions);
router.get("/recently-viewed", getRecentlyViewed);

export default router;
