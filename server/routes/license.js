import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";
import { licenseRateLimit, licenseStrictRateLimit } from "../middlewares/rateLimit.js";

const router = Router();

// 公開 API — 不需要身份驗證，但有速率限制
// BA 後端呼叫：建議用 licenseKey 查詢（比 serialNumber 安全）

router.post("/activate", licenseStrictRateLimit, LicenseController.activate);
router.post("/check-status", licenseRateLimit, LicenseController.checkStatus);
router.post("/offline-activate", licenseStrictRateLimit, LicenseController.offlineActivate);

export default router;
