import rateLimit from "express-rate-limit";

/**
 * License API 嚴格速率限制
 * 用於 activate、offline-activate 等敏感操作
 * 限制每個 IP 在 1 小時內最多 20 次請求
 */
export const licenseStrictRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 20,
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
