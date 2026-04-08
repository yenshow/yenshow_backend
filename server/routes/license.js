import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";
const router = Router();

router.post("/activate", LicenseController.activate);
router.post("/offline-activate", LicenseController.offlineActivate);

export default router;
