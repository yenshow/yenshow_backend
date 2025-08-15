import fs from "fs";
import path from "path";
import multer from "multer";
import { ApiError } from "./responseHandler.js";
import os from "os";

const MAX_TOTAL_NEWS_IMAGES = 20; // 新聞總圖片數上限 (封面+內容)
const MAX_NEWS_CONTENT_IMAGES = MAX_TOTAL_NEWS_IMAGES - 1; // 內容圖片上限
const MAX_NEWS_CONTENT_VIDEOS = 5; // 新增：內容影片上限 (可根據需求調整)

/**
 * 檔案上傳工具類
 * 提供檔案上傳處理、儲存和驗證功能
 */
class FileUpload {
	constructor() {
		// 檢測操作系統類型
		this.isWindows = os.platform() === "win32";

		// 根據操作系統設置默認的檔案根目錄
		let defaultRoot = "/app/storage";
		if (this.isWindows) {
			// Windows 環境下使用 D:\storage 作為默認儲存位置
			defaultRoot = "D:\\storage";
		}

		// 設置檔案儲存根目錄，優先使用環境變數
		this.FILES_ROOT = process.env.FILES_ROOT || defaultRoot;

		// 確保檔案儲存目錄存在
		this.ensureRootDirectoryExists();

		this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

		// 設定存儲策略
		this.storage = multer.memoryStorage();

		// 檔案過濾器
		this.fileFilter = (req, file, cb) => {
			if (file.fieldname === "contentImages") {
				if (!file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "新聞相關圖片只允許上傳圖片檔案"), false);
				}
			} else if (file.fieldname === "contentDocuments") {
				if (!file.mimetype.startsWith("application/pdf")) {
					return cb(new ApiError(400, "新聞內容文檔只允許上傳 PDF 檔案"), false);
				}
			} else if (file.fieldname === "contentVideos") {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "新聞內容影片只允許上傳影片檔案"), false);
				}
			}
			// Handling for product uploads
			else if (
				file.fieldname === "images" ||
				file.fieldname === "documents" ||
				file.fieldname === "videos" ||
				file.fieldname === "documents_TW" ||
				file.fieldname === "documents_EN"
			) {
				if (file.fieldname === "images" && !file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "產品示圖只允許上傳圖片檔案"), false);
				}
				if ((file.fieldname === "documents" || file.fieldname === "documents_TW" || file.fieldname === "documents_EN") && file.mimetype !== "application/pdf") {
					return cb(new ApiError(400, "產品文檔僅允許 PDF 格式"), false);
				}
				if (file.fieldname === "videos" && !file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "產品影片只允許上傳影片檔案"), false);
				}
			}
			// NEW: Handling for FAQ uploads
			else if (file.fieldname === "faqImages") {
				if (!file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, "FAQ 圖片只允許上傳圖片檔案"), false);
				}
			} else if (file.fieldname === "faqVideos") {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, "FAQ 影片只允許上傳影片檔案"), false);
				}
			} else if (file.fieldname === "faqDocuments") {
				if (!file.mimetype.startsWith("application/pdf")) {
					return cb(new ApiError(400, "FAQ 文檔只允許上傳 PDF 檔案"), false);
				}
			}
			cb(null, true);
		};

		// 基本 multer 配置
		this.upload = multer({
			storage: this.storage,
			fileFilter: this.fileFilter,
			limits: {
				fileSize: this.MAX_FILE_SIZE
			}
		});
	}

	/**
	 * 確保根目錄存在
	 */
	ensureRootDirectoryExists() {
		try {
			if (!fs.existsSync(this.FILES_ROOT)) {
				fs.mkdirSync(this.FILES_ROOT, { recursive: true });
				console.log(`已創建檔案儲存根目錄: ${this.FILES_ROOT}`);
			}
		} catch (error) {
			console.error(`無法創建檔案儲存根目錄: ${error.message}`);
		}
	}

	/**
	 * 確保指定目錄存在
	 * @param {String} directoryPath - 目錄的絕對路徑
	 */
	ensureDirectory(directoryPath) {
		try {
			if (!fs.existsSync(directoryPath)) {
				fs.mkdirSync(directoryPath, { recursive: true });
				console.log(`已創建目錄: ${directoryPath}`);
			}
		} catch (error) {
			console.error(`無法創建目錄: ${directoryPath}`, error);
			// 可以選擇拋出錯誤或返回失敗狀態
			throw new ApiError(500, `無法創建目錄 ${directoryPath}: ${error.message}`);
		}
	}

	/**
	 * 獲取產品檔案上傳中間件
	 * @returns {Function} Multer 中間件
	 */
	getProductUploadMiddleware() {
		return this.upload.fields([
			{ name: "images", maxCount: 10 },
			{ name: "documents", maxCount: 5 }, // legacy field
			{ name: "documents_TW", maxCount: 5 },
			{ name: "documents_EN", maxCount: 5 },
			{ name: "videos", maxCount: 5 }
		]);
	}

	/**
	 * 獲取單一檔案上傳中間件
	 * @param {String} fieldName - 欄位名稱
	 * @returns {Function} Multer 中間件
	 */
	getSingleFileMiddleware(fieldName) {
		return this.upload.single(fieldName);
	}

	/**
	 * 獲取新聞檔案上傳中間件 (封面, 內容圖片, 內容影片)
	 * @returns {Function} Multer 中間件
	 */
	getNewsUploadMiddleware() {
		return this.upload.fields([
			{ name: "coverImage", maxCount: 1 },
			{ name: "contentImages", maxCount: MAX_NEWS_CONTENT_IMAGES },
			{ name: "contentVideos", maxCount: MAX_NEWS_CONTENT_VIDEOS }
		]);
	}

	/**
	 * 獲取 FAQ 檔案上傳中間件
	 * @returns {Function} Multer 中間件
	 */
	getFaqUploadMiddleware() {
		return this.upload.fields([
			{ name: "faqImages", maxCount: 5 },
			{ name: "faqVideos", maxCount: 5 },
			{ name: "faqDocuments", maxCount: 5 }
		]);
	}

	/**
	 * 保存 Buffer 型檔案到指定路徑
	 * @param {Buffer} buffer - 檔案內容
	 * @param {String} targetPath - 目標路徑
	 */
	saveBufferToFile(buffer, targetPath) {
		try {
			// 確保目錄存在
			this.ensureDirectoryExists(targetPath);

			// 寫入檔案
			fs.writeFileSync(targetPath, buffer);
			console.log(`檔案已保存至: ${targetPath}`);
			return true;
		} catch (error) {
			console.error("保存檔案失敗:", error);
			return false;
		}
	}

	/**
	 * 確保目錄存在
	 * @param {String} filePath - 檔案路徑
	 */
	ensureDirectoryExists(filePath) {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			console.log(`已創建目錄: ${dir}`);
		}
	}

	/**
	 * 生成檔案名
	 * @param {String} originalName - 原始檔案名
	 * @param {String} prefix - 檔案名前綴
	 * @returns {String} 檔案名
	 */
	generateUniqueFileName(originalName, prefix = "") {
		const ext = path.extname(originalName);
		const baseName = path.basename(originalName, ext);
		// 清理基本檔名並添加時間戳以確保唯一性
		const sanitizedBaseName = this.sanitizeFileName(baseName);
		return `${prefix ? prefix + "_" : ""}${sanitizedBaseName}${ext}`;
	}

	/**
	 * 清理檔案名，移除特殊字符
	 * @param {String} fileName - 檔案名
	 * @returns {String} 清理後的檔案名
	 */
	sanitizeFileName(fileName) {
		return fileName
			.replace(/\s+/g, "-") // 將一個或多個空格替換為單個底線
			.replace(/[\\/:*?"<>|]/g, "_") // 將不合法字元替換為底線
			.replace(/_+/g, "_") // 將多個連續的底線合併為一個
			.trim();
	}

	/**
	 * 刪除檔案
	 * @param {String} filePath - 檔案路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteFile(filePath) {
		try {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				return true;
			}
			return false;
		} catch (error) {
			console.error("刪除檔案失敗:", error);
			return false;
		}
	}

	/**
	 * 從Web路徑刪除檔案
	 * @param {String} webPath - Web路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteFileByWebPath(webPath) {
		try {
			// 將Web路徑轉換為實體路徑
			const physicalPath = this.webToPhysicalPath(webPath);
			// 執行刪除
			return this.deleteFile(physicalPath);
		} catch (error) {
			console.error(`刪除Web路徑檔案失敗: ${webPath}`, error);
			return false;
		}
	}

	/**
	 * 遞歸刪除目錄及其內容
	 * @param {String} dirPath - 目錄路徑
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteDirectory(dirPath) {
		try {
			// 檢查路徑是否存在且為目錄
			if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
				console.log(`目錄不存在或不是有效目錄: ${dirPath}`);
				return false;
			}

			// 安全檢查 - 確保不會刪除根目錄或系統重要目錄
			const normDirPath = path.normalize(dirPath);
			const normFilesRoot = path.normalize(this.FILES_ROOT);

			if (normDirPath === normFilesRoot || !normDirPath.startsWith(normFilesRoot)) {
				console.error(`安全限制: 不允許刪除此目錄: ${dirPath}`);
				return false;
			}

			// 讀取目錄內容
			const entries = fs.readdirSync(dirPath, { withFileTypes: true });

			// 遞歸刪除所有檔案和子目錄
			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				if (entry.isDirectory()) {
					// 遞歸刪除子目錄
					this.deleteDirectory(fullPath);
				} else {
					// 刪除檔案
					fs.unlinkSync(fullPath);
					console.log(`已刪除檔案: ${fullPath}`);
				}
			}

			// 刪除空目錄
			fs.rmSync(dirPath, { recursive: true, force: true }); // Use fs.rmSync for modern Node.js
			console.log(`已(嘗試)遞歸刪除目錄: ${dirPath}`);
			return true;
		} catch (error) {
			console.error(`刪除目錄失敗: ${dirPath}`, error);
			return false;
		}
	}

	/**
	 * 將 Web 路徑轉換為實體路徑
	 * @param {String} webPath - Web 路徑
	 * @returns {String} 實體路徑
	 */
	webToPhysicalPath(webPath) {
		if (!webPath || !webPath.startsWith("/storage")) {
			throw new ApiError(400, "無效的 Web 路徑格式，必須以 /storage 開頭");
		}

		// 移除前導 /storage/ 部分
		const relativePath = webPath.substring("/storage".length);

		// 在 Windows 環境中轉換路徑分隔符
		let normalizedPath = this.isWindows ? relativePath.replace(/\//g, "\\") : relativePath;
		if (normalizedPath.startsWith("/") || normalizedPath.startsWith("\\")) {
			normalizedPath = normalizedPath.substring(1);
		}

		// 合併根路徑和相對路徑
		const fullPath = path.join(this.FILES_ROOT, normalizedPath);
		console.log(`Web路徑 ${webPath} 轉換為物理路徑: ${fullPath}`);

		return fullPath;
	}

	/**
	 * 儲存產品檔案
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {Object} options - 儲存選項
	 * @returns {String} 檔案虛擬路徑
	 */
	saveProductFile(fileBuffer, options) {
		// 驗證參數
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
			throw new ApiError(400, "無效的檔案內容");
		}

		const { hierarchyData, productCode, fileName, fileType, productId } = options;

		// 檢查必要參數
		if (!hierarchyData || !productCode || !fileName || !fileType || !productId) {
			const missingParams = [];
			if (!hierarchyData) missingParams.push("hierarchyData");
			if (!productCode) missingParams.push("productCode");
			if (!fileName) missingParams.push("fileName");
			if (!fileType) missingParams.push("fileType");
			if (!productId) missingParams.push("productId");

			throw new ApiError(400, `缺少必要參數: ${missingParams.join(", ")}`);
		}
		const { series, category, subCategory, specification } = hierarchyData;
		if (!series || !category || !subCategory || !specification) {
			throw new ApiError(400, "層級結構不完整，無法儲存產品檔案");
		}

		try {
			const entityContext = {
				id: productId, // Use ID for path generation
				// The following are now just for the human-readable part of the path
				seriesName: series.name?.TW || "unknown",
				categoryName: category.name?.TW || "unknown",
				subCategoryName: subCategory.name?.TW || "unknown",
				specificationName: specification.name?.TW || "unknown",
				productCode: productCode
			};

			// fileType can be 'images', 'documents', 'videos'.
			// The prefix for the filename can also be based on fileType.
			return this.saveAsset(fileBuffer, "products", entityContext, fileType, fileName, fileType);
		} catch (error) {
			console.error("儲存產品檔案失敗:", error);
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(500, `儲存檔案時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 儲存新聞資產 (封面, 內容圖片, 內容影片)
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {String} newsId - 新聞 ID
	 * @param {String} newsTitleTw - 新聞標題
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} assetCategory - 資產類別 ('covers', 'images', 'videos')
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveNewsAsset(fileBuffer, newsId, newsTitleTw, originalFileName, assetCategory) {
		if (!newsId || !originalFileName || !assetCategory) {
			throw new ApiError(400, "儲存新聞資產缺少 newsId, originalFileName, 或 assetCategory");
		}
		const entityContext = { id: newsId, name: newsTitleTw };
		const assetPrefix = assetCategory.slice(0, -1); // 'cover', 'image', 'video'
		return this.saveAsset(fileBuffer, "news", entityContext, assetCategory, originalFileName, assetPrefix);
	}

	/**
	 * 刪除整筆新聞的目錄
	 * @param {String} newsId - 新聞 ID
	 * @param {String} newsTitleTw - 新聞標題
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteNewsDirectory(newsId, newsTitleTw) {
		if (!newsId) {
			console.error("刪除新聞目錄缺少 newsId");
			return false;
		}
		const entityContext = { id: newsId, name: newsTitleTw };
		return this.deleteEntityDirectory("news", entityContext);
	}

	/**
	 * 儲存 FAQ 資產 (圖片, 影片, 文件)
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {String} faqId - FAQ ID
	 * @param {String} faqQuestionTw - FAQ 問題
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} assetCategory - 資產類別 ('images', 'videos', 'documents')
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveFaqAsset(fileBuffer, faqId, faqQuestionTw, originalFileName, assetCategory) {
		if (!faqId || !originalFileName || !assetCategory) {
			throw new ApiError(400, "儲存 FAQ 資產缺少 faqId, originalFileName, 或 assetCategory");
		}
		const entityContext = { id: faqId, name: faqQuestionTw };
		const assetPrefix = assetCategory.slice(0, -1); // 'image', 'video', 'document'
		return this.saveAsset(fileBuffer, "faqs", entityContext, assetCategory, originalFileName, assetPrefix);
	}

	/**
	 * 刪除整筆 FAQ 的目錄
	 * @param {String} faqId - FAQ ID
	 * @param {String} faqQuestionTw - FAQ 問題
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteFaqDirectory(faqId, faqQuestionTw) {
		if (!faqId) {
			console.error("刪除 FAQ 目錄缺少 faqId");
			return false;
		}
		const entityContext = { id: faqId, name: faqQuestionTw };
		return this.deleteEntityDirectory("faqs", entityContext);
	}

	// --- 泛用實體資產處理 ---
	/**
	 * @private
	 * 產生實體特定的基礎相對目錄路徑。
	 * @param {String} entityType - 實體類型 (e.g., "news", "products", "faqs")
	 * @param {Object} entityContext - 包含構建路徑所需資訊的物件
	 *    - for "news": { id: string, name: string (e.g., titleTw) }
	 *    - for "faqs": { id: string, name: string (e.g., questionTw) }
	 *    - for "products": { seriesName: string, categoryName: string, subCategoryName: string, specificationName: string, productCode: string }
	 * @returns {String} 相對於 /storage/{entityType}/ 的路徑部分
	 */
	_buildEntitySpecificDirPart(entityType, entityContext) {
		switch (entityType) {
			case "news":
			case "faqs":
				if (!entityContext || !entityContext.id) {
					console.error(`Context for ${entityType} must include 'id'. Received:`, entityContext);
					throw new ApiError(400, `無效的 ${entityType} 路徑上下文`);
				}
				const safeId = this.sanitizeFileName(entityContext.id.toString());
				return safeId;
			case "products":
				if (!entityContext || !entityContext.id) {
					console.error(`Context for ${entityType} must include 'id'. Received:`, entityContext);
					throw new ApiError(400, "產品路徑上下文不完整，缺少 ID");
				}
				// The primary directory is the product's unique ID.
				const productIdDir = this.sanitizeFileName(entityContext.id.toString());
				return productIdDir;
			default:
				throw new ApiError(500, `不支援的實體類型用於路徑生成: ${entityType}`);
		}
	}

	/**
	 * 產生通用實體資產的檔案儲存路徑。
	 * @param {String} entityType - 實體類型 (e.g., "news", "products", "faqs")
	 * @param {Object} entityContext - 傳遞給 _buildEntitySpecificDirPart 的上下文
	 * @param {String} assetCategory - 資產的分類/子目錄 (e.g., "images", "videos", "documents", "covers")
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} [assetPrefix="asset"] - 用於 generateUniqueFileName 的檔案名前綴
	 * @returns {Object} 包含 virtualPath 和 physicalPath 的物件
	 */
	generateAssetPath(entityType, entityContext, assetCategory, originalFileName, assetPrefix = "asset") {
		try {
			if (!entityType || !entityContext || !assetCategory || !originalFileName) {
				throw new ApiError(400, "產生資產路徑缺少必要參數");
			}

			// 此函數現在回傳一個帶有正斜線的路徑
			const entitySpecificDirPart = this._buildEntitySpecificDirPart(entityType, entityContext);
			const uniqueFileName = this.generateUniqueFileName(originalFileName, assetPrefix);

			const baseEntityDir = entityType;

			// 虛擬路徑使用正斜線
			const virtualPath = `/storage/${baseEntityDir}/${entitySpecificDirPart}/${assetCategory}/${uniqueFileName}`;

			// 將虛擬 Web 路徑轉換為絕對實體路徑
			const physicalPath = this.webToPhysicalPath(virtualPath);

			// 確保實體路徑的目錄存在
			this.ensureDirectoryExists(physicalPath);

			return { virtualPath, physicalPath };
		} catch (error) {
			console.error(`產生 ${entityType} 資產路徑失敗:`, error);
			throw error; // Re-throw to be caught by caller
		}
	}

	/**
	 * 儲存通用實體資產檔案。
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {String} entityType - 實體類型
	 * @param {Object} entityContext - 傳遞給 generateAssetPath 的上下文
	 * @param {String} assetCategory - 資產分類/子目錄
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} [assetPrefix="asset"] - 檔案名前綴
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveAsset(fileBuffer, entityType, entityContext, assetCategory, originalFileName, assetPrefix = "asset") {
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
			throw new ApiError(400, "無效的檔案內容 (通用資產儲存)");
		}
		try {
			const { virtualPath, physicalPath } = this.generateAssetPath(entityType, entityContext, assetCategory, originalFileName, assetPrefix);
			const saveResult = this.saveBufferToFile(fileBuffer, physicalPath);
			if (!saveResult) {
				throw new ApiError(500, `儲存 ${entityType} 資產檔案本身失敗`);
			}
			return virtualPath;
		} catch (error) {
			console.error(`儲存 ${entityType} 資產檔案過程失敗:`, error);
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, `儲存 ${entityType} 資產檔案時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 刪除指定實體的整個根目錄。
	 * @param {String} entityType - 實體類型
	 * @param {Object} entityContext - 傳遞給 _buildEntitySpecificDirPart 的上下文
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteEntityDirectory(entityType, entityContext) {
		try {
			const entitySpecificDirPart = this._buildEntitySpecificDirPart(entityType, entityContext);
			const baseEntityDir = entityType; // Directory for the entity type, e.g., "news", "products"
			const fullPath = path.join(this.FILES_ROOT, baseEntityDir, entitySpecificDirPart);

			console.log(`Attempting to delete entity directory: ${fullPath} for entityType: ${entityType}`);
			return this.deleteDirectory(fullPath);
		} catch (error) {
			console.error(`刪除 ${entityType} 目錄失敗 (context: ${JSON.stringify(entityContext)}):`, error);
			return false;
		}
	}
}

// 匯出單例
export default new FileUpload();
