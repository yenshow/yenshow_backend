import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../utils/responseHandler.js";

const UPLOAD_DIR = process.env.UPLOAD_TEMP_DIR || "./uploads";

// 確保上傳目錄存在
if (!fs.existsSync(UPLOAD_DIR)) {
	fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 儲存設定
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, UPLOAD_DIR); // 檔案儲存路徑
	},
	filename: (req, file, cb) => {
		// 使用時間戳 + 隨機數 + 原檔名 來避免檔名衝突
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + "-" + file.originalname);
	}
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
	const allowedTypes = [
		"image/jpeg",
		"image/png",
		"image/gif",
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true); // 接受檔案
	} else {
		console.warn(`拒絕的檔案類型: ${file.mimetype} - ${file.originalname}`);
		cb(new ApiError(400, "不支援的檔案類型"), false); // 拒絕檔案
	}
};

// 設定 Multer
const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 限制檔案大小為 5MB
		files: 3 // 限制最多上傳 3 個檔案
	}
});

// 匯出 middleware，處理名為 'files' 的欄位
// 'files' 必須與前端 FormData append 時使用的 key 一致
export const handleUploads = upload.array("files", 3);

// 錯誤處理中間件 (放在路由之後)
export const handleMulterError = (err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({ success: false, message: "檔案大小超過 5MB 限制" });
		}
		if (err.code === "LIMIT_FILE_COUNT") {
			return res.status(400).json({ success: false, message: "上傳檔案數量超過 3 個限制" });
		}
		// 其他 Multer 錯誤
		return res.status(400).json({ success: false, message: err.message });
	} else if (err) {
		// 其他非 Multer 錯誤 (例如 fileFilter 傳出的 ApiError)
		return res.status(err.statusCode || 400).json({ success: false, message: err.message });
	}
	next();
};
