import { Router } from "express";
import { login, logout, getProfile, changePassword, extendToken } from "../controllers/common/authController.js";
import {
	getUsers,
	createUser,
	updateUser,
	deleteUser,
	getLicenses,
	getLicense,
	createLicense,
	updateLicense,
	deleteLicense,
	activateLicense,
	deactivateLicense
} from "../controllers/user/admin.js";
import LicenseController from "../controllers/common/licenseController.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import { login as loginMiddleware } from "../middlewares/auth.js";

const router = Router();

// 公開路由 - 不需要身份驗證
router.post("/login", loginMiddleware, login);

// 受保護的基本路由 - 所有已認證用戶皆可使用
router.use(requireAuth);
router.get("/profile", getProfile);
router.delete("/logout", logout);
router.post("/change-password", changePassword);
router.patch("/extend", extendToken);

// 客戶特有功能

// 用戶管理功能
router.get("/users", checkRole([Permissions.ADMIN, Permissions.STAFF]), getUsers);
router.post("/users", checkRole([Permissions.ADMIN, Permissions.STAFF]), createUser);
router.put("/users/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), updateUser);
router.delete("/users/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), deleteUser);

// 授權管理功能（需要 ADMIN 或 STAFF 權限）
router.get("/licenses", checkRole([Permissions.ADMIN, Permissions.STAFF]), getLicenses);
router.get("/licenses/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), getLicense);
router.post("/licenses", checkRole([Permissions.ADMIN, Permissions.STAFF]), createLicense);
router.put("/licenses/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), updateLicense);
router.delete("/licenses/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), deleteLicense);
router.post("/licenses/:id/activate", checkRole([Permissions.ADMIN, Permissions.STAFF]), activateLicense);
router.post("/licenses/:id/deactivate", checkRole([Permissions.ADMIN, Permissions.STAFF]), deactivateLicense);

export default router;
