import { Router } from "express";
import {
	login,
	logout,
	getProfile,
	updateProfile,
	changePassword,
	extendToken
} from "../controllers/common/authController.js";
import {
	getUsers,
	createUser,
	updateUser,
	deleteUser,
	resetUserPassword,
	getLicenses,
	getLicense,
	exportLicensePdf,
	createLicense,
	reviewLicense,
	extendLicense,
	unbindLicense,
	deleteLicense,
	getPendingReviewCounts
} from "../controllers/user/admin.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import { login as loginMiddleware } from "../middlewares/auth.js";
import fileUpload from "../utils/fileUpload.js";

const router = Router();

const uploadLicenseCreate = fileUpload.getSingleFileMiddleware("licenseImage");

// 公開路由 - 不需要身份驗證
router.post("/login", loginMiddleware, login);

// 受保護的基本路由 - 所有已認證用戶皆可使用
router.use(requireAuth);
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.delete("/logout", logout);
router.post("/change-password", changePassword);
router.patch("/extend", extendToken);

// 客戶特有功能

// 用戶管理功能
router.get("/users", checkRole([Permissions.ADMIN, Permissions.STAFF]), getUsers);
router.post("/users", checkRole([Permissions.ADMIN, Permissions.STAFF]), createUser);
router.put("/users/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), updateUser);
router.delete("/users/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), deleteUser);
router.post("/users/:id/reset-password", checkRole([Permissions.ADMIN, Permissions.STAFF]), resetUserPassword);

// 授權管理功能（需要 ADMIN 或 STAFF 權限）
router.get(
	"/pending-review-counts",
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	getPendingReviewCounts
);
router.get("/licenses", checkRole([Permissions.ADMIN, Permissions.STAFF]), getLicenses);
router.get("/licenses/:id/pdf", checkRole([Permissions.ADMIN, Permissions.STAFF]), exportLicensePdf);
router.get("/licenses/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), getLicense);
router.post(
	"/licenses",
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	uploadLicenseCreate,
	createLicense
);
router.post("/licenses/:id/review", checkRole([Permissions.ADMIN]), reviewLicense);
router.post("/licenses/:id/extend", checkRole([Permissions.ADMIN, Permissions.STAFF]), extendLicense);
router.post("/licenses/:id/unbind", checkRole([Permissions.ADMIN]), unbindLicense);
router.delete("/licenses/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), deleteLicense);

export default router;
