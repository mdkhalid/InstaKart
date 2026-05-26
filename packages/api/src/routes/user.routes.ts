import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import {
  getProfile, updateProfile, changePassword, uploadAvatar,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
} from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);
router.post("/avatar", upload.single("avatar"), uploadAvatar);

// Addresses
router.get("/addresses", getAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);
router.put("/addresses/:id/default", setDefaultAddress);

export default router;
