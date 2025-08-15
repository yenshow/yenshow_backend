import News from "../../models/News.js";
import { EntityController } from "../EntityController.js";
import { ApiError } from "../../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import fileUpload from "../../utils/fileUpload.js"; // 引入統一的檔案處理工具
import { Permissions } from "../../middlewares/permission.js"; // 導入 Permissions

// --- Helper function to validate content items (can be moved to a service/validator) ---
function validateContentItems(content) {
	if (!Array.isArray(content)) {
		throw new ApiError(StatusCodes.BAD_REQUEST, "內容 (content) 必須是一個陣列");
	}

	for (const item of content) {
		if (!item || typeof item !== "object") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "內容陣列中的項目格式無效");
		}
		if (!item.itemType || !["richText", "image", "videoEmbed"].includes(item.itemType)) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `無效的內容項目類型: ${item.itemType}`);
		}

		// Validate based on itemType and clean up extraneous fields
		switch (item.itemType) {
			case "richText":
				if (!item.richTextData || typeof item.richTextData !== "object") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "richText 項目缺少有效的 richTextData 物件");
				}
				if (!item.richTextData.TW || typeof item.richTextData.TW !== "object" || !item.richTextData.EN || typeof item.richTextData.EN !== "object") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "richTextdata 必須包含 TW 和 EN 物件");
				}
				if (item.richTextData.TW.type !== "doc" || item.richTextData.EN.type !== "doc") {
					console.warn("Rich text data for TW or EN might not be a valid Tiptap document structure (missing type: 'doc')");
				}
				delete item.imageUrl;
				delete item.imageAltText;
				delete item.imageCaption;
				delete item.videoEmbedUrl;
				delete item.videoCaption;
				break;
			case "image":
				if (item.imageUrl !== undefined && item.imageUrl !== null && typeof item.imageUrl !== "string" && item.imageUrl !== "__NEW_CONTENT_IMAGE__") {
					throw new ApiError(StatusCodes.BAD_REQUEST, "image 項目提供的 imageUrl 格式無效");
				}
				if (item.imageAltText && typeof item.imageAltText !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "imageAltText 格式無效");
				if (item.imageCaption && typeof item.imageCaption !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "imageCaption 格式無效");
				delete item.richTextData;
				delete item.videoEmbedUrl;
				delete item.videoCaption;
				break;
			case "videoEmbed":
				// Allow videoEmbedUrl to be a marker like "__NEW_CONTENT_VIDEO__" or an actual URL string
				if (
					item.videoEmbedUrl !== undefined &&
					item.videoEmbedUrl !== null &&
					typeof item.videoEmbedUrl !== "string" &&
					item.videoEmbedUrl !== "__NEW_CONTENT_VIDEO__"
				) {
					throw new ApiError(StatusCodes.BAD_REQUEST, "videoEmbed 項目 videoEmbedUrl 格式無效");
				}
				if (item.videoCaption && typeof item.videoCaption !== "object") throw new ApiError(StatusCodes.BAD_REQUEST, "videoCaption 格式無效");
				delete item.richTextData;
				delete item.imageUrl;
				delete item.imageAltText;
				delete item.imageCaption;
				break;
		}
		if (item.sortOrder !== undefined && typeof item.sortOrder !== "number") {
			throw new ApiError(StatusCodes.BAD_REQUEST, "sortOrder 必須是數字");
		}
	}
	content.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

class NewsController extends EntityController {
	constructor() {
		super(News, {
			entityName: "news",
			responseKey: "news",
			// 調整 basicFields 移除 status
			basicFields: ["title", "category", "isActive", "publishDate", "author", "summary", "coverImageUrl", "createdAt", "updatedAt"]
		});
		if (this._prepareNewsData) {
			this._prepareNewsData = this._prepareNewsData.bind(this);
		}
	}

	// 取得分類清單（從 Mongoose enum 讀取）
	getCategories = async (req, res, next) => {
		try {
			const categories = News.schema.path("category").enumValues || [];
			this._sendResponse(res, StatusCodes.OK, `分類清單獲取成功`, { categories });
		} catch (error) {
			this._handleError(error, "獲取分類清單", next);
		}
	};

	getAllItems = async (req, res, next) => {
		try {
			const { category, sort, sortDirection, page, limit } = req.query;

			// 基礎條件：依權限自動過濾 isActive
			const query = {};
			if (this._shouldFilterActive(req)) {
				query.isActive = true;
			}
			// 分類過濾
			if (category) {
				query.category = category;
			}

			// 解析排序
			const allowedSortFields = ["publishDate", "createdAt"];
			const sortField = allowedSortFields.includes(sort) ? sort : "publishDate";
			const order = sortDirection === "asc" ? 1 : -1; // 預設 desc
			const sortOption = sortField === "createdAt" ? { createdAt: order } : { [sortField]: order, createdAt: -1 };

			// 分頁參數
			const pageNum = Math.max(parseInt(page) || 1, 1);
			const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
			const skip = (pageNum - 1) * limitNum;

			const total = await this.model.countDocuments(query);
			const items = await this.model.find(query).sort(sortOption).skip(skip).limit(limitNum);

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

			// Public-facing route should only find active news.
			const query = { slug: slug };
			const userRole = req.accessContext?.userRole;

			// If the user is not an admin or staff, only show active items.
			if (userRole !== Permissions.ADMIN && userRole !== Permissions.STAFF) {
				query.isActive = true;
			}

			const item = await this.model.findOne(query);

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
		const files = req.files || {};
		const userRole = req.accessContext?.userRole; // 從 accessContext 獲取角色

		if (isUpdate && data._id) {
			delete data._id;
		}

		data._pendingCoverFile = files.coverImage?.[0];
		data._pendingContentImageFiles = files.contentImages || [];
		data._pendingContentVideoFiles = files.contentVideos || [];

		let imagesToDeletePaths = [];
		let videosToDeletePaths = []; // NEW: for videos to delete

		let currentContentImageFileIndex = 0;
		let currentContentVideoFileIndex = 0; // NEW: index for video files

		if (data.title !== undefined) {
			if (typeof data.title !== "object" || !data.title.TW) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "繁體中文標題為必填，或標題格式錯誤");
			}
			data.newsTitleTw = data.title.TW; // Keep this for context
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少標題欄位");
		} else if (existingNews) {
			// If title is not being updated, use existing title for path context
			data.newsTitleTw = data.title?.TW || existingNews.title?.TW;
		}

		if (data.content !== undefined) {
			try {
				if (Array.isArray(data.content)) {
					data.content.forEach((item) => {
						if ((item.itemType === "image" || item.itemType === "videoEmbed") && item.richTextData) {
							delete item.richTextData;
						}
					});
				}
				validateContentItems(data.content);
			} catch (validationError) {
				throw validationError;
			}
			if (Array.isArray(data.content)) {
				data.content.forEach((block) => {
					if (block.itemType === "image") {
						const wantsNewImageForBlock = block.imageUrl === "__NEW_CONTENT_IMAGE__";
						if (wantsNewImageForBlock && data._pendingContentImageFiles[currentContentImageFileIndex]) {
							block._pendingFile = data._pendingContentImageFiles[currentContentImageFileIndex];
							currentContentImageFileIndex++;
							if (isUpdate && existingNews) {
								const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
								if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
									imagesToDeletePaths.push(existingBlockInNews.imageUrl);
								}
							}
							block.imageUrl = ""; // Will be replaced by uploaded file path
						} else if (isUpdate && block.imageUrl === null && existingNews) {
							// Explicitly removing an image
							const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
							if (existingBlockInNews?.imageUrl && !existingBlockInNews.imageUrl.startsWith("http")) {
								imagesToDeletePaths.push(existingBlockInNews.imageUrl);
							}
						}
					} else if (block.itemType === "videoEmbed") {
						// NEW: Handle video blocks
						const wantsNewVideoForBlock = block.videoEmbedUrl === "__NEW_CONTENT_VIDEO__";
						if (wantsNewVideoForBlock && data._pendingContentVideoFiles[currentContentVideoFileIndex]) {
							block._pendingVideoFile = data._pendingContentVideoFiles[currentContentVideoFileIndex];
							currentContentVideoFileIndex++;
							if (isUpdate && existingNews) {
								const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
								if (existingBlockInNews?.videoEmbedUrl && existingBlockInNews.videoEmbedUrl.startsWith("/storage")) {
									videosToDeletePaths.push(existingBlockInNews.videoEmbedUrl);
								}
							}
							block.videoEmbedUrl = ""; // Will be replaced by uploaded file path
						} else if (isUpdate && block.videoEmbedUrl === null && existingNews) {
							// Explicitly removing a video
							const existingBlockInNews = existingNews.content.find((eb) => eb._id?.toString() === block._id?.toString());
							if (existingBlockInNews?.videoEmbedUrl && existingBlockInNews.videoEmbedUrl.startsWith("/storage")) {
								videosToDeletePaths.push(existingBlockInNews.videoEmbedUrl);
							}
						}
					}
				});
			}
		} else if (!isUpdate) {
			data.content = [];
		} else if (isUpdate && data.content === null) {
			// If client sends null for content, means remove all content
			data.content = [];
			if (existingNews?.content) {
				existingNews.content.forEach((block) => {
					if (block.itemType === "image" && block.imageUrl && !block.imageUrl.startsWith("http")) {
						imagesToDeletePaths.push(block.imageUrl);
					}
					if (block.itemType === "videoEmbed" && block.videoEmbedUrl && block.videoEmbedUrl.startsWith("/storage")) {
						videosToDeletePaths.push(block.videoEmbedUrl);
					}
				});
			}
		}

		if (data.category !== undefined) {
			const validCategories = News.schema.path("category").enumValues;
			if (!validCategories.includes(data.category)) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `無效的分類：${data.category}`);
			}
		} else if (!isUpdate) {
			throw new ApiError(StatusCodes.BAD_REQUEST, "缺少分類欄位");
		}

		if (data.summary !== undefined) {
			if (typeof data.summary !== "object") {
				throw new ApiError(StatusCodes.BAD_REQUEST, "摘要格式無效或解析錯誤");
			}
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

		const wantsNewCover = data.coverImageUrl === "__NEW_COVER__";
		if (wantsNewCover && data._pendingCoverFile) {
			if (isUpdate && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
				imagesToDeletePaths.push(existingNews.coverImageUrl);
			}
			data.coverImageUrl = ""; // Will be replaced by uploaded file path
		} else if (isUpdate && data.coverImageUrl === null && existingNews?.coverImageUrl && !existingNews.coverImageUrl.startsWith("http")) {
			imagesToDeletePaths.push(existingNews.coverImageUrl);
		} else if (!wantsNewCover && data.coverImageUrl !== undefined) {
			// Keep existing URL or client provided external URL
		} else if (isUpdate && data.coverImageUrl === undefined) {
			delete data.coverImageUrl; // No change intended to cover image
		} else if (!isUpdate && data.coverImageUrl === undefined) {
			data.coverImageUrl = null; // Default to null if not provided during creation and not a new cover upload
		}

		// NEW: Handle deletion of files from blocks that were completely removed during an update
		if (isUpdate && existingNews && existingNews.content && Array.isArray(data.content)) {
			const newContentBlockIds = new Set(data.content.map((b) => b._id?.toString()).filter((id) => id));
			existingNews.content.forEach((existingBlock) => {
				if (existingBlock._id && !newContentBlockIds.has(existingBlock._id.toString())) {
					// This block was removed from the content array
					if (existingBlock.itemType === "image" && existingBlock.imageUrl && existingBlock.imageUrl.startsWith("/storage/")) {
						if (!imagesToDeletePaths.includes(existingBlock.imageUrl)) {
							imagesToDeletePaths.push(existingBlock.imageUrl);
						}
					}
					if (existingBlock.itemType === "videoEmbed" && existingBlock.videoEmbedUrl && existingBlock.videoEmbedUrl.startsWith("/storage/")) {
						if (!videosToDeletePaths.includes(existingBlock.videoEmbedUrl)) {
							videosToDeletePaths.push(existingBlock.videoEmbedUrl);
						}
					}
				}
			});
		}

		// Make sure newsTitleTw is available for context for saveAsset calls
		const newsTitleTwForContext = data.newsTitleTw || (existingNews ? existingNews.title?.TW : null) || "untitled_news";

		return { processedData: data, imagesToDelete: imagesToDeletePaths, videosToDelete: videosToDeletePaths, newsTitleTwForContext };
	}

	createItem = async (req, res, next) => {
		try {
			const { processedData, newsTitleTwForContext } = await this._prepareNewsData(req, false, null);

			if (!processedData.author) {
				throw new ApiError(StatusCodes.BAD_REQUEST, "作者欄位為必填");
			}

			const pendingCoverFile = processedData._pendingCoverFile;
			// Keep a reference to original content blocks with pending files before they are cleaned up
			const originalContentBlocksWithFiles = processedData.content ? JSON.parse(JSON.stringify(processedData.content)) : [];

			// Clean up data for database insertion
			delete processedData._pendingCoverFile;
			delete processedData._pendingContentImageFiles;
			delete processedData._pendingContentVideoFiles;
			delete processedData.newsTitleTw; // Remove from DB data, use newsTitleTwForContext for paths

			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					delete block._pendingFile;
					delete block._pendingVideoFile;
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
					// Ensure imageUrl and videoEmbedUrl are not empty strings if no file was uploaded for them
					if (block.itemType === "image" && block.imageUrl === "") block.imageUrl = null;
					if (block.itemType === "videoEmbed" && block.videoEmbedUrl === "") block.videoEmbedUrl = null;
				});
			}
			processedData.coverImageUrl = null; // Set to null initially, will be updated if file exists

			let newsItem = await this.entityService.create(processedData, {
				session: req.dbSession,
				returnRawInstance: true
			});

			console.log("創建完成的 News 物件:", newsItem);

			const newsId = newsItem._id.toString();
			const entityContext = { id: newsId, name: newsTitleTwForContext };
			let itemChangedByFileUpload = false;

			if (pendingCoverFile) {
				try {
					newsItem.coverImageUrl = fileUpload.saveAsset(
						pendingCoverFile.buffer,
						"news",
						entityContext,
						"covers", // assetCategory
						pendingCoverFile.originalname,
						"cover" // assetPrefix
					);
					itemChangedByFileUpload = true;
				} catch (e) {
					console.error("封面圖片上傳失敗:", e);
					// Potentially revert coverImageUrl or handle error
				}
			}

			// Process content images and videos using originalContentBlocksWithFiles
			if (Array.isArray(newsItem.content) && Array.isArray(originalContentBlocksWithFiles)) {
				for (let blockIndex = 0; blockIndex < newsItem.content.length; blockIndex++) {
					const blockInRawItem = newsItem.content[blockIndex]; // This is the block in the DB item
					const originalBlockData =
						originalContentBlocksWithFiles.find(
							(b) => (b._id && b._id === blockInRawItem._id?.toString()) || (b._tempClientKey && b._tempClientKey === blockInRawItem._tempClientKey)
						) || originalContentBlocksWithFiles[blockIndex]; // Fallback to index if no ID/key match, less reliable

					if (originalBlockData?.itemType === "image" && originalBlockData.imageUrl === "" && originalBlockData._pendingFile) {
						try {
							const imageUrl = fileUpload.saveAsset(
								originalBlockData._pendingFile.buffer,
								"news",
								entityContext,
								"images", // assetCategory
								originalBlockData._pendingFile.originalname,
								"content_img" // assetPrefix
							);
							blockInRawItem.imageUrl = imageUrl;
							itemChangedByFileUpload = true;
						} catch (uploadError) {
							console.error(`內容圖片上傳失敗 (original index ${blockIndex}):`, uploadError);
							blockInRawItem.imageUrl = null;
						}
					} else if (originalBlockData?.itemType === "videoEmbed" && originalBlockData.videoEmbedUrl === "" && originalBlockData._pendingVideoFile) {
						try {
							const videoUrl = fileUpload.saveAsset(
								originalBlockData._pendingVideoFile.buffer,
								"news",
								entityContext,
								"videos", // assetCategory
								originalBlockData._pendingVideoFile.originalname,
								"content_vid" // assetPrefix
							);
							blockInRawItem.videoEmbedUrl = videoUrl;
							itemChangedByFileUpload = true;
						} catch (uploadError) {
							console.error(`內容影片上傳失敗 (original index ${blockIndex}):`, uploadError);
							blockInRawItem.videoEmbedUrl = null;
						}
					}
				}
			}

			if (itemChangedByFileUpload) {
				newsItem = await newsItem.save({ session: req.dbSession });
			}

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
			if (!existingItem) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			const oldCoverUrl = existingItem.coverImageUrl && existingItem.coverImageUrl.startsWith("/storage") ? existingItem.coverImageUrl : null;

			const {
				processedData,
				imagesToDelete: filesToDeleteFromPrepare,
				videosToDelete: additionalVideosToDeleteFromPrepare,
				newsTitleTwForContext // Get this from _prepareNewsData
			} = await this._prepareNewsData(req, true, existingItem);

			const newsId = existingItem._id.toString();
			const entityContext = { id: newsId, name: newsTitleTwForContext };

			const pendingCoverFile = processedData._pendingCoverFile;

			// Clean up data for database update
			delete processedData._pendingCoverFile;
			delete processedData._pendingContentImageFiles;
			delete processedData._pendingContentVideoFiles;
			delete processedData.newsTitleTw; // Remove from DB data

			if (Array.isArray(processedData.content)) {
				processedData.content.forEach((block) => {
					delete block._tempClientKey;
					// _pendingFile and _pendingVideoFile are kept for upload logic below
					if ((block.itemType === "image" || block.itemType === "videoEmbed") && block.richTextData) {
						delete block.richTextData;
					}
				});
			}

			const updatePayload = { ...processedData };

			if (pendingCoverFile) {
				try {
					updatePayload.coverImageUrl = fileUpload.saveAsset(
						pendingCoverFile.buffer,
						"news",
						entityContext,
						"covers", // assetCategory
						pendingCoverFile.originalname,
						"cover" // assetPrefix
					);
				} catch (e) {
					console.error("封面圖片更新上傳失敗:", e);
					if (updatePayload.coverImageUrl === "") {
						// If saveAsset failed and left it as "", revert to old or null
						updatePayload.coverImageUrl = oldCoverUrl;
					} else {
						// If not specifically set to "", means no change intended or failed before setting
						delete updatePayload.coverImageUrl; // Avoid overwriting with undefined
					}
				}
			} else if (updatePayload.coverImageUrl === "") {
				// Explicitly trying to set to an empty string (likely because new upload was intended but failed on client)
				updatePayload.coverImageUrl = oldCoverUrl; // Revert to old if exists, otherwise will become null by DB schema
			}

			// Update content images and videos
			if (Array.isArray(updatePayload.content)) {
				for (let i = 0; i < updatePayload.content.length; i++) {
					const block = updatePayload.content[i];
					const existingBlockEquivalent = existingItem.content.find((b) => b._id?.toString() === block._id?.toString());

					if (block.itemType === "image" && block._pendingFile) {
						try {
							block.imageUrl = fileUpload.saveAsset(
								block._pendingFile.buffer,
								"news",
								entityContext,
								"images", // assetCategory
								block._pendingFile.originalname,
								"content_img" // assetPrefix
							);
						} catch (e) {
							console.error(`內容圖片更新上傳失敗 for block (ID: ${block._id || "new"}):`, e);
							block.imageUrl = existingBlockEquivalent?.imageUrl || null;
						}
						delete block._pendingFile;
					} else if (block.itemType === "image" && block.imageUrl === "") {
						// No new file, but imageUrl was cleared
						block.imageUrl = existingBlockEquivalent?.imageUrl || null; // Keep old or set to null
					}

					if (block.itemType === "videoEmbed" && block._pendingVideoFile) {
						try {
							block.videoEmbedUrl = fileUpload.saveAsset(
								block._pendingVideoFile.buffer,
								"news",
								entityContext,
								"videos", // assetCategory
								block._pendingVideoFile.originalname,
								"content_vid" // assetPrefix
							);
						} catch (e) {
							console.error(`內容影片更新上傳失敗 for block (ID: ${block._id || "new"}):`, e);
							block.videoEmbedUrl = existingBlockEquivalent?.videoEmbedUrl || null;
						}
						delete block._pendingVideoFile;
					} else if (block.itemType === "videoEmbed" && block.videoEmbedUrl === "") {
						// No new file, but videoEmbedUrl was cleared
						block.videoEmbedUrl = existingBlockEquivalent?.videoEmbedUrl || null; // Keep old or set to null
					}
				}
			}

			Object.keys(updatePayload).forEach((key) => {
				if (updatePayload[key] !== undefined || key === "coverImageUrl" || key === "content") {
					// ensure null can be set
					existingItem[key] = updatePayload[key];
				}
			});

			const allFilesToDelete = new Set([...filesToDeleteFromPrepare, ...additionalVideosToDeleteFromPrepare]);

			const updatedItem = await existingItem.save({ session: req.dbSession });

			console.log("更新完成的 News 物件:", updatedItem);

			if (allFilesToDelete.size > 0) {
				allFilesToDelete.forEach((filePath) => {
					try {
						if (filePath && filePath.startsWith("/storage")) {
							const deleted = fileUpload.deleteFileByWebPath(filePath);
							if (deleted) console.log("已刪除舊檔案 (圖片或影片):", filePath);
						}
					} catch (deleteError) {
						console.error("刪除舊檔案失敗:", filePath, deleteError);
					}
				});
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
			const itemToDelete = await this.model.findById(id).lean(); // Use lean() for plain object if only reading for context
			if (!itemToDelete) throw new ApiError(StatusCodes.NOT_FOUND, `${this.entityName} 未找到`);

			// Delete from DB first
			await this.entityService.delete(id, { session: req.dbSession });

			// Then delete associated directory
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
