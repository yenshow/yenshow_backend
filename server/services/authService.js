import jwt from "jsonwebtoken";
import { ApiError } from "../utils/responseHandler.js";

/**
 * 建立 JWT 令牌
 */
export const createToken = async (user, expiresIn = "7 days") => {
	const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn });

	// 儲存令牌
	if (!user.tokens) {
		user.tokens = [];
	}
	user.tokens.push(token);
	await user.save();

	return token;
};

/**
 * 處理登入功能
 */
export const handleLogin = async (user) => {
	// 檢查用戶是否啟用
	if (!user.isActive) {
		throw new ApiError(403, "帳號已停用，請聯絡管理員");
	}

	const token = await createToken(user);

	// 基本用戶資料
	const userData = {
		_id: user._id,
		account: user.account,
		email: user.email,
		role: user.role,
		isFirstLogin: user.isFirstLogin
	};

	// 根據角色添加額外資料
	if (user.role === "client" && user.clientInfo) {
		userData.clientInfo = user.clientInfo;
	} else if ((user.role === "staff" || user.role === "admin") && user.staffInfo) {
		userData.staffInfo = user.staffInfo;
	}

	return { token, user: userData };
};

/**
 * 處理登出
 */
export const handleLogout = async (user, token) => {
	// 移除當前令牌
	user.tokens = user.tokens.filter((t) => t !== token);
	await user.save();
	return true;
};

/**
 * 處理 Token 延長
 */
export const handleTokenExtension = async (user, currentToken) => {
	// 1. 移除當前的 (可能已過期的) token
	user.tokens = user.tokens.filter((t) => t !== currentToken);

	// 2. 建立並儲存一個新的 token
	const newToken = await createToken(user);

	// 3. 返回新的 token
	return newToken;
};

/**
 * 獲取用戶資料
 * 根據用戶角色返回適當的資料格式
 */
export const getUserProfile = (user) => {
	// 基本用戶資料
	const userData = {
		_id: user._id,
		account: user.account,
		email: user.email,
		role: user.role,
		isActive: user.isActive,
		isFirstLogin: user.isFirstLogin
	};

	// 根據角色添加特定資訊
	if (user.role === "client" && user.clientInfo) {
		userData.clientInfo = user.clientInfo;
	} else if ((user.role === "staff" || user.role === "admin") && user.staffInfo) {
		userData.staffInfo = user.staffInfo;
	}

	return userData;
};
