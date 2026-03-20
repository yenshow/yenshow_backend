import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";
import { licenseStrictRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

router.post("/activate", licenseStrictRateLimit, LicenseController.activate);
router.post("/offline-activate", licenseStrictRateLimit, LicenseController.offlineActivate);

export default router;
