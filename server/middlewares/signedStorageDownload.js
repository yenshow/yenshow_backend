import { verifyDownloadToken } from "../utils/storageDownloadSign.js";
import DocumentDownloadToken from "../models/DocumentDownloadToken.js";
import { getPublicSiteUrl } from "../utils/publicUrls.js";
import { fullyDecodeUri } from "../utils/fullyDecodeUri.js";

// req.path 在 mount("/storage") 後通常為 "/products/<id>/documents/<file>.pdf"
const protectedPdfRegex = /^\/?products\/[^/]+\/documents\/.+\.pdf$/i;

const getFullStoragePathFromReq = (req) => {
	const p = fullyDecodeUri(req.path || "");
	const normalized = p.startsWith("/") ? p : `/${p}`;
	return `/storage${normalized}`;
};

/**
 * 網址列直接開 PDF → 導向官網換證頁。
 * fetch / XHR（Sec-Fetch-Dest: empty 或 Accept: application/json）→ JSON 403。
 */
const prefersHtmlNavigation = (req) => {
	if (req.method !== "GET" && req.method !== "HEAD") return false;
	if (req.headers["x-requested-with"] === "XMLHttpRequest") return false;

	const accept = req.headers.accept || "";
	if (accept.includes("application/json") && !accept.includes("text/html")) return false;

	const fetchDest = req.headers["sec-fetch-dest"];
	if (fetchDest === "empty") return false;

	return (
		accept.includes("text/html") ||
		fetchDest === "document" ||
		req.headers["sec-fetch-mode"] === "navigate" ||
		!accept
	);
};

const respondAccessDenied = (req, res, jsonBody) => {
	if (prefersHtmlNavigation(req)) {
		const target = `${getPublicSiteUrl()}/documents/open?path=${encodeURIComponent(getFullStoragePathFromReq(req))}`;
		return res.redirect(302, target);
	}
	return res.status(403).json(jsonBody);
};

/**
 * 受保護 PDF：`/storage/products/<id>/documents/<file>.pdf` 需短效簽章 token。
 * Express req.path 常保留 percent-encoding，比對 token.sp 前需 decode。
 */
export const signedStorageDownloadMiddleware = async (req, res, next) => {
	const setProtectedHeaders = () => {
		res.setHeader("Cache-Control", "private, no-store, must-revalidate");
		res.locals.signedProtectedPdf = true;
	};

	const isRangeGraceAllowed = ({ usedAt, now }) => {
		if (!req.headers.range || !usedAt) return false;
		return now.getTime() - usedAt.getTime() <= 5000;
	};

	try {
		const decodedPath = fullyDecodeUri(req.path || "");
		if (!protectedPdfRegex.test(decodedPath)) return next();

		const storagePath = decodedPath.replace(/^\/+/, "");
		const dlToken = req.query.dl;
		if (!dlToken || typeof dlToken !== "string") {
			return respondAccessDenied(req, res, { success: false, message: "需要有效的下載憑證" });
		}

		const payload = verifyDownloadToken(dlToken);
		if (!payload) {
			return respondAccessDenied(req, res, { success: false, message: "下載憑證無效或已過期" });
		}
		if (payload.sp !== storagePath) {
			return respondAccessDenied(req, res, { success: false, message: "下載憑證不匹配檔案" });
		}

		const now = new Date();
		const tokenRecord = await DocumentDownloadToken.findOne({
			tokenId: payload.jti,
			storagePath: payload.sp
		});
		if (!tokenRecord) {
			return respondAccessDenied(req, res, { success: false, message: "下載憑證無法使用" });
		}

		if (req.method && req.method.toUpperCase() === "HEAD") {
			setProtectedHeaders();
			return next();
		}

		if (!tokenRecord.usedAt) {
			const consumed = await DocumentDownloadToken.findOneAndUpdate(
				{ tokenId: payload.jti, storagePath: payload.sp, usedAt: null },
				{ $set: { usedAt: now } },
				{ new: true }
			);
			if (consumed) {
				setProtectedHeaders();
				return next();
			}

			const latest = await DocumentDownloadToken.findOne({
				tokenId: payload.jti,
				storagePath: payload.sp
			});
			if (isRangeGraceAllowed({ usedAt: latest?.usedAt, now })) {
				setProtectedHeaders();
				return next();
			}
			return respondAccessDenied(req, res, { success: false, message: "一次性下載憑證已使用" });
		}

		if (isRangeGraceAllowed({ usedAt: tokenRecord.usedAt, now })) {
			setProtectedHeaders();
			return next();
		}
		return respondAccessDenied(req, res, { success: false, message: "一次性下載憑證已使用" });
	} catch {
		return respondAccessDenied(req, res, { success: false, message: "下載憑證驗證失敗" });
	}
};
