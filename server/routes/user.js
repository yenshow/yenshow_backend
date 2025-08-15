import { Router } from "express";
import { login, logout, getProfile, changePassword, extendToken } from "../controllers/user/authController.js";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user/admin.js";
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

export default router;
