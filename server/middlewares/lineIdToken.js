import axios from "axios";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/responseHandler.js";
import LineCustomerBinding from "../models/LineCustomerBinding.js";

const MAX_VERIFY_CACHE_TTL_MS = 10 * 60 * 1000;
const verifyCache = new Map();

const extractBearer = (req) => {
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		return authHeader.slice(7).trim();
	}
	return null;
};

const resolveChannelId = () =>
	process.env.LINE_LOGIN_CHANNEL_ID ||
	process.env.LIFF_CHANNEL_ID ||
	process.env.YENSHOW_LINE_CHANNEL_ID ||
	"";

const getCachedVerify = (idToken) => {
	const entry = verifyCache.get(idToken);
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		verifyCache.delete(idToken);
		return null;
	}
	return entry;
};

const setCachedVerify = (idToken, lineUserId, lineProfile) => {
	const decoded = jwt.decode(idToken);
	const untilExp = decoded?.exp ? Number(decoded.exp) * 1000 - Date.now() : MAX_VERIFY_CACHE_TTL_MS;
	const ttl = Math.min(Math.max(untilExp, 0), MAX_VERIFY_CACHE_TTL_MS);
	if (!ttl) return;
	verifyCache.set(idToken, { lineUserId, lineProfile, expiresAt: Date.now() + ttl });
};

/**
 * 驗證 LINE LIFF idToken，將 lineUserId 寫入 req.lineUserId
 */
export const requireLineIdToken = async (req, res, next) => {
	try {
		const skipVerify = process.env.HUB_SKIP_LINE_VERIFY === "true";
		const mockUserId = req.headers["x-line-user-id"];

		// 本機除錯：可直接帶 X-Line-User-Id
		if (skipVerify && mockUserId) {
			req.lineUserId = String(mockUserId);
			return next();
		}

		const idToken = extractBearer(req);
		if (!idToken) throw ApiError.unauthorized("請先透過 LINE 登入");

		if (skipVerify) {
			const decoded = jwt.decode(idToken);
			if (!decoded?.sub) throw ApiError.unauthorized("無效的 LINE idToken");
			req.lineUserId = String(decoded.sub);
			req.lineProfile = { displayName: decoded.name || "", pictureUrl: decoded.picture || "" };
			return next();
		}

		const cached = getCachedVerify(idToken);
		if (cached) {
			req.lineUserId = cached.lineUserId;
			req.lineProfile = cached.lineProfile;
			return next();
		}

		const channelId = resolveChannelId();
		if (!channelId) throw ApiError.internal("尚未設定 LINE_LOGIN_CHANNEL_ID");

		const params = new URLSearchParams({ id_token: idToken, client_id: channelId });
		const { data } = await axios.post("https://api.line.me/oauth2/v2.1/verify", params.toString(), {
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			timeout: 10000
		});

		if (!data?.sub) throw ApiError.unauthorized("無效的 LINE idToken");
		req.lineUserId = String(data.sub);
		req.lineProfile = { displayName: data.name || "", pictureUrl: data.picture || "" };
		setCachedVerify(idToken, req.lineUserId, req.lineProfile);
		next();
	} catch (err) {
		if (err instanceof ApiError) return next(err);
		console.error("LINE idToken 驗證失敗:", err?.response?.data || err?.message || err);
		return next(ApiError.unauthorized("LINE 身分驗證失敗"));
	}
};

/**
 * 需已完成 CRM 綁定
 */
export const requireHubBinding = async (req, res, next) => {
	try {
		if (!req.lineUserId) {
			throw ApiError.unauthorized("請先透過 LINE 登入");
		}
		const binding = await LineCustomerBinding.findOne({ lineUserId: req.lineUserId }).lean();
		if (!binding) {
			throw ApiError.forbidden("尚未完成客戶綁定，請先驗證訂單與統編");
		}
		req.hubBinding = binding;
		next();
	} catch (err) {
		next(err);
	}
};

/**
 * CRM webhook 事件用 API Key
 */
export const requireHubEventApiKey = (req, res, next) => {
	const apiKey = req.headers["x-api-key"];
	const expected = process.env.HUB_EVENTS_API_KEY || process.env.API_KEY;
	if (!expected || apiKey !== expected) {
		return next(ApiError.unauthorized("無效的 API 金鑰"));
	}
	next();
};
