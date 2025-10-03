import CaseStudy from "../models/caseStudy.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse, errorResponse } from "../utils/responseHandler.js";
import { trackEvent } from "../services/analyticsService.js";
import fileUpload from "../utils/fileUpload.js";

class CaseStudyController {
	/**
	 * 獲取所有合作案例
	 */
	async getAll(req, res, next) {
		try {
			const { page = 1, limit = 10, projectType, isActive, isFeatured, search, sort = "-publishDate" } = req.query;

			// 建立查詢條件
			const filter = {};
			if (projectType) filter.projectType = projectType;
			if (isActive !== undefined) filter.isActive = isActive === "true";
			if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

			// 搜尋功能
			let query = CaseStudy.find(filter);
			if (search) {
				query = CaseStudy.search(search, { sort });
			} else {
				query = query.sort(sort);
			}

			// 分頁設定
			const skip = (parseInt(page) - 1) * parseInt(limit);
			query = query.skip(skip).limit(parseInt(limit));

			// 執行查詢
			const [caseStudies, total] = await Promise.all([query.lean(), search ? CaseStudy.countDocuments(filter) : CaseStudy.countDocuments(filter)]);

			// 從請求中獲取網站資訊
			const site = req.headers["x-app-context"] || "comeo";

			// GA 追蹤
			await trackEvent(
				req.user?.id || "anonymous",
				"case_studies_view",
				{
					page: parseInt(page),
					projectType: projectType || "all",
					search_term: search || null
				},
				site
			);

			return successResponse(res, StatusCodes.OK, "獲取合作案例成功", {
				caseStudies,
				pagination: {
					current: parseInt(page),
					total: Math.ceil(total / parseInt(limit)),
					count: total
				}
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 獲取單一合作案例
	 */
	async getById(req, res, next) {
		try {
			const { id } = req.params;
			const caseStudy = await CaseStudy.findById(id);

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// GA 追蹤
			// 從請求中獲取網站資訊
			const site = req.headers["x-app-context"] || "comeo";

			await trackEvent(
				req.user?.id || "anonymous",
				"case_study_view",
				{
					case_id: caseStudy._id,
					case_title: caseStudy.title,
					project_type: caseStudy.projectType
				},
				site
			);

			return successResponse(res, StatusCodes.OK, "獲取合作案例成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 根據 slug 獲取合作案例
	 */
	async getBySlug(req, res, next) {
		try {
			const { slug } = req.params;
			const caseStudy = await CaseStudy.findOne({ slug, isActive: true });

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// GA 追蹤
			// 從請求中獲取網站資訊
			const site = req.headers["x-app-context"] || "comeo";

			await trackEvent(
				req.user?.id || "anonymous",
				"case_study_view",
				{
					case_id: caseStudy._id,
					case_title: caseStudy.title,
					project_type: caseStudy.projectType
				},
				site
			);

			return successResponse(res, StatusCodes.OK, "獲取合作案例成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 獲取精選案例
	 */
	async getFeatured(req, res, next) {
		try {
			const { limit = 6 } = req.query;
			const caseStudies = await CaseStudy.findFeatured(parseInt(limit));

			return successResponse(res, StatusCodes.OK, "獲取精選案例成功", { caseStudies });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 根據專案類型獲取案例
	 */
	async getByProjectType(req, res, next) {
		try {
			const { projectType } = req.params;
			const { limit = 10, sort = "-publishDate" } = req.query;

			const caseStudies = await CaseStudy.findByProjectType(projectType, {
				sort,
				limit: parseInt(limit)
			});

			return successResponse(res, StatusCodes.OK, "獲取專案類型案例成功", { caseStudies });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 建立新的合作案例
	 */
	async create(req, res, next) {
		try {
			const {
				title,
				description,
				projectType,
				solutions,
				results,
				images,
				isActive = false,
				author,
				publishDate,
				tags = [],
				isFeatured = false,
				featuredOrder = 0
			} = req.body;

			// 驗證必填欄位
			if (!title || !description || !projectType || !author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "標題、描述、專案類型和作者為必填欄位");
			}

			// 驗證 solutions 和 results 陣列
			if (!solutions || !Array.isArray(solutions) || solutions.length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "解決方案不能為空");
			}

			if (!results || !Array.isArray(results) || results.length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "成效不能為空");
			}

			// 建立案例
			const caseStudy = new CaseStudy({
				title,
				description,
				projectType,
				solutions,
				results,
				images: [],
				isActive,
				author,
				publishDate: publishDate ? new Date(publishDate) : new Date(),
				tags,
				isFeatured,
				featuredOrder
			});

			await caseStudy.save();

			// 處理檔案上傳
			if (req.files && req.files.images && req.files.images.length > 0) {
				const entityContext = { id: caseStudy._id.toString(), name: caseStudy.title };
				const uploadedImages = [];

				for (const file of req.files.images) {
					const imageUrl = fileUpload.saveAsset(file.buffer, "case-studies", entityContext, "images", file.originalname, "case_study");
					uploadedImages.push(imageUrl);
				}

				caseStudy.images = uploadedImages;
				await caseStudy.save();
			}

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_create", {
				case_id: caseStudy._id,
				project_type: caseStudy.projectType,
				solutions_count: caseStudy.solutions.length
			});

			return successResponse(res, StatusCodes.CREATED, "合作案例建立成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 更新合作案例
	 */
	async update(req, res, next) {
		try {
			const { id } = req.params;
			const updateData = req.body;

			// 移除不允許更新的欄位
			delete updateData._id;
			delete updateData.createdAt;
			delete updateData.updatedAt;

			// 如果更新標題，清除 slug 讓它重新生成
			if (updateData.title) {
				updateData.slug = undefined;
			}

			const caseStudy = await CaseStudy.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_update", {
				case_id: caseStudy._id,
				project_type: caseStudy.projectType
			});

			return successResponse(res, StatusCodes.OK, "合作案例更新成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 刪除合作案例
	 */
	async delete(req, res, next) {
		try {
			const { id } = req.params;
			const caseStudy = await CaseStudy.findById(id);

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// 從資料庫刪除
			await CaseStudy.findByIdAndDelete(id);

			// 刪除相關檔案目錄
			const entityContext = { id, name: caseStudy.title };
			fileUpload.deleteEntityDirectory("case-studies", entityContext);

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_delete", {
				case_id: caseStudy._id,
				project_type: caseStudy.projectType
			});

			return successResponse(res, StatusCodes.OK, "合作案例刪除成功");
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 切換案例啟用狀態
	 */
	async toggleStatus(req, res, next) {
		try {
			const { id } = req.params;
			const caseStudy = await CaseStudy.findById(id);

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			caseStudy.isActive = !caseStudy.isActive;
			await caseStudy.save();

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_toggle_status", {
				case_id: caseStudy._id,
				new_status: caseStudy.isActive
			});

			return successResponse(res, StatusCodes.OK, `案例已${caseStudy.isActive ? "啟用" : "停用"}`, { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 上傳案例圖片
	 */
	async uploadImages(req, res, next) {
		try {
			const { id } = req.params;
			const files = req.files;

			if (!files || files.length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "請選擇要上傳的圖片");
			}

			const caseStudy = await CaseStudy.findById(id);
			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			const newImages = [];

			// 使用統一的檔案處理邏輯
			for (const file of files) {
				const imageUrl = fileUpload.saveAsset(
					file.buffer,
					"case-studies", // entityType
					{ id, name: caseStudy.title }, // entityContext
					"images", // assetCategory
					file.originalname,
					"case_study" // assetPrefix
				);
				newImages.push(imageUrl);
			}

			// 將新圖片加入現有圖片陣列
			caseStudy.images.push(...newImages);
			await caseStudy.save();

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_upload_images", {
				case_id: caseStudy._id,
				images_count: newImages.length
			});

			return successResponse(res, StatusCodes.OK, "圖片上傳成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 刪除案例圖片
	 */
	async deleteImage(req, res, next) {
		try {
			const { id, imageUrl } = req.params;
			const caseStudy = await CaseStudy.findById(id);

			if (!caseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// 使用統一的檔案刪除邏輯
			const deleted = fileUpload.deleteFileByWebPath(imageUrl);

			if (deleted) {
				// 從資料庫中移除圖片 URL
				caseStudy.images = caseStudy.images.filter((img) => img !== imageUrl);
				await caseStudy.save();
			}

			// GA 追蹤
			await trackEvent(req.user.id, "case_study_delete_image", {
				case_id: caseStudy._id
			});

			return successResponse(res, StatusCodes.OK, "圖片刪除成功", { caseStudy });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 搜尋案例
	 */
	async search(req, res, next) {
		try {
			const { q, page = 1, limit = 10 } = req.query;

			if (!q || q.trim().length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "搜尋關鍵字不能為空");
			}

			const skip = (parseInt(page) - 1) * parseInt(limit);
			const caseStudies = await CaseStudy.search(q.trim(), {
				sort: "-publishDate",
				skip,
				limit: parseInt(limit)
			});

			// 從請求中獲取網站資訊
			const site = req.headers["x-app-context"] || "comeo";

			// GA 追蹤
			await trackEvent(
				req.user?.id || "anonymous",
				"case_study_search",
				{
					search_term: q.trim(),
					results_count: caseStudies.length
				},
				site
			);

			return successResponse(res, StatusCodes.OK, "搜尋完成", {
				caseStudies,
				searchTerm: q.trim(),
				pagination: {
					current: parseInt(page),
					limit: parseInt(limit)
				}
			});
		} catch (error) {
			next(error);
		}
	}
}

export default new CaseStudyController();
