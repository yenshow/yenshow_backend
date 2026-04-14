/**
 * 公開授權 API（啟用／離線啟用）。
 * 後台管理員／員工的授權權限矩陣由 /api/users/licenses* 路由與 admin 控制器實作。
 */
import { Router } from "express";
import LicenseController from "../controllers/common/licenseController.js";
const router = Router();

router.post("/activate", LicenseController.activate);
router.post("/offline-activate", LicenseController.offlineActivate);

export default router;
