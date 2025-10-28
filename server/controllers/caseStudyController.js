import CaseStudy from "../models/caseStudy.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse, errorResponse } from "../utils/responseHandler.js";
import fileUpload from "../utils/fileUpload.js";
import { performSearch } from "../utils/searchHelper.js";

class CaseStudyController {
	/**
	 * 獲取專案類型列表
	 */
	async getProjectTypes(req, res, next) {
		try {
			// 從 Schema 獲取 enum 值
			const projectTypeEnum = CaseStudy.schema.path("projectType").enumValues || [];
			return successResponse(res, StatusCodes.OK, "獲取專案類型成功", {
				projectTypes: projectTypeEnum
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 獲取所有合作案例
	 */
	async getAll(req, res, next) {
		try {
			const { page = 1, limit = 10, projectType, isActive, search, sort, sortDirection } = req.query;

			// 建立查詢條件
			const filter = {};
			if (projectType) filter.projectType = projectType;
			if (isActive !== undefined) filter.isActive = isActive === "true";

			// 解析排序
			const allowedSortFields = ["publishDate", "createdAt"];
			const sortField = allowedSortFields.includes(sort) ? sort : "publishDate";
			const sortDir = sortDirection === "asc" ? "asc" : "desc"; // 預設 desc

			// 定義搜尋欄位：標題、描述、解決方案
			const searchFields = ["title", "description", "solutions"];

			// 使用統一的 performSearch
			const searchResults = await performSearch({
				model: CaseStudy,
				keyword: search,
				additionalConditions: filter,
				searchFields: searchFields,
				sort: sortField,
				sortDirection: sortDir,
				page: parseInt(page),
				limit: parseInt(limit)
			});

			return successResponse(res, StatusCodes.OK, "獲取合作案例成功", {
				caseStudies: searchResults.items,
				pagination: {
					current: parseInt(page),
					total: Math.ceil(searchResults.total / parseInt(limit)),
					count: searchResults.total
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
			const { limit = 10, sort = "publishDate" } = req.query;

			// 建立查詢條件
			const filter = { projectType, isActive: true };

			// 使用統一的 performSearch（不需要關鍵字搜尋）
			const searchResults = await performSearch({
				model: CaseStudy,
				keyword: null,
				additionalConditions: filter,
				searchFields: ["title", "description", "solutions"],
				sort: sort,
				sortDirection: "desc",
				page: 1,
				limit: parseInt(limit)
			});

			return successResponse(res, StatusCodes.OK, "獲取專案類型案例成功", {
				caseStudies: searchResults.items
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * 建立新的合作案例
	 */
	async create(req, res, next) {
		try {
			// 處理不同的數據格式：FormData 或 JSON
			let caseStudyData;
			if (req.body.caseStudyData) {
				// 如果有 caseStudyData，表示是 FormData 格式
				try {
					caseStudyData = JSON.parse(req.body.caseStudyData);
				} catch (parseError) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "無效的案例數據格式");
				}
			} else {
				// 直接從 req.body 獲取數據
				caseStudyData = req.body;
			}

			const { title, companyName, description, projectType, solutions, coverImageUrl, isActive = false, author, publishDate } = caseStudyData;

			// 驗證必填欄位
			if (!title || !companyName || !description || !projectType || !author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "標題、公司名稱、描述、專案類型和作者為必填欄位");
			}

			// 驗證 solutions 陣列
			if (!solutions || !Array.isArray(solutions) || solutions.length === 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "解決方案不能為空");
			}

			// 建立案例
			const caseStudy = new CaseStudy({
				title,
				companyName,
				description,
				projectType,
				solutions,
				coverImageUrl,
				images: [],
				isActive,
				author,
				publishDate: publishDate ? new Date(publishDate) : new Date()
			});

			await caseStudy.save();

			// 處理封面圖上傳
			if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
				const entityContext = { id: caseStudy._id.toString(), name: caseStudy.title };
				const coverImageFile = req.files.coverImage[0];
				const coverImageUrl = fileUpload.saveAsset(
					coverImageFile.buffer,
					"case-studies",
					entityContext,
					"cover",
					coverImageFile.originalname,
					"case_study_cover"
				);
				caseStudy.coverImageUrl = coverImageUrl;
				await caseStudy.save();
			}

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

			// 處理不同的數據格式：FormData 或 JSON
			let updateData;
			if (req.body.caseStudyData) {
				// 如果有 caseStudyData，表示是 FormData 格式
				try {
					updateData = JSON.parse(req.body.caseStudyData);
				} catch (parseError) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "無效的案例數據格式");
				}
			} else {
				// 直接從 req.body 獲取數據
				updateData = { ...req.body };
			}

			// 移除不允許更新的欄位
			delete updateData._id;
			delete updateData.createdAt;
			delete updateData.updatedAt;

			// 獲取現有案例以處理圖片更新
			const existingCaseStudy = await CaseStudy.findById(id);
			if (!existingCaseStudy) {
				throw new ApiError(StatusCodes.NOT_FOUND, "合作案例不存在");
			}

			// 處理封面圖更新
			if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
				const entityContext = { id: existingCaseStudy._id.toString(), name: existingCaseStudy.title };
				const coverImageFile = req.files.coverImage[0];

				// 刪除舊封面圖
				if (existingCaseStudy.coverImageUrl && existingCaseStudy.coverImageUrl.startsWith("/storage")) {
					try {
						fileUpload.deleteFileByWebPath(existingCaseStudy.coverImageUrl);
					} catch (deleteError) {
						console.error("刪除舊封面圖失敗:", existingCaseStudy.coverImageUrl, deleteError);
					}
				}

				// 上傳新封面圖
				const coverImageUrl = fileUpload.saveAsset(
					coverImageFile.buffer,
					"case-studies",
					entityContext,
					"cover",
					coverImageFile.originalname,
					"case_study_cover"
				);
				updateData.coverImageUrl = coverImageUrl;
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

			// 套用更新到現有案例
			Object.keys(updateData).forEach((key) => {
				if (updateData[key] !== undefined) {
					existingCaseStudy[key] = updateData[key];
				}
			});

			// 使用 save() 以觸發 pre-save hook（會自動重新生成 slug）
			const caseStudy = await existingCaseStudy.save();

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

			// 刪除封面圖
			if (caseStudy.coverImageUrl && caseStudy.coverImageUrl.startsWith("/storage")) {
				try {
					fileUpload.deleteFileByWebPath(caseStudy.coverImageUrl);
				} catch (deleteError) {
					console.error("刪除封面圖失敗:", caseStudy.coverImageUrl, deleteError);
				}
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

			// 定義搜尋欄位：標題、描述、解決方案
			const searchFields = ["title", "description", "solutions"];

			// 使用統一的 performSearch
			const searchResults = await performSearch({
				model: CaseStudy,
				keyword: q.trim(),
				additionalConditions: { isActive: true },
				searchFields: searchFields,
				sort: "publishDate",
				sortDirection: "desc",
				page: parseInt(page),
				limit: parseInt(limit)
			});

			return successResponse(res, StatusCodes.OK, "搜尋完成", {
				caseStudies: searchResults.items,
				searchTerm: q.trim(),
				pagination: {
					current: parseInt(page),
					total: Math.ceil(searchResults.total / parseInt(limit)),
					count: searchResults.total
				}
			});
		} catch (error) {
			next(error);
		}
	}
}

export default new CaseStudyController();
