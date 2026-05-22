// controllers/auth/authController.js
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import { handleLogin, handleLogout, getUserProfile, handleTokenExtension } from "../../services/authService.js";
import validator from "validator";
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

		if (
			typeof newPassword !== "string" ||
			newPassword.length < 4 ||
			newPassword.length > 20
		) {
			throw ApiError.badRequest("密碼長度必須在 4-20 個字元之間");
		}

		const user = await User.findById(req.user._id).select("+password");
		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		if (!(await user.comparePassword(currentPassword))) {
			throw ApiError.badRequest("當前密碼不正確");
		}

		user.password = newPassword;
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
 * 更新自己的個人資料（目前支援 email）
 */
export const updateProfile = async (req, res, next) => {
	try {
		const { email } = req.body;

		if (email === undefined) {
			throw ApiError.badRequest("請提供要更新的欄位");
		}

		const trimmedEmail = typeof email === "string" ? email.trim() : "";

		if (trimmedEmail && !validator.isEmail(trimmedEmail)) {
			throw ApiError.badRequest("信箱格式錯誤");
		}

		req.user.email = trimmedEmail || undefined;
		await req.user.save();

		const userData = getUserProfile(req.user);

		return successResponse(res, StatusCodes.OK, "個人資料已更新", { result: userData });
	} catch (error) {
		console.error("更新個人資料失敗:", error);
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

		return successResponse(res, StatusCodes.OK, "獲取個人資料成功", { result: userData });
	} catch (error) {
		console.error("獲取用戶資料失敗:", error);
		next(error);
	}
};
