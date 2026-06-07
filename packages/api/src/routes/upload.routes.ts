import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { uploadIssuePhotos } from "../controllers/issue.controller";

const router = Router();

router.use(authenticate);

router.post("/issues", upload.array("photos", 3), uploadIssuePhotos);

export default router;
