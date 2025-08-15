import Faq from "../../models/Faq.js";
import { EntityController } from "../EntityController.js";
import { ApiError } from "../../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import { Permissions } from "../../middlewares/permission.js";
import fileUpload from "../../utils/fileUpload.js";

class FaqController extends EntityController {
	constructor() {
		super(Faq, {
			entityName: "faqs", // Adjusted to singular for consistency with responseKey
			responseKey: "faqs",
			basicFields: [
				"question",
				"answer",
				"summary",
				"category",
				"isActive",
				"publishDate",
				"author",
				"productModel",
				"videoUrl",
				"imageUrl",
				"documentUrl",
				"relatedFaqs",
				"createdAt",
				"updatedAt"
			]
		});
		if (this._prepareFaqData) {
			this._prepareFaqData = this._prepareFaqData.bind(this);
		}
	}

	// 取得 FAQ 主分類清單
	getCategories = async (req, res, next) => {
		try {
			const categories = Faq.schema.path("category.main").enumValues || [];
			this._sendResponse(res, StatusCodes.OK, `分類清單獲取成功`, { categories });
		} catch (error) {
			this._handleError(error, "獲取分類清單", next);
		}
	};

	getAllItems = async (req, res, next) => {
		try {
			const { category, sort, sortDirection, page, limit } = req.query;

			const query = {};
			if (this._shouldFilterActive(req)) {
				query.isActive = true;
			}
			if (category) {
				query["category.main"] = category;
			}

			const allowedSortFields = ["publishDate", "createdAt"];
			const sortField = allowedSortFields.includes(sort) ? sort : "publishDate";
			const order = sortDirection === "asc" ? 1 : -1;
			const sortOption = sortField === "createdAt" ? { createdAt: order } : { [sortField]: order, createdAt: -1 };

			const pageNum = Math.max(parseInt(page) || 1, 1);
			const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
			const skip = (pageNum - 1) * limitNum;

			const total = await this.model.countDocuments(query);
			const items = await this.model.find(query).sort(sortOption).skip(skip).limit(limitNum).populate("relatedFaqs", "question.TW slug");

			const formattedItems = items.map((item) => this.entityService.formatOutput(item));
			this._sendResponse(res, StatusCodes.OK, `常見問題列表獲取成功`, {
				[this.responseKey]: formattedItems,
				pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
			});
		} catch (error) {
			this._handleError(error, "獲取列表", next);
		}
	};

	getItemBySlug = async (req, res, next) => {
		try {
			const { slug } = req.params;
			const query = { slug: slug };
			const userRole = req.accessContext?.userRole;

			if (userRole !== Permissions.ADMIN && userRole !== Permissions.STAFF) {
				query.isActive = true;
			}

			const item = await this.model.findOne(query).populate("relatedFaqs", "question.TW slug");
			if (!item) {
				throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);
			}

			const formattedItem = this.entityService.formatOutput(item);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 獲取成功`, { [this.responseKey]: formattedItem });
		} catch (error) {
			this._handleError(error, "獲取", next);
		}
	};

	async _prepareFaqData(req, isUpdate = false, existingFaq = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.faqDataPayload) {
			try {
				rawData = JSON.parse(req.body.faqDataPayload);
			} catch (e) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 faqDataPayload JSON 字串");
			}
		} else {
			rawData = { ...req.body };
		}

		const data = { ...rawData };
		const files = req.files || {};
		const userRole = req.accessContext?.userRole;

		// For file uploads and deletions
		data._pendingImages = files.faqImages || [];
		data._pendingVideos = files.faqVideos || [];
		data._pendingDocuments = files.faqDocuments || [];

		let imagePathsToDelete = [];
		let videoPathsToDelete = [];
		let documentPathsToDelete = [];

		if (isUpdate && data._id) {
			delete data._id;
		}

		// Context for file path generation
		let faqQuestionTwForContext = "untitled_faq";
		if (data.question?.TW) {
			faqQuestionTwForContext = data.question.TW;
		} else if (isUpdate && existingFaq?.question?.TW) {
			faqQuestionTwForContext = existingFaq.question.TW;
		}

		// Validation
		if (!data.question?.TW && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文問題為必填");
		if (!data.answer?.TW && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文答案為必填");
		if (data.answer) {
			const validateTiptap = (content, fieldName) => {
				if (!content || typeof content !== "object" || content.type !== "doc" || !Array.isArray(content.content)) {
					throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldName} 的內容格式無效，不是一個有效的 Tiptap document`);
				}
				// 基礎的空內容檢查：一個段落節點，且沒有內容
				const isEmpty = content.content.length === 1 && content.content[0].type === "paragraph" && !content.content[0].content;
				if (content.content.length === 0 || isEmpty) {
					// 允許儲存空內容，但可以在此處添加邏輯（如果需要）
				}
			};
			if (data.answer.TW) {
				validateTiptap(data.answer.TW, "繁體中文答案 (TW)");
			}
			if (data.answer.EN) {
				validateTiptap(data.answer.EN, "英文答案 (EN)");
			}
		}
		if (!data.author && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "作者為必填");
		if (!data.category?.main && !isUpdate) throw new ApiError(StatusCodes.BAD_REQUEST, "主分類為必填");

		if (userRole !== Permissions.ADMIN) {
			if (!isUpdate) data.isActive = false;
			else delete data.isActive;
		} else {
			if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `isActive 欄位必須是布林值`);
			}
			if (!isUpdate && data.isActive === undefined) data.isActive = false;
		}

		// Handle file URL arrays and deletions
		const manageFileArray = (clientUrls, existingUrls, pendingFiles, pathsToDelete) => {
			const finalUrls = Array.isArray(clientUrls) ? [...clientUrls] : [];
			if (isUpdate && existingUrls) {
				existingUrls.forEach((oldUrl) => {
					if (oldUrl.startsWith("/storage/") && !finalUrls.includes(oldUrl)) {
						pathsToDelete.push(oldUrl);
					}
				});
			}
			// Placeholder for new files, actual upload happens in controller action
			pendingFiles.forEach((_, index) => {
				finalUrls.push(`__PENDING_FILE_PLACEHOLDER_${index}__`);
			});
			return finalUrls;
		};

		data.imageUrl = manageFileArray(data.imageUrl, existingFaq?.imageUrl, data._pendingImages, imagePathsToDelete);
		data.videoUrl = manageFileArray(data.videoUrl, existingFaq?.videoUrl, data._pendingVideos, videoPathsToDelete);
		data.documentUrl = manageFileArray(data.documentUrl, existingFaq?.documentUrl, data._pendingDocuments, documentPathsToDelete);

		return {
			processedData: data,
			imagePathsToDelete,
			videoPathsToDelete,
			documentPathsToDelete,
			faqQuestionTwForContext
		};
	}

	async _uploadAndSetUrls(entity, entityId, entityContext, pendingFiles, assetCategory, assetPrefix) {
		const uploadedUrls = [];
		if (pendingFiles && pendingFiles.length > 0) {
			for (const file of pendingFiles) {
				try {
					const newUrl = fileUpload.saveAsset(file.buffer, "faqs", entityContext, assetCategory, file.originalname, assetPrefix);
					uploadedUrls.push(newUrl);
				} catch (uploadError) {
					console.error(`FAQ ${assetCategory}上傳失敗:`, uploadError);
					// Optionally, decide if an error here should halt everything
					// or if null/marker should be pushed to indicate failure
				}
			}
		}
		return uploadedUrls;
	}

	createItem = async (req, res, next) => {
		let rawNewItem;
		try {
			const { processedData, faqQuestionTwForContext } = await this._prepareFaqData(req, false, null);

			const pendingImages = processedData._pendingImages || [];
			const pendingVideos = processedData._pendingVideos || [];
			const pendingDocuments = processedData._pendingDocuments || [];

			// Remove temporary/internal fields before saving to DB
			delete processedData._pendingImages;
			delete processedData._pendingVideos;
			delete processedData._pendingDocuments;
			// Clear placeholder URLs, they will be populated after upload
			processedData.imageUrl = [];
			processedData.videoUrl = [];
			processedData.documentUrl = [];

			rawNewItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			const faqId = rawNewItem._id.toString();
			const entityContext = { id: faqId, name: faqQuestionTwForContext };
			let itemChangedByFileUpload = false;

			const uploadedImageUrls = await this._uploadAndSetUrls(rawNewItem, faqId, entityContext, pendingImages, "images", "faq_img");
			if (uploadedImageUrls.length > 0) {
				rawNewItem.imageUrl = uploadedImageUrls;
				itemChangedByFileUpload = true;
			}

			const uploadedVideoUrls = await this._uploadAndSetUrls(rawNewItem, faqId, entityContext, pendingVideos, "videos", "faq_vid");
			if (uploadedVideoUrls.length > 0) {
				rawNewItem.videoUrl = uploadedVideoUrls;
				itemChangedByFileUpload = true;
			}

			const uploadedDocumentUrls = await this._uploadAndSetUrls(rawNewItem, faqId, entityContext, pendingDocuments, "documents", "faq_doc");
			if (uploadedDocumentUrls.length > 0) {
				rawNewItem.documentUrl = uploadedDocumentUrls;
				itemChangedByFileUpload = true;
			}

			if (itemChangedByFileUpload) {
				rawNewItem = await rawNewItem.save({ session: req.dbSession });
			}

			const formattedNewItem = this.entityService.formatOutput(rawNewItem);
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: formattedNewItem });
		} catch (error) {
			this._handleError(error, "創建", next);
		}
	};

	updateItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const existingItem = await this.model.findById(id);
			if (!existingItem) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			const { processedData, imagePathsToDelete, videoPathsToDelete, documentPathsToDelete, faqQuestionTwForContext } = await this._prepareFaqData(
				req,
				true,
				existingItem
			);

			const faqId = existingItem._id.toString();
			const entityContext = { id: faqId, name: faqQuestionTwForContext };

			const pendingImages = processedData._pendingImages || [];
			const pendingVideos = processedData._pendingVideos || [];
			const pendingDocuments = processedData._pendingDocuments || [];

			delete processedData._pendingImages;
			delete processedData._pendingVideos;
			delete processedData._pendingDocuments;

			const updatePayload = { ...processedData };

			// Process new uploads and merge with existing URLs
			const newImageUrls = await this._uploadAndSetUrls(existingItem, faqId, entityContext, pendingImages, "images", "faq_img");
			updatePayload.imageUrl = (updatePayload.imageUrl || []).filter((url) => !url.startsWith("__PENDING_FILE_PLACEHOLDER_")).concat(newImageUrls);

			const newVideoUrls = await this._uploadAndSetUrls(existingItem, faqId, entityContext, pendingVideos, "videos", "faq_vid");
			updatePayload.videoUrl = (updatePayload.videoUrl || []).filter((url) => !url.startsWith("__PENDING_FILE_PLACEHOLDER_")).concat(newVideoUrls);

			const newDocumentUrls = await this._uploadAndSetUrls(existingItem, faqId, entityContext, pendingDocuments, "documents", "faq_doc");
			updatePayload.documentUrl = (updatePayload.documentUrl || []).filter((url) => !url.startsWith("__PENDING_FILE_PLACEHOLDER_")).concat(newDocumentUrls);

			// Apply updates to the existing item
			Object.keys(updatePayload).forEach((key) => {
				if (updatePayload[key] !== undefined) {
					// Allow setting null or empty arrays
					existingItem[key] = updatePayload[key];
				}
			});

			const updatedItem = await existingItem.save({ session: req.dbSession });

			// Delete old files
			[...imagePathsToDelete, ...videoPathsToDelete, ...documentPathsToDelete].forEach((filePath) => {
				try {
					if (filePath && filePath.startsWith("/storage")) {
						fileUpload.deleteFileByWebPath(filePath);
						console.log("已刪除舊 FAQ 檔案:", filePath);
					}
				} catch (deleteError) {
					console.error("刪除舊 FAQ 檔案失敗:", filePath, deleteError);
				}
			});

			const formattedUpdatedItem = this.entityService.formatOutput(updatedItem);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 更新成功`, { [this.responseKey]: formattedUpdatedItem });
		} catch (error) {
			this._handleError(error, "更新", next);
		}
	};

	deleteItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const itemToDelete = await this.model.findById(id).lean();
			if (!itemToDelete) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			await this.entityService.delete(id, { session: req.dbSession });

			if (itemToDelete._id) {
				const questionForPath = itemToDelete.question?.TW || "untitled_faq";
				const entityContext = { id: itemToDelete._id.toString(), name: questionForPath };
				fileUpload.deleteEntityDirectory("faqs", entityContext);
			}

			res.status(StatusCodes.OK).json({ success: true, message: `${this.entityName} 刪除成功` });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	};
}

export default new FaqController();
