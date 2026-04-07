import crypto from "crypto";

const getSignSecret = () => {
	const secret = process.env.LICENSE_SIGN_SECRET;
	if (!secret) {
		throw new Error("LICENSE_SIGN_SECRET 環境變數未設定，無法進行離線授權簽名");
	}
	return secret;
};

/**
 * 深度排序 object key 後序列化為 JSON
 * 確保簽名時資料順序一致（包含 quotas 這類巢狀物件）
 */
const deepSort = (value) => {
	if (Array.isArray(value)) {
		return value.map((v) => deepSort(v));
	}
	if (value && typeof value === "object") {
		return Object.keys(value)
			.sort()
			.reduce((acc, key) => {
				acc[key] = deepSort(value[key]);
				return acc;
			}, {});
	}
	return value;
};

const canonicalize = (payload) => JSON.stringify(deepSort(payload));

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
