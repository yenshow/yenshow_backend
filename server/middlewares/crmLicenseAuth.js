import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { ApiError, errorResponse } from "../utils/responseHandler.js";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const timingSafeEqualString = (a, b) => {
	const left = Buffer.from(String(a || ""));
	const right = Buffer.from(String(b || ""));
	if (left.length !== right.length) {
		crypto.timingSafeEqual(left, left);
		return false;
	}
	return crypto.timingSafeEqual(left, right);
};

const clientIp = (req) => (req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "");

const isIpAllowed = (ip) => {
	const raw = process.env.CRM_LICENSE_ALLOWED_IPS || "";
	const allow = raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (allow.length === 0) return true;
	return allow.includes(ip);
};

export const requireCrmLicenseAuth = (req, res, next) => {
	try {
		const expected = process.env.CRM_LICENSE_API_TOKEN;
		if (!expected) {
			throw ApiError.internal("尚未設定 CRM_LICENSE_API_TOKEN");
		}

		const header = req.headers.authorization || "";
		const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
		if (!token || !timingSafeEqualString(token, expected)) {
			return errorResponse(res, StatusCodes.UNAUTHORIZED, "Token 錯");
		}

		const ip = clientIp(req);
		if (!isIpAllowed(ip)) {
			return errorResponse(res, StatusCodes.FORBIDDEN, "來源 IP 不在白名單");
		}

		const account = String(req.headers["x-crm-actor-account"] || "").trim();
		const role = String(req.headers["x-crm-actor-role"] || "").trim().toLowerCase();
		const name = String(req.headers["x-crm-actor-name"] || "").trim();

		if (!account) {
			return errorResponse(res, StatusCodes.BAD_REQUEST, "需要提供 X-Crm-Actor-Account");
		}
		if (role !== "staff" && role !== "admin") {
			return errorResponse(res, StatusCodes.BAD_REQUEST, "X-Crm-Actor-Role 必須為 staff 或 admin");
		}

		req.crmActor = { account, role, name: name || null };
		next();
	} catch (error) {
		next(error);
	}
};

export const requireCrmLicenseAdmin = (req, res, next) => {
	if (req.crmActor?.role !== "admin") {
		return errorResponse(res, StatusCodes.FORBIDDEN, "僅管理員可審核");
	}
	next();
};

export const requireIdempotencyKey = (req, res, next) => {
	const key = String(req.headers["idempotency-key"] || "").trim();
	if (!key) {
		return errorResponse(res, StatusCodes.BAD_REQUEST, "需要提供 Idempotency-Key");
	}
	if (!UUID_RE.test(key)) {
		return errorResponse(res, StatusCodes.BAD_REQUEST, "Idempotency-Key 必須為 UUID");
	}
	req.idempotencyKey = key;
	next();
};

export const crmLicenseErrorHandler = (err, req, res, next) => {
	if (res.headersSent) return next(err);
	if (err?.name === "CastError") {
		return errorResponse(res, StatusCodes.NOT_FOUND, "授權不存在");
	}
	const statusCode = err.statusCode || 500;
	const message =
		statusCode >= 500 && process.env.NODE_ENV !== "development"
			? "內部伺服器錯誤"
			: err.message || "操作失敗";
	return errorResponse(res, statusCode, message);
};
