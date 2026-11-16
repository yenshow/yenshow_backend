import jwt from "jsonwebtoken";
import { ApiError } from "../utils/responseHandler.js";

/** 單一帳號同時保留的有效 token 上限（多裝置登入） */
export const MAX_ACTIVE_TOKENS = 10;

/**
 * 過濾掉已過期或無效的 JWT
 */
export const pruneExpiredTokens = (tokens = []) => {
	if (!Array.isArray(tokens) || tokens.length === 0) return [];

	return tokens.filter((token) => {
		if (typeof token !== "string" || !token) return false;
		try {
			jwt.verify(token, process.env.JWT_SECRET);
			return true;
		} catch {
			return false;
		}
	});
};

/**
 * 清過期後再依上限裁切，只保留最新的有效 token
 */
export const sanitizeTokens = (tokens = [], maxActive = MAX_ACTIVE_TOKENS) => {
	const validTokens = pruneExpiredTokens(tokens);
	if (validTokens.length <= maxActive) return validTokens;
	return validTokens.slice(-maxActive);
};

/**
 * 建立 JWT 令牌
 */
export const createToken = async (user, expiresIn = "7 days") => {
	const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn });

	const tokens = sanitizeTokens(user.tokens || []);
	tokens.push(token);

	user.tokens = tokens.length > MAX_ACTIVE_TOKENS ? tokens.slice(-MAX_ACTIVE_TOKENS) : tokens;
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
	const tokens = sanitizeTokens(user.tokens || []);
	user.tokens = tokens.filter((t) => t !== token);
	await user.save();
	return true;
};

/**
 * 處理 Token 延長
 */
export const handleTokenExtension = async (user, currentToken) => {
	// 1. 移除當前的 (可能已過期的) token
	user.tokens = (user.tokens || []).filter((t) => t !== currentToken);

	// 2. 建立並儲存一個新的 token（內部會再清過期與裁切上限）
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
