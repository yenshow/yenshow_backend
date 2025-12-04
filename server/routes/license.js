import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";

const router = Router();

// 公開 API - 不需要身份驗證（客戶端使用）
router.post("/get-license-key", LicenseController.getLicenseKey);
router.post("/validate", LicenseController.validate);
router.post("/activate", LicenseController.activate);
router.post("/check-status", LicenseController.checkStatus);

export default router;
