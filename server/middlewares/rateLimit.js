import rateLimit from "express-rate-limit";

/**
 * 速率限制中間件
 * 用於防止惡意請求、暴力破解等攻擊
 */

/**
 * License API 速率限制
 * 限制每個 IP 在 15 分鐘內最多 10 次請求
 * 適用於驗證、啟用等操作
 */
export const licenseRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 分鐘
	max: 10, // 最多 10 次請求
	message: {
		success: false,
		message: "請求過於頻繁，請稍後再試",
		error: "RATE_LIMIT_EXCEEDED",
		code: "RATE_LIMIT_EXCEEDED",
		retryAfter: "15 分鐘"
	},
	standardHeaders: true, // 返回標準的 RateLimit-* headers
	legacyHeaders: false, // 禁用 X-RateLimit-* headers
	// 使用 IP 地址作為識別
	keyGenerator: (req) => {
		// 優先使用 X-Forwarded-For（如果有代理）
		return req.ip || req.connection.remoteAddress || "unknown";
	},
	// 自定義處理函數
	handler: (req, res) => {
		res.status(429).json({
			success: false,
			message: "請求過於頻繁，請稍後再試",
			error: "RATE_LIMIT_EXCEEDED",
			code: "RATE_LIMIT_EXCEEDED",
			retryAfter: "15 分鐘"
		});
	},
	// 跳過成功請求（只計算失敗的請求）
	skipSuccessfulRequests: false,
	// 跳過失敗請求（只計算成功的請求）
	skipFailedRequests: false
});

/**
 * 更嚴格的 License 驗證速率限制
 * 用於 validate 和 activate 等敏感操作
 * 限制每個 IP 在 1 小時內最多 20 次請求
 */
export const licenseStrictRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 小時
	max: 20, // 最多 20 次請求
	message: {
		success: false,
		message: "驗證請求過於頻繁，請稍後再試",
		error: "RATE_LIMIT_EXCEEDED",
		code: "RATE_LIMIT_EXCEEDED",
		retryAfter: "1 小時"
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => {
		return req.ip || req.connection.remoteAddress || "unknown";
	},
	handler: (req, res) => {
		res.status(429).json({
			success: false,
			message: "驗證請求過於頻繁，請稍後再試",
			error: "RATE_LIMIT_EXCEEDED",
			code: "RATE_LIMIT_EXCEEDED",
			retryAfter: "1 小時"
		});
	}
});
