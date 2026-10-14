import { createHmac, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/responseHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

const DEFAULT_KID = "ys-hub-202610";
const DEFAULT_ISS = "https://api.yenshow.com";
const DEFAULT_AUD = "yenshow-crm-customer-hub";
const DEFAULT_TTL_SEC = 300;
/** 須與 CRM Hub 設定 services[].id 及 Bearer 服務身份一致（正式預設 yenshow-hub） */
const DEFAULT_SERVICE_ID = "yenshow-hub";

let cachedPrivateKey = null;
let cachedPrivateKeyPath = null;

const resolvePrivateKeyPath = () => {
	const fromEnv = process.env.CRM_HUB_JWT_PRIVATE_KEY_PATH;
	if (fromEnv) {
		return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(serverRoot, fromEnv);
	}
	return path.join(serverRoot, "secrets", "crm-hub", "private.pem");
};

const loadPrivateKey = () => {
	const keyPath = resolvePrivateKeyPath();
	if (cachedPrivateKey && cachedPrivateKeyPath === keyPath) {
		return cachedPrivateKey;
	}
	if (!fs.existsSync(keyPath)) {
		throw ApiError.internal("尚未設定 Customer Hub JWT 私鑰（CRM_HUB_JWT_PRIVATE_KEY_PATH）");
	}
	cachedPrivateKey = fs.readFileSync(keyPath, "utf8");
	cachedPrivateKeyPath = keyPath;
	return cachedPrivateKey;
};

const resolveSubHashSecret = () =>
	process.env.CRM_HUB_SUB_HASH_SECRET ||
	process.env.JWT_SECRET ||
	process.env.API_KEY ||
	"";

/**
 * 將 LINE user id 做成不可逆識別，不把原始 LINE ID 放進 JWT。
 */
export const opaqueSubFromLineUserId = (lineUserId) => {
	const secret = resolveSubHashSecret();
	if (!secret) {
		throw ApiError.internal("尚未設定 CRM_HUB_SUB_HASH_SECRET（或 JWT_SECRET）");
	}
	return createHmac("sha256", secret).update(String(lineUserId)).digest("hex");
};

/**
 * 簽發短效 X-Customer-Binding JWT（RS256）。
 * @param {{ crmCustomerId: string, lineUserId: string }} params
 * @returns {string}
 */
export const signCustomerBindingJwt = ({ crmCustomerId, lineUserId }) => {
	const customerId = String(crmCustomerId || "").trim();
	const lineId = String(lineUserId || "").trim();
	if (!customerId || !lineId) {
		throw ApiError.internal("簽發 Customer Binding JWT 缺少 customerId 或 lineUserId");
	}

	const kid = process.env.CRM_HUB_JWT_KID || DEFAULT_KID;
	const iss = process.env.CRM_HUB_JWT_ISS || DEFAULT_ISS;
	const aud = process.env.CRM_HUB_JWT_AUD || DEFAULT_AUD;
	const serviceId = String(process.env.CRM_HUB_SERVICE_ID || DEFAULT_SERVICE_ID).trim();
	const ttlSec = Number(process.env.CRM_HUB_JWT_TTL_SEC) || DEFAULT_TTL_SEC;
	const privateKey = loadPrivateKey();

	if (!serviceId) {
		throw ApiError.internal("尚未設定 CRM_HUB_SERVICE_ID");
	}

	return jwt.sign(
		{
			customerId,
			serviceId,
			jti: randomUUID()
		},
		privateKey,
		{
			algorithm: "RS256",
			keyid: kid,
			issuer: iss,
			audience: aud,
			subject: opaqueSubFromLineUserId(lineId),
			expiresIn: ttlSec
		}
	);
};

export default { signCustomerBindingJwt, opaqueSubFromLineUserId };
