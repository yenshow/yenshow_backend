import { randomUUID } from "crypto";
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { ApiError } from "../../utils/responseHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

const resolveCrmCaPath = () => {
	const fromEnv = process.env.CRM_CA_FILE;
	if (!fromEnv) return null;
	return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(serverRoot, fromEnv);
};

const buildHttpsAgent = () => {
	const caPath = resolveCrmCaPath();
	if (!caPath) return undefined;
	if (!fs.existsSync(caPath)) {
		throw ApiError.internal(`找不到 CRM CA 檔：${caPath}`);
	}
	return new https.Agent({
		ca: fs.readFileSync(caPath),
		keepAlive: true
	});
};

const crmHttp = () => {
	const baseURL = (process.env.CRM_API_BASE_URL || "").replace(/\/$/, "");
	if (!baseURL) {
		throw ApiError.internal("尚未設定 CRM_API_BASE_URL");
	}
	const token = process.env.CRM_API_TOKEN || process.env.CRM_LICENSE_API_TOKEN;
	if (!token) {
		throw ApiError.internal("尚未設定 CRM_API_TOKEN");
	}

	return axios.create({
		baseURL,
		timeout: 15000,
		httpsAgent: buildHttpsAgent(),
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		}
	});
};

const unwrap = (data) => data?.data ?? data?.result ?? data;

const mapCrmError = (err, fallbackMessage) => {
	if (err instanceof ApiError) throw err;

	const status = err?.response?.status;
	const body = err?.response?.data;
	const message = body?.message || fallbackMessage;
	const code = body?.code;

	if (status === 409) {
		throw ApiError.conflict(
			message ||
				(code === "AMBIGUOUS_ORDER"
					? "同一客戶有多筆符合訂單，請改輸入完整內部單號"
					: code === "IDEMPOTENCY_CONFLICT"
						? "冪等鍵衝突，請重新產生 Idempotency-Key"
						: "請求衝突")
		);
	}
	if (status === 429) {
		const retryAfter = err?.response?.headers?.["retry-after"];
		const suffix = retryAfter ? `（請於 ${retryAfter} 秒後再試）` : "";
		throw ApiError.tooManyRequests(`${message || "請求過於頻繁，請稍後再試"}${suffix}`);
	}
	if (status === 403) {
		throw ApiError.forbidden(message || "CRM 拒絕此來源主機");
	}
	if (status === 404) {
		throw ApiError.notFound(message || fallbackMessage);
	}
	if (status === 400 || status === 422) {
		throw ApiError.badRequest(message || fallbackMessage);
	}
	if (status === 401) {
		throw ApiError.unauthorized(message || "CRM 服務認證失敗");
	}

	console.error("CRM 呼叫失敗:", {
		status,
		code,
		message: body?.message || err?.message,
		url: err?.config?.url
	});
	throw ApiError.internal(fallbackMessage);
};

/** 正規化 verify-order 回應，確保 customer.id 為字串 */
const normalizeVerifyPayload = (payload) => {
	if (!payload?.customer?.id) {
		throw ApiError.notFound("訂單或統編不符");
	}
	return {
		...payload,
		customer: {
			...payload.customer,
			id: String(payload.customer.id)
		}
	};
};

export const crmClient = {
	verifyOrder: async ({ orderNo, taxId }) => {
		try {
			const { data } = await crmHttp().post("/customers/verify-order", { orderNo, taxId });
			return normalizeVerifyPayload(unwrap(data));
		} catch (err) {
			if (err instanceof ApiError) throw err;
			if (err?.response?.status) mapCrmError(err, "訂單或統編不符");
			console.error("CRM verifyOrder 失敗:", err?.message || err);
			throw ApiError.internal("CRM 驗證服務暫時無法使用");
		}
	},

	listOrders: async (crmCustomerId, query) => {
		try {
			const { data } = await crmHttp().get(`/customers/${encodeURIComponent(crmCustomerId)}/orders`, {
				params: query
			});
			return unwrap(data);
		} catch (err) {
			mapCrmError(err, "無法取得訂單列表");
		}
	},

	getOrder: async (crmCustomerId, orderId) => {
		try {
			const { data } = await crmHttp().get(
				`/customers/${encodeURIComponent(crmCustomerId)}/orders/${encodeURIComponent(orderId)}`
			);
			const payload = unwrap(data);
			return payload?.order || payload;
		} catch (err) {
			mapCrmError(err, "無法取得訂單明細");
		}
	},

	listServiceTickets: async (crmCustomerId, query) => {
		try {
			const { data } = await crmHttp().get(
				`/customers/${encodeURIComponent(crmCustomerId)}/service-tickets`,
				{ params: query }
			);
			return unwrap(data);
		} catch (err) {
			mapCrmError(err, "無法取得售後案件");
		}
	},

	getServiceTicket: async (crmCustomerId, ticketId) => {
		try {
			const { data } = await crmHttp().get(
				`/customers/${encodeURIComponent(crmCustomerId)}/service-tickets/${encodeURIComponent(ticketId)}`
			);
			const payload = unwrap(data);
			return payload?.ticket || payload;
		} catch (err) {
			mapCrmError(err, "無法取得售後案件");
		}
	},

	createServiceTicket: async (crmCustomerId, body, { idempotencyKey } = {}) => {
		try {
			const key = idempotencyKey || randomUUID();
			const { data } = await crmHttp().post(
				`/customers/${encodeURIComponent(crmCustomerId)}/service-tickets`,
				body,
				{ headers: { "Idempotency-Key": key } }
			);
			const payload = unwrap(data);
			return payload?.ticket || payload;
		} catch (err) {
			mapCrmError(err, "無法建立售後案件");
		}
	}
};

export default crmClient;
