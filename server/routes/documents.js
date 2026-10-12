import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import Products from "../models/products.js";
import { signDownloadToken } from "../utils/storageDownloadSign.js";
import DocumentDownloadToken from "../models/DocumentDownloadToken.js";

const router = express.Router();

const protectedPdfStoragePathRegex = /^products\/[^/]+\/documents\/.+\.pdf$/i;

const normalizeStoragePath = (documentUrl) => {
	if (!documentUrl || typeof documentUrl !== "string") return null;
	if (!documentUrl.startsWith("/storage/")) return null;
	const storagePath = documentUrl.replace(/^\/storage\//, "");
	if (!protectedPdfStoragePathRegex.test(storagePath)) return null;
	return storagePath;
};

/**
 * 校驗產品文件白名單並簽發短效下載 token
 * @param {{ productId: string, documentUrl: string, userId?: string|null, requireActive?: boolean }}
 */
const issueSpecificationDownload = async ({ productId, documentUrl, userId = null, requireActive = false }) => {
	if (!productId || typeof productId !== "string") {
		throw ApiError.badRequest("缺少或無效的 productId");
	}

	const storagePath = normalizeStoragePath(documentUrl);
	if (!storagePath) {
		throw ApiError.badRequest("缺少或無效的 documentUrl");
	}

	const product = await Products.findById(productId).select({
		documents: 1,
		documentsByLang: 1,
		isActive: 1
	});

	if (!product) {
		throw ApiError.notFound("找不到指定產品");
	}
	if (requireActive && product.isActive === false) {
		throw ApiError.notFound("找不到指定產品");
	}

	const allDocs = new Set([
		...(product.documents || []),
		...(product.documentsByLang?.TW || []),
		...(product.documentsByLang?.EN || [])
	]);

	const expectedDocumentUrl = `/storage/${storagePath}`;
	if (!allDocs.has(expectedDocumentUrl)) {
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

// GET /api/documents/specifications/presign — 官網登入後下載
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

// GET /api/documents/specifications/public-url — LIFF 免登入下載
router.get("/specifications/public-url", async (req, res, next) => {
	try {
		const result = await issueSpecificationDownload({
			productId: req.query.productId,
			documentUrl: req.query.documentUrl,
			userId: null,
			requireActive: true
		});
		return res.status(StatusCodes.OK).json({
			success: true,
			message: "取得公開下載連結成功",
			result
		});
	} catch (error) {
		return next(error);
	}
});

export default router;
