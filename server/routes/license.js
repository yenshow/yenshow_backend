import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";
import { licenseRateLimit, licenseStrictRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

// 公開 API - 不需要身份驗證（客戶端使用）
// 但需要速率限制以防止惡意請求

// 一般操作：15 分鐘內最多 10 次請求
router.post("/get-license-key", licenseRateLimit, LicenseController.getLicenseKey);
router.post("/check-status", licenseRateLimit, LicenseController.checkStatus);

// 敏感操作：1 小時內最多 20 次請求（驗證、啟用）
router.post("/validate", licenseStrictRateLimit, LicenseController.validate);
router.post("/activate", licenseStrictRateLimit, LicenseController.activate);

export default router;
