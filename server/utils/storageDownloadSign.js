import crypto from "crypto";

const getDownloadSignSecret = () => {
	const secret = process.env.LICENSE_SIGN_SECRET;
	if (!secret) {
		throw new Error("LICENSE_SIGN_SECRET 環境變數未設定，無法進行下載簽名");
	}
	return secret;
};

const base64UrlEncode = (input) => {
	const b64 = Buffer.from(input, "utf8").toString("base64");
	return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

const base64UrlDecode = (input) => {
	const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
	// base64 需要補齊尾端 '='
	const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
	return Buffer.from(b64 + pad, "base64").toString("utf8");
};

/**
 * 簽名 token：
 * - payload 內容：{ sp: storagePath, exp: unix 秒 }
 * - token 格式：base64url(payloadJson).signatureHex
 */
export const signDownloadToken = ({ storagePath, expMs }) => {
	const secret = getDownloadSignSecret();

	if (!storagePath || typeof storagePath !== "string") {
		throw new Error("storagePath 無效");
	}
	if (!expMs || typeof expMs !== "number") {
		throw new Error("expMs 無效");
	}

	const jti = crypto.randomUUID();
	const payload = {
		sp: storagePath,
		exp: Math.floor(expMs / 1000),
		jti
	};

	const payloadJson = JSON.stringify(payload);
	const payloadB64Url = base64UrlEncode(payloadJson);
	const signatureHex = crypto.createHmac("sha256", secret).update(payloadB64Url).digest("hex");

	const token = `${payloadB64Url}.${signatureHex}`;
	return { token, jti };
};

/**
 * 驗簽 token：回傳 payload 或 null
 */
export const verifyDownloadToken = (token) => {
	if (!token || typeof token !== "string") return null;

	const parts = token.split(".");
	if (parts.length !== 2) return null;

	const [payloadB64Url, signatureHex] = parts;
	const secret = getDownloadSignSecret();

	const expectedSignatureHex = crypto.createHmac("sha256", secret).update(payloadB64Url).digest("hex");

	// timing-safe compare（確保 signature 長度一致）
	if (expectedSignatureHex.length !== signatureHex.length) return null;
	const expectedBuf = Buffer.from(expectedSignatureHex, "hex");
	const signatureBuf = Buffer.from(signatureHex, "hex");

	try {
		if (!crypto.timingSafeEqual(expectedBuf, signatureBuf)) return null;
	} catch {
		return null;
	}

	let payload;
	try {
		const payloadJson = base64UrlDecode(payloadB64Url);
		payload = JSON.parse(payloadJson);
	} catch {
		return null;
	}

	if (!payload || typeof payload !== "object") return null;
	if (!payload.sp || typeof payload.sp !== "string") return null;
	if (typeof payload.exp !== "number") return null;
	if (!payload.jti || typeof payload.jti !== "string") return null;

	const nowSec = Math.floor(Date.now() / 1000);
	if (payload.exp < nowSec) return null;

	return payload;
};

