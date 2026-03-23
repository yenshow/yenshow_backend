import { verifyDownloadToken } from "../utils/storageDownloadSign.js";
import DocumentDownloadToken from "../models/DocumentDownloadToken.js";

// req.path 在 mount("/storage") 後通常會長得像 "/products/<id>/documents/<file>.pdf"
// 但為了降低比對差異，這裡同時支援帶/不帶前導 "/"。
const protectedPdfRegex = /^\/?products\/[^/]+\/documents\/.+\.pdf$/i;

const getFrontendBaseUrl = () => {
	return (process.env.FRONTEND_PUBLIC_URL || process.env.PUBLIC_SITE_URL || "https://www.yenshow.com").replace(/\/$/, "");
};

/**
 * 將 /storage mount 下的 req.path 轉成瀏覽器使用的完整路徑（含 /storage 前綴）
 */
const getFullStoragePathFromReq = (req) => {
	const p = req.path || "";
	const normalized = p.startsWith("/") ? p : `/${p}`;
	return `/storage${normalized}`;
};

/**
 * 一般使用者用網址列直接開 PDF 時，不應只看到 JSON；改導向官網「登入後下載」頁。
 * API/程式客戶端（Accept: application/json）仍回 JSON 403。
 */
const prefersHtmlNavigation = (req) => {
	if (req.method !== "GET" && req.method !== "HEAD") return false;
	if (req.headers["x-requested-with"] === "XMLHttpRequest") return false;

	const accept = req.headers.accept || "";
	if (accept.includes("application/json") && !accept.includes("text/html")) return false;

	return (
		accept.includes("text/html") ||
		req.headers["sec-fetch-dest"] === "document" ||
		req.headers["sec-fetch-mode"] === "navigate" ||
		!accept ||
		accept.includes("*/*")
	);
};

const respondAccessDenied = (req, res, jsonBody) => {
	if (prefersHtmlNavigation(req)) {
		const target = `${getFrontendBaseUrl()}/documents/open?path=${encodeURIComponent(getFullStoragePathFromReq(req))}`;
		return res.redirect(302, target);
	}

	return res.status(403).json(jsonBody);
};

/**
 * 為了避免使用者直接輸入 raw `/storage/...pdf` 繞過登入，
 * 僅在 `/storage/products/<id>/documents/<file>.pdf` 這類檔案需要帶短效簽章 token。
 */
export const signedStorageDownloadMiddleware = async (req, res, next) => {
	const setProtectedHeaders = () => {
		// 保證 signed PDF 不會被公共快取
		res.setHeader("Cache-Control", "private, no-store, must-revalidate");
		res.locals.signedProtectedPdf = true;
	};

	const isRangeGraceAllowed = ({ usedAt, now }) => {
		if (!req.headers.range) return false;
		if (!usedAt) return false;
		const deltaMs = now.getTime() - usedAt.getTime();
		return deltaMs <= 5000; // grace window：避免 PDF Range 造成一次性誤封
	};

	try {
		// mounted at "/storage" 後，req.path 會是相對於 storage 的路徑（例如 "/products/xxx/documents/a.pdf"）
		if (!protectedPdfRegex.test(req.path)) {
			return next();
		}

		const storagePath = req.path.replace(/^\/+/, "");

		const dlToken = req.query.dl;
		if (!dlToken || typeof dlToken !== "string") {
			return respondAccessDenied(req, res, {
				success: false,
				message: "需要有效的下載憑證"
			});
		}

		const payload = verifyDownloadToken(dlToken);
		if (!payload) {
			return respondAccessDenied(req, res, {
				success: false,
				message: "下載憑證無效或已過期"
			});
		}

		if (payload.sp !== storagePath) {
			return respondAccessDenied(req, res, {
				success: false,
				message: "下載憑證不匹配檔案"
			});
		}

		// 一次性 token：允許一次「開始下載」；但 PDF 可能會有 Range 請求
		const now = new Date();

		const tokenRecord = await DocumentDownloadToken.findOne({
			tokenId: payload.jti,
			storagePath: payload.sp
		});

		if (!tokenRecord) {
			return respondAccessDenied(req, res, {
				success: false,
				message: "下載憑證無法使用"
			});
		}

		// HEAD 只做驗簽與存取檢查，不消耗一次性 token
		if (req.method && req.method.toUpperCase() === "HEAD") {
			setProtectedHeaders();
			return next();
		}

		if (!tokenRecord.usedAt) {
			// 原子化消耗：避免同一 token 被同時多請求消耗兩次
			const consumed = await DocumentDownloadToken.findOneAndUpdate(
				{ tokenId: payload.jti, storagePath: payload.sp, usedAt: null },
				{ $set: { usedAt: now } },
				{ new: true }
			);

			if (consumed) {
				setProtectedHeaders();
				return next();
			}

			// 並發消耗：重新查 latest usedAt，若是 Range grace 允許則放行
			const latest = await DocumentDownloadToken.findOne({
				tokenId: payload.jti,
				storagePath: payload.sp
			});

			if (isRangeGraceAllowed({ usedAt: latest?.usedAt, now })) {
				setProtectedHeaders();
				return next();
			}

			return respondAccessDenied(req, res, {
				success: false,
				message: "一次性下載憑證已使用"
			});
		}

		// 已使用：僅允許短暫 Range grace
		if (isRangeGraceAllowed({ usedAt: tokenRecord.usedAt, now })) {
			setProtectedHeaders();
			return next();
		}

		return respondAccessDenied(req, res, {
			success: false,
			message: "一次性下載憑證已使用"
		});
	} catch {
		return respondAccessDenied(req, res, {
			success: false,
			message: "下載憑證驗證失敗"
		});
	}
};
