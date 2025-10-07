import CaseStudy from "../models/caseStudy.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse, errorResponse } from "../utils/responseHandler.js";
import fileUpload from "../utils/fileUpload.js";

class CaseStudyController {
	/**
	 * 獲取所有合作案例
	 */
	async getAll(req, res, next) {
		try {
			const { page = 1, limit = 10, projectType, isActive, search, sort = "-publishDate" } = req.query;

			// 建立查詢條件
			const filter = {};
			if (projectType) filter.projectType = projectType;
			if (isActive !== undefined) filter.isActive = isActive === "true";

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

			return successResponse(res, StatusCodes.OK, "獲取合作案例成功", { caseStudy });
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
			const { title, description, projectType, solutions, isActive = false, author, publishDate } = req.body;

			// 驗證必填欄位
			if (!title || !description || !projectType || !author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "標題、描述、專案類型和作者為必填欄位");
			}

			// 驗證 solutions 陣列
			if (!solutions || !Array.isArray(solutions) || solutions.length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "解決方案不能為空");
			}

			// 建立案例
			const caseStudy = new CaseStudy({
				title,
				description,
				projectType,
				solutions,
				images: [],
				isActive,
				author,
				publishDate: publishDate ? new Date(publishDate) : new Date()
			});

			await caseStudy.save();

			// 處理檔案上傳 - 整合到主要創建流程中
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
			const updateData = { ...req.body };

			// 移除不允許更新的欄位
			delete updateData._id;
			delete updateData.createdAt;
			delete updateData.updatedAt;

			// 如果更新標題，清除 slug 讓它重新生成
			if (updateData.title) {
				updateData.slug = undefined;
			}

			// 獲取現有案例以處理圖片更新
			const existingCaseStudy = await CaseStudy.findById(id);
			if (!existingCaseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// 處理圖片更新
			if (req.files && req.files.images && req.files.images.length > 0) {
				const entityContext = { id: existingCaseStudy._id.toString(), name: existingCaseStudy.title };
				const uploadedImages = [];

				// 刪除舊圖片
				if (existingCaseStudy.images && existingCaseStudy.images.length > 0) {
					for (const oldImageUrl of existingCaseStudy.images) {
						if (oldImageUrl && oldImageUrl.startsWith("/storage")) {
							try {
								fileUpload.deleteFileByWebPath(oldImageUrl);
							} catch (deleteError) {
								console.error("刪除舊圖片失敗:", oldImageUrl, deleteError);
							}
						}
					}
				}

				// 上傳新圖片
				for (const file of req.files.images) {
					const imageUrl = fileUpload.saveAsset(file.buffer, "case-studies", entityContext, "images", file.originalname, "case_study");
					uploadedImages.push(imageUrl);
				}

				updateData.images = uploadedImages;
			}

			// 處理狀態更新 - 整合狀態管理功能
			if (updateData.isActive !== undefined) {
				// 驗證 isActive 欄位
				if (typeof updateData.isActive !== "boolean") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "isActive 欄位必須是布林值");
				}
			}

			const caseStudy = await CaseStudy.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

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

			return successResponse(res, StatusCodes.OK, "合作案例刪除成功");
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
