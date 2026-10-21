import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireLineIdToken } from "../middlewares/lineIdToken.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import Products from "../models/products.js";
import { signDownloadToken } from "../utils/storageDownloadSign.js";
import DocumentDownloadToken from "../models/DocumentDownloadToken.js";
import { fullyDecodeUri } from "../utils/fullyDecodeUri.js";

const router = express.Router();

const protectedPdfStoragePathRegex = /^products\/[^/]+\/documents\/.+\.pdf$/i;

/** 絕對／相對網址 → storage 相對路徑（不含 /storage/） */
const toStoragePath = (documentUrl) => {
	if (!documentUrl || typeof documentUrl !== "string") return null;

	let url = fullyDecodeUri(documentUrl.trim());
	if (/^https?:\/\//i.test(url)) {
		try {
			url = fullyDecodeUri(new URL(url).pathname);
		} catch {
			return null;
		}
	}
	if (!url.startsWith("/")) url = `/${url}`;
	if (!url.startsWith("/storage/")) return null;

	const storagePath = url.slice("/storage/".length);
	if (!protectedPdfStoragePathRegex.test(storagePath)) return null;
	return storagePath;
};

const collectProductDocs = (product) =>
	[...(product.documents || []), ...(product.documentsByLang?.TW || []), ...(product.documentsByLang?.EN || [])].filter(Boolean);

/** 白名單比對（路徑全同，或同產品＋同檔名），回傳可用於簽章／讀檔的 storagePath */
const resolveWhitelistedStoragePath = (product, requestedStoragePath) => {
	const wantName = requestedStoragePath.split("/").pop();
	const wantPid = requestedStoragePath.split("/")[1];
	let byName = null;

	for (const doc of collectProductDocs(product)) {
		const path = toStoragePath(String(doc));
		if (!path) continue;
		if (path === requestedStoragePath) return path;
		if (!byName && path.split("/").pop() === wantName && path.split("/")[1] === wantPid) {
			byName = path;
		}
	}
	return byName;
};

/**
 * @param {{ productId: string, documentUrl: string, userId?: string|null }}
 */
const issueSpecificationDownload = async ({ productId, documentUrl, userId = null }) => {
	if (!productId || typeof productId !== "string") {
		throw ApiError.badRequest("缺少或無效的 productId");
	}

	const requestedStoragePath = toStoragePath(documentUrl);
	if (!requestedStoragePath) {
		throw ApiError.badRequest("缺少或無效的 documentUrl");
	}

	const product = await Products.findById(productId).select({
		documents: 1,
		documentsByLang: 1
	});

	if (!product) {
		throw ApiError.notFound("找不到指定產品");
	}

	const storagePath = resolveWhitelistedStoragePath(product, requestedStoragePath);
	if (!storagePath) {
		throw ApiError.forbidden("您無法下載此文件");
	}

	const expMs = Date.now() + 300 * 1000;
	const { token, jti } = signDownloadToken({ storagePath, expMs });

	await DocumentDownloadToken.create({
		tokenId: jti,
		storagePath,
		userId,
		expAt: new Date(expMs)
	});

	return { storagePath, token, expiresInSeconds: 300 };
};

// GET /api/documents/specifications/presign — 官網會員 JWT 登入後開啟
router.get("/specifications/presign", requireAuth, async (req, res, next) => {
	try {
		const result = await issueSpecificationDownload({
			productId: req.query.productId,
			documentUrl: req.query.documentUrl,
			userId: req.user?._id?.toString?.() || null
		});
		return res.status(StatusCodes.OK).json({
			success: true,
			message: "取得下載連結成功",
			result
		});
	} catch (error) {
		return next(error);
	}
});

// GET /api/documents/specifications/liff-presign — LINE LIFF idToken 登入後開啟（不需 CRM 綁定）
router.get("/specifications/liff-presign", requireLineIdToken, async (req, res, next) => {
	try {
		const lineUserId = req.lineUserId ? String(req.lineUserId) : null;
		const result = await issueSpecificationDownload({
			productId: req.query.productId,
			documentUrl: req.query.documentUrl,
			userId: lineUserId ? `line:${lineUserId}` : null
		});
		return res.status(StatusCodes.OK).json({
			success: true,
			message: "取得下載連結成功",
			result
		});
	} catch (error) {
		return next(error);
	}
});

export default router;
