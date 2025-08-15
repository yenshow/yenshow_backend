// controllers/auth/authController.js
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import { handleLogin, handleLogout, getUserProfile, handleTokenExtension } from "../../services/authService.js";
import User from "../../models/user.js";

/**
 * 通用登入處理 - 供各角色控制器調用
 */
export const login = async (req, res, next) => {
	try {
		const result = await handleLogin(req.user);
		return successResponse(res, StatusCodes.OK, "登入成功", { result });
	} catch (error) {
		console.error("登入失敗:", error);
		next(error);
	}
};

/**
 * 通用登出處理 - 供各角色控制器調用
 */
export const logout = async (req, res, next) => {
	try {
		await handleLogout(req.user, req.token);
		return successResponse(res, StatusCodes.OK, "登出成功");
	} catch (error) {
		console.error("登出失敗:", error);
		next(error);
	}
};

/**
 * 延長 Token 有效期
 */
export const extendToken = async (req, res, next) => {
	try {
		// req.user 和 req.token 由 Passport 的 jwt 策略提供
		const newToken = await handleTokenExtension(req.user, req.token);

		return successResponse(res, StatusCodes.OK, "Token 已延長", { result: newToken });
	} catch (error) {
		console.error("延長 Token 失敗:", error);
		next(error);
	}
};

/**
 * 修改密碼（包括首次登入強制修改密碼）
 */
export const changePassword = async (req, res, next) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const userId = req.user._id;

		// 驗證密碼等邏輯...

		// 獲取用戶並包含密碼字段
		const user = await User.findById(userId).select("+password");
		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		// 驗證當前密碼
		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			throw ApiError.badRequest("當前密碼不正確");
		}

		// 更新密碼
		user.password = newPassword;

		// 如果是首次登入，更新標記
		if (user.isFirstLogin) {
			user.isFirstLogin = false;
		}

		await user.save();

		return successResponse(res, StatusCodes.OK, "密碼已成功更新");
	} catch (error) {
		console.error("修改密碼失敗:", error);
		next(error);
	}
};

/**
 * 獲取用戶個人資料 - 整合所有角色
 */
export const getProfile = (req, res, next) => {
	try {
		// 使用服務方法獲取用戶資料
		const userData = getUserProfile(req.user);

		// 根據角色設置不同提示訊息
		let message = "獲取用戶資料成功";
		if (req.user.role === "client") {
			message = "獲取客戶資料成功";
		} else if (req.user.role === "staff") {
			message = "獲取員工資料成功";
		} else if (req.user.role === "admin") {
			message = "獲取管理員資料成功";
		}

		return successResponse(res, StatusCodes.OK, message, { result: userData });
	} catch (error) {
		console.error("獲取用戶資料失敗:", error);
		next(error);
	}
};
