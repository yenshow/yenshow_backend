import News from "../../models/News.js";
import { EntityController } from "../EntityController.js";
import { ApiError } from "../../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import fileUpload from "../../utils/fileUpload.js";
import { Permissions } from "../../middlewares/permission.js";
import { newsCategoryMainTwToEn } from "../../constants/mainCategories.js";

export const NEWS_NEW_FILE_MARKER = "__NEWS_NEW_FILE__";

const defaultEmptyDoc = () => ({ type: "doc", content: [{ type: "paragraph" }] });

function validateTiptapDoc(content, fieldLabel) {
	if (!content || typeof content !== "object" || content.type !== "doc" || !Array.isArray(content.content)) {
		throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldLabel} 的內容格式無效，不是有效的 Tiptap document`);
	}
}

function validateArticle(article, isCreate) {
	if (!article || typeof article !== "object") {
		throw new ApiError(StatusCodes.BAD_REQUEST, "article 格式無效");
	}
	if (article.TW) {
		validateTiptapDoc(article.TW, "article.TW");
	}
	if (article.EN) {
		validateTiptapDoc(article.EN, "article.EN");
	}
	if (!isCreate) {
		return;
	}
	const twEmpty =
		!article.TW ||
		article.TW.content?.length === 0 ||
		(article.TW.content?.length === 1 && article.TW.content[0].type === "paragraph" && !article.TW.content[0].content);
	const enEmpty =
		!article.EN ||
		article.EN.content?.length === 0 ||
		(article.EN.content?.length === 1 && article.EN.content[0].type === "paragraph" && !article.EN.content[0].content);
	if (twEmpty && enEmpty) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文或英文主要內容至少需填寫一種語言");
	}
}

function collectStoragePathsFromPlain(obj) {
	const paths = [];
	if (!obj) {
		return paths;
	}
	if (obj.coverImageUrl && typeof obj.coverImageUrl === "string" && obj.coverImageUrl.startsWith("/storage")) {
		paths.push(obj.coverImageUrl);
	}
	for (const r of obj.attachmentImages || []) {
		if (r.url && r.url.startsWith("/storage")) {
			paths.push(r.url);
		}
	}
	for (const r of obj.attachmentVideos || []) {
		if (r.source === "upload" && r.url && r.url.startsWith("/storage")) {
			paths.push(r.url);
		}
	}
	for (const r of obj.attachmentDocuments || []) {
		if (r.url && r.url.startsWith("/storage")) {
			paths.push(r.url);
		}
	}
	return paths;
}

function validateAttachmentPayload(data) {
	for (const r of data.attachmentImages || []) {
		if (typeof r !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "attachmentImages 項目格式無效");
		}
		const url = r.url;
		if (!url || (url !== NEWS_NEW_FILE_MARKER && typeof url !== "string")) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "圖片附件需有 url 或新檔標記");
		}
	}
	for (const r of data.attachmentVideos || []) {
		if (!r || typeof r !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "attachmentVideos 項目格式無效");
		}
		if (!["upload", "embed"].includes(r.source)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "影片 source 必須為 upload 或 embed");
		}
		if (r.source === "embed") {
			if (!r.embedUrl || typeof r.embedUrl !== "string") {
				throw new ApiError(StatusCodes.BAD_REQUEST, "嵌入影片需填 embedUrl");
			}
		}
		if (r.source === "upload") {
			const u = r.url;
			if (!u || (u !== NEWS_NEW_FILE_MARKER && typeof u !== "string")) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "上傳型影片需有 url 或新檔標記");
			}
		}
	}
	for (const r of data.attachmentDocuments || []) {
		if (typeof r !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "attachmentDocuments 項目格式無效");
		}
		const url = r.url;
		if (!url || (url !== NEWS_NEW_FILE_MARKER && typeof url !== "string")) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "文件附件需有 url 或新檔標記");
		}
	}
}

/**
 * 將待上傳檔掛到資料列並檢查數量；新檔列之 url 暫置為空字串以便通過後續寫入。
 */
function assignPendingNewsFiles(data, pendingImages, pendingVideos, pendingDocuments) {
	let iIdx = 0;
	let vIdx = 0;
	let dIdx = 0;
	for (const r of data.attachmentImages || []) {
		if (r.url === NEWS_NEW_FILE_MARKER) {
			const f = pendingImages[iIdx++];
			if (!f) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "圖片上傳數量與標記不相符");
			}
			r._pendingFile = f;
			r.url = "";
		}
	}
	if (iIdx !== pendingImages.length) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "多餘的圖片檔或缺少對應標記");
	}
	for (const r of data.attachmentVideos || []) {
		if (r.source === "upload" && r.url === NEWS_NEW_FILE_MARKER) {
			const f = pendingVideos[vIdx++];
			if (!f) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "影片上傳數量與標記不相符");
			}
			r._pendingFile = f;
			r.url = "";
		}
	}
	if (vIdx !== pendingVideos.length) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "多餘的影片檔或缺少對應標記");
	}
	for (const r of data.attachmentDocuments || []) {
		if (r.url === NEWS_NEW_FILE_MARKER) {
			const f = pendingDocuments[dIdx++];
			if (!f) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "文件上傳數量與標記不相符");
			}
			r._pendingFile = f;
			r.url = "";
		}
	}
	if (dIdx !== pendingDocuments.length) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "多餘的文件檔或缺少對應標記");
	}
}

function detachUploadPlans(data) {
	const plans = { images: [], videos: [], documents: [] };
	(data.attachmentImages || []).forEach((r, i) => {
		if (r._pendingFile) {
			plans.images.push({ index: i, file: r._pendingFile });
			delete r._pendingFile;
		}
	});
	(data.attachmentVideos || []).forEach((r, i) => {
		if (r._pendingFile) {
			plans.videos.push({ index: i, file: r._pendingFile });
			delete r._pendingFile;
		}
	});
	(data.attachmentDocuments || []).forEach((r, i) => {
		if (r._pendingFile) {
			plans.documents.push({ index: i, file: r._pendingFile });
			delete r._pendingFile;
		}
	});
	return plans;
}

async function applyUploadPlans(entityDoc, plans, entityContext) {
	let changed = false;
	for (const { index, file } of plans.images) {
		try {
			const url = fileUpload.saveAsset(file.buffer, "news", entityContext, "images", file.originalname, "news_img");
			entityDoc.attachmentImages[index].url = url;
			changed = true;
		} catch (e) {
			console.error("新聞附加圖片上傳失敗:", e);
		}
	}
	for (const { index, file } of plans.videos) {
		try {
			const url = fileUpload.saveAsset(file.buffer, "news", entityContext, "videos", file.originalname, "news_vid");
			entityDoc.attachmentVideos[index].url = url;
			changed = true;
		} catch (e) {
			console.error("新聞附加影片上傳失敗:", e);
		}
	}
	for (const { index, file } of plans.documents) {
		try {
			const url = fileUpload.saveAsset(file.buffer, "news", entityContext, "documents", file.originalname, "news_doc");
			entityDoc.attachmentDocuments[index].url = url;
			changed = true;
		} catch (e) {
			console.error("新聞附加文件上傳失敗:", e);
		}
	}
	if (changed) {
		await entityDoc.save();
	}
}

class NewsController extends EntityController {
	constructor() {
		super(News, {
			entityName: "news",
			responseKey: "news",
			basicFields: [
				"title",
				"category",
				"isActive",
				"publishDate",
				"author",
				"summary",
				"coverImageUrl",
				"article",
				"attachmentImages",
				"attachmentVideos",
				"attachmentDocuments",
				"relatedNews",
				"createdAt",
				"updatedAt"
			]
		});
	}

	searchItems = async (req, res, next) => {
		try {
			const { keyword, page, limit, sort, sortDirection } = req.query;
			const filterActive = this._shouldFilterActive(req);
			const baseQuery = {};
			if (filterActive) {
				baseQuery.isActive = true;
			}
			const results = await this.entityService.search(baseQuery, {
				keyword,
				pagination: { page: parseInt(page) || 1, limit: Math.min(parseInt(limit) || 20, 100) },
				sort: { [sort || "createdAt"]: sortDirection === "desc" ? -1 : 1 },
				searchFields: ["title.TW", "title.EN", "summary.TW", "summary.EN", "author"]
			});
			this._sendResponse(res, StatusCodes.OK, `${this.entityName}搜索結果`, {
				[this.responseKey]: results.data,
				pagination: results.pagination
			});
		} catch (error) {
			this._handleError(error, "搜索", next);
		}
	};

	getCategories = async (req, res, next) => {
		try {
			const mainPath = News.schema.path("category.main.TW");
			const categories = mainPath?.enumValues || [];
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
				query["category.main.TW"] = category;
			}
			const allowedSortFields = ["publishDate", "createdAt"];
			const sortField = allowedSortFields.includes(sort) ? sort : "publishDate";
			const order = sortDirection === "asc" ? 1 : -1;
			const sortOption = sortField === "createdAt" ? { createdAt: order } : { [sortField]: order, createdAt: -1 };
			const pageNum = Math.max(parseInt(page) || 1, 1);
			const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
			const skip = (pageNum - 1) * limitNum;
			const total = await this.model.countDocuments(query);
			const items = await this.model
				.find(query)
				.sort(sortOption)
				.skip(skip)
				.limit(limitNum)
				.populate("relatedNews", "title.TW title.EN summary.TW summary.EN slug category");

			const formattedItems = items.map((item) => this.entityService.formatOutput(item));
			this._sendResponse(res, StatusCodes.OK, `消息列表獲取成功`, {
				[this.responseKey]: formattedItems,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					pages: Math.ceil(total / limitNum)
				}
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
			const item = await this.model.findOne(query).populate("relatedNews", "title.TW title.EN summary.TW summary.EN slug category");
			if (!item) {
				throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);
			}
			const formattedItem = this.entityService.formatOutput(item);
			this._sendResponse(res, StatusCodes.OK, `${this.entityName} 獲取成功`, { [this.responseKey]: formattedItem });
		} catch (error) {
			this._handleError(error, "獲取", next);
		}
	};

	async _prepareNewsData(req, isUpdate = false, existingNews = null) {
		let rawData;
		if (req.is("multipart/form-data") && req.body.newsDataPayload) {
			try {
				rawData = JSON.parse(req.body.newsDataPayload);
			} catch (e) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "無法解析 newsDataPayload JSON 字串");
			}
		} else {
			rawData = { ...req.body };
		}

		const data = { ...rawData };
		delete data.content;

		const files = req.files || {};
		const userRole = req.accessContext?.userRole;

		if (isUpdate && data._id) {
			delete data._id;
		}

		const pendingCoverFile = files.coverImage?.[0];
		const pendingNewsImages = files.newsImages || [];
		const pendingNewsVideos = files.newsVideos || [];
		const pendingNewsDocuments = files.newsDocuments || [];

		if (data.title !== undefined) {
			if (typeof data.title !== "object" || !data.title.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文標題為必填，或標題格式錯誤");
			}
			data.newsTitleTw = data.title.TW;
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少標題欄位");
		} else if (existingNews) {
			data.newsTitleTw = data.title?.TW || existingNews.title?.TW;
		}

		if (data.article !== undefined) {
			validateArticle(data.article, !isUpdate);
		} else if (!isUpdate) {
			data.article = { TW: defaultEmptyDoc(), EN: defaultEmptyDoc() };
			validateArticle(data.article, true);
		}

		if (!data.attachmentImages) {
			data.attachmentImages = [];
		}
		if (!data.attachmentVideos) {
			data.attachmentVideos = [];
		}
		if (!data.attachmentDocuments) {
			data.attachmentDocuments = [];
		}
		validateAttachmentPayload(data);
		assignPendingNewsFiles(data, pendingNewsImages, pendingNewsVideos, pendingNewsDocuments);

		if (data.category !== undefined) {
			if (typeof data.category !== "object" || !data.category.main) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "分類格式無效");
			}
			const tw = data.category.main.TW;
			const enumTw = News.schema.path("category.main.TW").enumValues;
			if (!tw || !enumTw.includes(tw)) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `無效的主分類：${tw}`);
			}
			if (!data.category.main.EN) {
				data.category.main.EN = newsCategoryMainTwToEn(tw) || "";
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少分類欄位");
		}

		if (data.summary !== undefined && typeof data.summary !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "摘要格式無效或解析錯誤");
		}

		if (data.publishDate !== undefined) {
			if (data.publishDate === "" || data.publishDate === null) {
				if (isUpdate && (data.publishDate === null || data.publishDate === "")) {
					data.publishDate = null;
				} else if (!isUpdate && (data.publishDate === null || data.publishDate === "")) {
					delete data.publishDate;
				}
			} else {
				const parsedDate = new Date(data.publishDate);
				if (isNaN(parsedDate.getTime())) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "發布日期格式無效");
				}
				data.publishDate = parsedDate;
			}
		} else if (!isUpdate) {
			delete data.publishDate;
		}

		if (userRole !== Permissions.ADMIN) {
			if (!isUpdate) {
				data.isActive = false;
			} else {
				delete data.isActive;
			}
		} else {
			if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `isActive 欄位必須是布林值`);
			}
			if (!isUpdate && data.isActive === undefined) {
				data.isActive = false;
			}
		}

		let filesToDelete = [];
		if (isUpdate && existingNews) {
			const oldPlain = existingNews.toObject();
			const newPlain = { ...data };
			const oldPaths = collectStoragePathsFromPlain(oldPlain);
			const newPathsFromPayload = collectStoragePathsFromPlain(newPlain);
			filesToDelete = oldPaths.filter((p) => !newPathsFromPayload.includes(p));
		}

		const wantsNewCover = data.coverImageUrl === "__NEW_COVER__";
		if (wantsNewCover && pendingCoverFile) {
			if (isUpdate && existingNews?.coverImageUrl && existingNews.coverImageUrl.startsWith("/storage")) {
				filesToDelete.push(existingNews.coverImageUrl);
			}
			data.coverImageUrl = "";
			data._pendingCoverFile = pendingCoverFile;
		} else if (isUpdate && data.coverImageUrl === null && existingNews?.coverImageUrl?.startsWith("/storage")) {
			filesToDelete.push(existingNews.coverImageUrl);
		} else if (!wantsNewCover && data.coverImageUrl !== undefined) {
			// keep
		} else if (isUpdate && data.coverImageUrl === undefined) {
			delete data.coverImageUrl;
		} else if (!isUpdate && data.coverImageUrl === undefined) {
			data.coverImageUrl = null;
		}

		const newsTitleTwForContext = data.newsTitleTw || (existingNews ? existingNews.title?.TW : null) || "untitled_news";

		return {
			processedData: data,
			filesToDelete,
			newsTitleTwForContext
		};
	}

	createItem = async (req, res, next) => {
		try {
			const { processedData, newsTitleTwForContext } = await this._prepareNewsData(req, false, null);
			if (!processedData.author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "作者欄位為必填");
			}

			const pendingCover = processedData._pendingCoverFile;
			delete processedData._pendingCoverFile;
			delete processedData.newsTitleTw;

			// 封面規則：建立新聞時封面必填（與前端一致）
			const hasCoverUrl = typeof processedData.coverImageUrl === "string" && processedData.coverImageUrl.trim() !== "";
			const hasPendingCover = !!pendingCover;
			if (!hasCoverUrl && !hasPendingCover) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "封面圖片為必填");
			}

			const uploadPlans = detachUploadPlans(processedData);

			let newsItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			const newsId = newsItem._id.toString();
			const entityContext = { id: newsId, name: newsTitleTwForContext };

			if (pendingCover) {
				try {
					newsItem.coverImageUrl = fileUpload.saveAsset(
						pendingCover.buffer,
						"news",
						entityContext,
						"covers",
						pendingCover.originalname,
						"cover"
					);
					await newsItem.save({ session: req.dbSession });
				} catch (e) {
					console.error("封面圖片上傳失敗:", e);
				}
			}

			await applyUploadPlans(newsItem, uploadPlans, entityContext);
			newsItem = await News.findById(newsItem._id);

			const formattedNewItem = this.entityService.formatOutput(newsItem);
			this._sendResponse(res, StatusCodes.CREATED, `${this.entityName} 創建成功`, { [this.responseKey]: formattedNewItem });
		} catch (error) {
			this._handleError(error, "創建", next);
		}
	};

	updateItem = async (req, res, next) => {
		try {
			const { id } = req.params;
			const existingItem = await this.model.findById(id);
			if (!existingItem) {
				throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);
			}

			const { processedData, filesToDelete, newsTitleTwForContext } = await this._prepareNewsData(req, true, existingItem);
			const pendingCover = processedData._pendingCoverFile;
			delete processedData._pendingCoverFile;
			delete processedData.newsTitleTw;

			const uploadPlans = detachUploadPlans(processedData);

			const newsId = existingItem._id.toString();
			const entityContext = { id: newsId, name: newsTitleTwForContext };

			if (pendingCover) {
				try {
					processedData.coverImageUrl = fileUpload.saveAsset(
						pendingCover.buffer,
						"news",
						entityContext,
						"covers",
						pendingCover.originalname,
						"cover"
					);
				} catch (e) {
					console.error("封面圖片更新失敗:", e);
				}
			}

			Object.keys(processedData).forEach((key) => {
				if (processedData[key] !== undefined) {
					existingItem[key] = processedData[key];
				}
			});

			let updatedItem = await existingItem.save({ session: req.dbSession });
			await applyUploadPlans(updatedItem, uploadPlans, entityContext);
			updatedItem = await News.findById(updatedItem._id);

			for (const filePath of filesToDelete) {
				try {
					if (filePath && filePath.startsWith("/storage")) {
						fileUpload.deleteFileByWebPath(filePath);
					}
				} catch (deleteError) {
					console.error("刪除舊檔案失敗:", filePath, deleteError);
				}
			}

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
			if (!itemToDelete) {
				throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);
			}
			await this.entityService.delete(id, { session: req.dbSession });
			if (itemToDelete._id) {
				const titleForPath = typeof itemToDelete.title?.TW === "string" ? itemToDelete.title.TW : "untitled_news";
				const entityContext = { id: itemToDelete._id.toString(), name: titleForPath };
				fileUpload.deleteEntityDirectory("news", entityContext);
			}
			res.status(StatusCodes.OK).json({ success: true, message: `${this.entityName} 刪除成功` });
		} catch (error) {
			this._handleError(error, "刪除", next);
		}
	};
}

export default new NewsController();
