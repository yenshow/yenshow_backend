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

	// /storage/products/<id>/documents/<file>.pdf -> products/<id>/documents/<file>.pdf
	const storagePath = documentUrl.replace(/^\/storage\//, "");
	if (!protectedPdfStoragePathRegex.test(storagePath)) return null;
	return storagePath;
};

// 取得短效 signed URL：讓前端下載 PDF 時無法繞過登入
// GET /api/documents/specifications/presign?productId=...&documentUrl=/storage/...
router.get("/specifications/presign", requireAuth, async (req, res, next) => {
	try {
		const { productId, documentUrl } = req.query;

		if (!productId || typeof productId !== "string") {
			throw ApiError.badRequest("缺少或無效的 productId");
		}

		const storagePath = normalizeStoragePath(documentUrl);
		if (!storagePath) {
			throw ApiError.badRequest("缺少或無效的 documentUrl");
		}

		const product = await Products.findById(productId).select({
			documents: 1,
			documentsByLang: 1
		});

		if (!product) {
			throw ApiError.notFound("找不到指定產品");
		}

		const allDocs = new Set([
			...(product.documents || []),
			...(product.documentsByLang?.TW || []),
			...(product.documentsByLang?.EN || [])
		]);

		// product.documents 裡是包含前導 /storage 的 url
		const expectedDocumentUrl = `/storage/${storagePath}`;
		if (!allDocs.has(expectedDocumentUrl)) {
			throw ApiError.forbidden("您無法下載此文件");
		}

		const expMs = Date.now() + 300 * 1000; // 300 秒
		const { token, jti } = signDownloadToken({ storagePath, expMs });

		// 一次性 token：先建立 token 記錄，後續 /storage 下載時會消耗
		await DocumentDownloadToken.create({
			tokenId: jti,
			storagePath,
			userId: req.user?._id?.toString?.() || null,
			expAt: new Date(expMs)
		});

		return res.status(StatusCodes.OK).json({
			success: true,
			message: "取得下載連結成功",
			result: {
				storagePath,
				token,
				expiresInSeconds: 300
			}
		});
	} catch (error) {
		return next(error);
	}
});

export default router;

