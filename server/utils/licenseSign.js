import crypto from "crypto";

const getSignSecret = () => {
	const secret = process.env.LICENSE_SIGN_SECRET;
	if (!secret) {
		throw new Error("LICENSE_SIGN_SECRET 環境變數未設定，無法進行離線授權簽名");
	}
	return secret;
};

const isPlainObject = (value) =>
	!!value && typeof value === "object" && !Array.isArray(value);

/**
 * 依 BA 規則 canonicalize：
 * - 移除 signature
 * - 其餘「第一層」key 以字母序排序（不做深層排序）
 * - JSON.stringify(sortedPayload)
 */
const canonicalize = (payload) => {
	const input = isPlainObject(payload) ? payload : {};
	const { signature: _signature, ...rest } = input;
	const sortedPayload = Object.keys(rest)
		.sort()
		.reduce((acc, key) => {
			acc[key] = rest[key];
			return acc;
		}, {});
	return JSON.stringify(sortedPayload);
};

/**
 * 對授權回應資料進行 HMAC-SHA256 簽名
 * @param {Object} payload - 授權 payload（可含或不含 signature）
 * @returns {string} hex 格式的簽名字串
 */
export const signLicensePayload = (payload) => {
	const secret = getSignSecret();
	const data = canonicalize(payload);
	return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

/**
 * 驗簽（與 BA 規則一致）
 * @param {Object} payloadWithSignature - 含 signature 欄位的 payload
 * @returns {boolean}
 */
export const verifyLicensePayloadSignature = (payloadWithSignature) => {
	if (!isPlainObject(payloadWithSignature)) return false;
	const { signature } = payloadWithSignature;
	if (typeof signature !== "string" || !signature) return false;
	const expected = signLicensePayload(payloadWithSignature);
	if (signature.length !== expected.length) return false;
	try {
		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
	} catch {
		return false;
	}
};
