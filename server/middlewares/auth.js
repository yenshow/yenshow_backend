import passport from "passport";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/responseHandler.js";
import UserRole from "../enums/UserRole.js";

class AuthMiddleware {
	/**
	 * 登入驗證中間件
	 * 使用 Passport 的 local 策略處理登入請求
	 */
	login = (req, res, next) => {
		console.log("認證中間件 - 開始登入驗證:", {
			body: req.body,
			hasAccount: !!req.body?.account,
			hasPassword: !!req.body?.password
		});

		// 如果請求體中沒有帳號或密碼，提前返回錯誤
		if (!req.body?.account || !req.body?.password) {
			console.error("認證中間件 - 缺少帳號或密碼");
			return next(ApiError.badRequest("請輸入帳號和密碼"));
		}

		passport.authenticate("login", { session: false }, (error, user, info) => {
			try {
				console.log("認證中間件 - Passport 認證結果:", {
					hasError: !!error,
					hasUser: !!user,
					info: info ? info.message : "No info"
				});

				if (error) {
					console.error("認證中間件 - Passport 認證錯誤:", error);
					throw ApiError.internal("認證過程發生錯誤: " + error.message);
				}

				if (!user) {
					const message = info?.message || "認證失敗";
					console.error("認證中間件 - 認證失敗:", message);
					throw ApiError.badRequest(message);
				}

				// 檢查用戶對象是否包含必要的字段
				if (!user._id) {
					console.error("認證中間件 - 用戶對象缺少必要字段:", user);
					throw ApiError.internal("用戶對象無效");
				}

				// 認證成功，將用戶信息添加到請求對象
				req.user = user;
				console.log("認證中間件 - 認證成功:", {
					account: user.account,
					_id: user._id
				});
				next();
			} catch (err) {
				console.error("認證中間件 - 處理錯誤:", err, err.stack);
				next(err);
			}
		})(req, res, next);
	};

	/**
	 * JWT 驗證中間件
	 * 驗證請求頭中的 JWT token
	 */
	verifyJWT = (req, res, next) => {
		console.log("認證中間件 - JWT 驗證開始");

		passport.authenticate("jwt", { session: false }, (error, data, info) => {
			try {
				if (error) {
					console.error("認證中間件 - JWT 驗證錯誤:", error);
					throw ApiError.internal("驗證過程發生錯誤");
				}

				if (!data) {
					let message = "認證失敗";
					if (info instanceof jwt.JsonWebTokenError) {
						message = "token 無效";
					} else if (info instanceof jwt.TokenExpiredError) {
						message = "token 過期";
					} else if (info) {
						message = info.message || "認證失敗";
					}
					console.error("認證中間件 - JWT 驗證失敗:", message);
					throw ApiError.unauthorized(message);
				}

				// 驗證成功，將用戶信息和 token 添加到請求對象
				req.user = data.user;
				req.token = data.token;
				console.log("認證中間件 - JWT 驗證成功:", {
					account: data.user.account,
					_id: data.user._id
				});
				next();
			} catch (err) {
				console.error("認證中間件 - JWT 處理錯誤:", err);
				next(err);
			}
		})(req, res, next);
	};

	/**
	 * 基本身份驗證中間件
	 * 檢查請求對象中是否有用戶信息
	 */
	requireAuth = (req, res, next) => {
		try {
			console.log("認證中間件 - 檢查基本身份驗證");

			// 從請求頭提取 token
			const token = this.extractTokenFromHeader(req);
			if (!token) {
				console.error("認證中間件 - 未找到 token");
				throw ApiError.unauthorized("請先登入");
			}

			// 驗證 JWT token
			passport.authenticate("jwt", { session: false }, (error, data, info) => {
				try {
					if (error) {
						console.error("認證中間件 - JWT 驗證錯誤:", error);
						throw ApiError.internal("驗證過程發生錯誤");
					}

					if (!data) {
						let message = "認證失敗";
						if (info instanceof jwt.JsonWebTokenError) {
							message = "token 無效";
						} else if (info instanceof jwt.TokenExpiredError) {
							message = "token 過期";
						} else if (info) {
							message = info.message || "認證失敗";
						}
						console.error("認證中間件 - JWT 驗證失敗:", message);
						throw ApiError.unauthorized(message);
					}

					// 驗證成功，將用戶信息和 token 添加到請求對象
					req.user = data.user;
					req.token = data.token;
					console.log("認證中間件 - JWT 驗證成功:", {
						account: data.user.account,
						_id: data.user._id
					});

					// 添加活動狀態檢查
					if (!req.user.isActive) {
						throw ApiError.forbidden("您的帳戶已被停用");
					}

					// 繼續進行基本身份驗證
					console.log("認證中間件 - 基本身份驗證通過");
					next();
				} catch (err) {
					console.error("認證中間件 - JWT 處理錯誤:", err);
					next(err);
				}
			})(req, res, next);
		} catch (err) {
			console.error("認證中間件 - 基本身份驗證錯誤:", err);
			next(err);
		}
	};

	/**
	 * 管理員權限驗證中間件
	 * 檢查用戶是否具有管理員權限
	 */
	requireAdmin = (req, res, next) => {
		try {
			console.log("認證中間件 - 檢查管理員權限");

			// 恢復角色檢查，只允許管理員訪問
			if (!req.user || req.user.role !== UserRole.ADMIN) {
				console.error("認證中間件 - 不是管理員");
				throw ApiError.forbidden("需要管理員權限");
			}

			console.log("認證中間件 - 管理員權限驗證通過");
			next();
		} catch (err) {
			console.error("認證中間件 - 管理員權限驗證錯誤:", err);
			next(err);
		}
	};

	/**
	 * 從請求頭提取 token
	 */
	extractTokenFromHeader = (req) => {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			return authHeader.split(" ")[1];
		}
		return null;
	};

	/**
	 * 驗證 token
	 */
	verifyToken = (token) => {
		try {
			return jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			if (error instanceof jwt.JsonWebTokenError) {
				throw ApiError.unauthorized("無效的 token");
			} else if (error instanceof jwt.TokenExpiredError) {
				throw ApiError.unauthorized("token 已過期");
			}
			throw error;
		}
	};
}

// 創建單例實例
const authMiddleware = new AuthMiddleware();

// 導出默認實例和個別方法
export default authMiddleware;
export const { login, verifyJWT, requireAuth, requireAdmin } = authMiddleware;
export const jwtAuth = authMiddleware.verifyJWT; // 為了向後兼容

// API 金鑰驗證中間件
export const apiKeyAuth = (req, res, next) => {
	const apiKey = req.headers["x-api-key"];

	if (!apiKey || apiKey !== process.env.API_KEY) {
		return res.status(401).json({
			success: false,
			message: "無效的 API 金鑰"
		});
	}

	next();
};
