import fs from "fs";
import path from "path";
import multer from "multer";
import { ApiError } from "./responseHandler.js";
import os from "os";

const MAX_TOTAL_NEWS_IMAGES = 20; // 新聞總圖片數上限 (封面+內容)
const MAX_NEWS_CONTENT_IMAGES = MAX_TOTAL_NEWS_IMAGES - 1; // 內容圖片上限
const MAX_NEWS_CONTENT_VIDEOS = 5; // 新增：內容影片上限 (可根據需求調整)
const MAX_NEWS_CONTENT_DOCUMENTS = 5; // 新增：內容文件上限 (可根據需求調整)
const MAX_CASE_STUDY_IMAGES = 10; // 案例圖片上限

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
			// 定義檔案類型驗證規則
			const fileTypeRules = {
				// 圖片欄位
				imageFields: ["contentImages", "images", "faqImages", "coverImage", "caseStudyImages"],
				// 文件欄位
				documentFields: ["contentDocuments", "documents", "documents_TW", "documents_EN", "faqDocuments", "contentDocuments", "caseStudyDocuments"],
				// 影片欄位
				videoFields: ["contentVideos", "videos", "faqVideos", "caseStudyVideos"]
			};

			// 檢查檔案類型
			if (fileTypeRules.imageFields.includes(file.fieldname)) {
				if (!file.mimetype.startsWith("image/")) {
					return cb(new ApiError(400, `${file.fieldname} 只允許上傳圖片檔案`), false);
				}
			} else if (fileTypeRules.documentFields.includes(file.fieldname)) {
				if (file.mimetype !== "application/pdf") {
					return cb(new ApiError(400, `${file.fieldname} 僅允許 PDF 格式`), false);
				}
			} else if (fileTypeRules.videoFields.includes(file.fieldname)) {
				if (!file.mimetype.startsWith("video/")) {
					return cb(new ApiError(400, `${file.fieldname} 只允許上傳影片檔案`), false);
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
			{ name: "contentVideos", maxCount: MAX_NEWS_CONTENT_VIDEOS },
			{ name: "contentDocuments", maxCount: MAX_NEWS_CONTENT_DOCUMENTS }
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
	 * @param {String} filePath - 檔案路徑或目錄路徑
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
	 * @param {Object} options - 額外選項
	 * @returns {String} 檔案名
	 */
	generateUniqueFileName(originalName, prefix = "", options = {}) {
		const ext = path.extname(originalName);

		// 如果是產品檔案且有產品代碼，使用標準化命名
		if (options.productCode && (options.fileType === "documents" || options.fileType === "images")) {
			const productCode = this.extractProductCode(options.productCode);

			if (options.fileType === "images") {
				// 圖片：只需要產品代碼，不需要語系、類型後綴和序號
				return `${productCode}${ext}`;
			} else {
				// 文件：需要語系後綴和序號
				const langSuffix = options.lang ? `_${options.lang}` : "";
				return `${productCode}_DataSheet${langSuffix}${ext}`;
			}
		}

		// 其他檔案使用原始邏輯
		const baseName = path.basename(originalName, ext);
		const sanitizedBaseName = this.sanitizeFileName(baseName);
		return `${prefix ? prefix + "_" : ""}${sanitizedBaseName}${ext}`;
	}

	/**
	 * 提取產品代碼
	 * @param {String} productCode - 產品代碼
	 * @returns {String} 清理後的產品代碼
	 */
	extractProductCode(productCode) {
		if (!productCode) return "";

		// 移除中文字符和特殊字符，只保留英文字母、數字、連字符和底線
		const cleanCode = productCode
			.replace(/[\u4e00-\u9fff]/g, "") // 移除中文字符
			.replace(/[^\w\-]/g, "") // 只保留英文字母、數字、連字符和底線
			.replace(/_+/g, "_") // 將多個連續的底線合併為一個
			.replace(/^-+|-+$/g, "") // 移除開頭和結尾的連字符
			.trim();

		return cleanCode || "product";
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

		const { hierarchyData, productCode, fileName, fileType, productId, lang, index } = options;

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
				id: productId,
				seriesName: series.name?.TW || "unknown",
				categoryName: category.name?.TW || "unknown",
				subCategoryName: subCategory.name?.TW || "unknown",
				specificationName: specification.name?.TW || "unknown",
				productCode: productCode
			};

			const fileNameOptions = {
				productCode: productCode,
				fileType: fileType,
				lang: lang,
				index: index
			};

			return this.saveAsset(fileBuffer, "products", entityContext, fileType, fileName, fileType, fileNameOptions);
		} catch (error) {
			console.error("儲存產品檔案失敗:", error);
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(500, `儲存檔案時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 通用實體資產儲存方法
	 * @param {Buffer} fileBuffer - 檔案內容
	 * @param {String} entityType - 實體類型 ('news', 'faqs', 'case-studies')
	 * @param {String} entityId - 實體 ID
	 * @param {String} entityName - 實體名稱
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} assetCategory - 資產類別 ('images', 'videos', 'documents', 'covers')
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveEntityAsset(fileBuffer, entityType, entityId, entityName, originalFileName, assetCategory) {
		if (!entityId || !originalFileName || !assetCategory) {
			throw new ApiError(400, `儲存${entityType}資產缺少 entityId, originalFileName, 或 assetCategory`);
		}
		const entityContext = { id: entityId, name: entityName };
		const assetPrefix = assetCategory.slice(0, -1); // 移除複數 's'
		return this.saveAsset(fileBuffer, entityType, entityContext, assetCategory, originalFileName, assetPrefix);
	}

	/**
	 * 通用實體目錄刪除方法
	 * @param {String} entityType - 實體類型 ('news', 'faqs', 'case-studies')
	 * @param {String} entityId - 實體 ID
	 * @param {String} entityName - 實體名稱
	 * @returns {Boolean} 是否成功刪除
	 */
	deleteEntityDirectoryByType(entityType, entityId, entityName) {
		if (!entityId) {
			console.error(`刪除${entityType}目錄缺少 entityId`);
			return false;
		}
		const entityContext = { id: entityId, name: entityName };
		return this.deleteEntityDirectory(entityType, entityContext);
	}

	// === 向後兼容的包裝方法 ===

	/**
	 * 儲存新聞資產 (向後兼容)
	 */
	saveNewsAsset(fileBuffer, newsId, newsTitleTw, originalFileName, assetCategory) {
		return this.saveEntityAsset(fileBuffer, "news", newsId, newsTitleTw, originalFileName, assetCategory);
	}

	/**
	 * 刪除新聞目錄 (向後兼容)
	 */
	deleteNewsDirectory(newsId, newsTitleTw) {
		return this.deleteEntityDirectoryByType("news", newsId, newsTitleTw);
	}

	/**
	 * 儲存 FAQ 資產 (向後兼容)
	 */
	saveFaqAsset(fileBuffer, faqId, faqQuestionTw, originalFileName, assetCategory) {
		return this.saveEntityAsset(fileBuffer, "faqs", faqId, faqQuestionTw, originalFileName, assetCategory);
	}

	/**
	 * 刪除 FAQ 目錄 (向後兼容)
	 */
	deleteFaqDirectory(faqId, faqQuestionTw) {
		return this.deleteEntityDirectoryByType("faqs", faqId, faqQuestionTw);
	}

	// --- 泛用實體資產處理 ---
	/**
	 * @private
	 * 產生實體特定的基礎相對目錄路徑。
	 * @param {String} entityType - 實體類型
	 * @param {Object} entityContext - 包含 id 的上下文物件
	 * @returns {String} 相對於 /storage/{entityType}/ 的路徑部分
	 */
	_buildEntitySpecificDirPart(entityType, entityContext) {
		if (!entityContext || !entityContext.id) {
			console.error(`Context for ${entityType} must include 'id'. Received:`, entityContext);
			throw new ApiError(400, `無效的 ${entityType} 路徑上下文`);
		}

		return this.sanitizeFileName(entityContext.id.toString());
	}

	/**
	 * 產生通用實體資產的檔案儲存路徑。
	 * @param {String} entityType - 實體類型
	 * @param {Object} entityContext - 實體上下文
	 * @param {String} assetCategory - 資產分類
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} [assetPrefix="asset"] - 檔案名前綴
	 * @param {Object} [options] - 額外選項
	 * @returns {Object} 包含 virtualPath 和 physicalPath 的物件
	 */
	generateAssetPath(entityType, entityContext, assetCategory, originalFileName, assetPrefix = "asset", options = {}) {
		try {
			if (!entityType || !entityContext || !assetCategory || !originalFileName) {
				throw new ApiError(400, "產生資產路徑缺少必要參數");
			}

			// 此函數現在回傳一個帶有正斜線的路徑
			const entitySpecificDirPart = this._buildEntitySpecificDirPart(entityType, entityContext);
			const uniqueFileName = this.generateUniqueFileName(originalFileName, assetPrefix, options);

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
	 * @param {Object} entityContext - 實體上下文
	 * @param {String} assetCategory - 資產分類
	 * @param {String} originalFileName - 原始檔案名
	 * @param {String} [assetPrefix="asset"] - 檔案名前綴
	 * @param {Object} [options] - 額外選項
	 * @returns {String} 檔案的虛擬路徑
	 */
	saveAsset(fileBuffer, entityType, entityContext, assetCategory, originalFileName, assetPrefix = "asset", options = {}) {
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
			throw new ApiError(400, "無效的檔案內容 (通用資產儲存)");
		}
		try {
			const { virtualPath, physicalPath } = this.generateAssetPath(entityType, entityContext, assetCategory, originalFileName, assetPrefix, options);
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
	 * @param {Object} entityContext - 實體上下文
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

	/**
	 * 獲取案例研究檔案上傳中間件
	 * @returns {Function} Multer 中間件
	 */
	getCaseStudyUploadMiddleware() {
		return this.upload.fields([
			{ name: "coverImage", maxCount: 1 },
			{ name: "images", maxCount: MAX_CASE_STUDY_IMAGES },
			{ name: "documents", maxCount: 5 },
			{ name: "videos", maxCount: 3 }
		]);
	}

	/**
	 * 儲存案例研究資產 (向後兼容)
	 */
	saveCaseStudyAsset(fileBuffer, caseStudyId, caseStudyTitle, originalFileName, assetCategory) {
		return this.saveEntityAsset(fileBuffer, "case-studies", caseStudyId, caseStudyTitle, originalFileName, assetCategory);
	}

	/**
	 * 刪除案例研究目錄 (向後兼容)
	 */
	deleteCaseStudyDirectory(caseStudyId, caseStudyTitle) {
		return this.deleteEntityDirectoryByType("case-studies", caseStudyId, caseStudyTitle);
	}
}

// 匯出單例
export default new FileUpload();
