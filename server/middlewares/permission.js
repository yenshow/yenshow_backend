import { ApiError } from "../utils/responseHandler.js";
import UserRole from "../enums/UserRole.js";

// 簡化權限常數
export const Permissions = {
	// 按角色分類
	ADMIN: "admin",
	STAFF: "staff",
	CLIENT: "client",
	PUBLIC: "public"
};

/**
 * 角色檢查中間件
 */
export const checkRole = (allowedRoles = []) => {
	return (req, res, next) => {
		try {
			// 公開訪問檢查
			if (allowedRoles.includes(Permissions.PUBLIC)) {
				return next();
			}

			// 確認用戶是否已認證
			if (!req.user) {
				throw ApiError.unauthorized("需要身份驗證");
			}

			// 確認角色是否允許
			const userRole = req.user.role === UserRole.ADMIN ? Permissions.ADMIN : req.user.role === UserRole.STAFF ? Permissions.STAFF : Permissions.CLIENT;

			if (!allowedRoles.includes(userRole)) {
				throw ApiError.forbidden("您沒有執行此操作的權限");
			}

			// 設置請求上下文，供後續使用
			req.accessContext = { userRole };

			next();
		} catch (error) {
			next(error);
		}
	};
};
