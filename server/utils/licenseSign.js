import crypto from "crypto";

const getSignSecret = () => {
	const secret = process.env.LICENSE_SIGN_SECRET;
	if (!secret) {
		throw new Error("LICENSE_SIGN_SECRET 環境變數未設定，無法進行離線授權簽名");
	}
	return secret;
};

/**
 * 將 payload 的 key 排序後序列化為 JSON
 * 確保簽名/驗簽時資料順序一致
 */
const canonicalize = (payload) => {
	const sorted = Object.keys(payload)
		.sort()
		.reduce((acc, key) => {
			acc[key] = payload[key];
			return acc;
		}, {});
	return JSON.stringify(sorted);
};

/**
 * 對授權回應資料進行 HMAC-SHA256 簽名
 * @param {Object} payload - 不含 signature 欄位的資料
 * @returns {string} hex 格式的簽名字串
 */
export const signLicensePayload = (payload) => {
	const secret = getSignSecret();
	const data = canonicalize(payload);
	return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

/**
 * 驗證授權回應資料的 HMAC-SHA256 簽名
 * @param {Object} payload - 不含 signature 欄位的資料
 * @param {string} signature - 要驗證的 hex 簽名字串
 * @returns {boolean} 簽名是否有效
 */
export const verifyLicenseSignature = (payload, signature) => {
	try {
		const expected = signLicensePayload(payload);
		return crypto.timingSafeEqual(
			Buffer.from(expected, "hex"),
			Buffer.from(signature, "hex")
		);
	} catch {
		return false;
	}
};
