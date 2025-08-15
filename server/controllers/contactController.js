import { successResponse, errorResponse } from "../utils/responseHandler.js";
import { sendContactEmail } from "../services/emailService.js";
import { StatusCodes } from "http-status-codes";
import fs from "fs/promises"; // 用於非同步刪除檔案
import path from "path";

/**
 * 處理聯絡表單提交
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleContactForm = async (req, res, next) => {
	// req.body 包含文字欄位 (由 multer 解析 multipart/form-data)
	// req.files 包含上傳的檔案資訊陣列
	const formData = req.body;
	const files = req.files || []; // 確保 files 永遠是陣列

	// 確保 type 是陣列 (如果前端只傳一個值，可能變字串)
	if (formData.type && typeof formData.type === "string") {
		formData.type = [formData.type];
	} else if (!formData.type) {
		formData.type = []; // 如果沒傳，設為空陣列
	}

	try {
		// 簡單的後端驗證 (建議使用 express-validator 做更完整的驗證)
		if (!formData.name || !formData.email || !formData.subject || !formData.details || formData.type.length === 0 || !formData.phone) {
			// 如果驗證失敗，需要先刪除已上傳的檔案
			for (const file of files) {
				await fs.unlink(file.path);
			}
			return errorResponse(res, StatusCodes.BAD_REQUEST, "缺少必要的表單欄位");
		}
		if (!formData.email.includes("@")) {
			for (const file of files) {
				await fs.unlink(file.path);
			}
			return errorResponse(res, StatusCodes.BAD_REQUEST, "無效的 Email 格式");
		}

		// 調用 Email Service
		await sendContactEmail(formData, files);

		// 郵件寄送成功後，刪除暫存檔案
		// 注意：如果 Email Service 內部有錯誤處理並 throw，這裡可能不會執行
		// 可以在 emailService 的 catch 區塊也加入刪除邏輯，或使用 finally
		for (const file of files) {
			try {
				await fs.unlink(file.path);
				console.log(`已刪除暫存檔案: ${file.filename}`);
			} catch (unlinkError) {
				console.error(`刪除檔案 ${file.filename} 失敗:`, unlinkError);
				// 即使刪除失敗，也繼續流程，但記錄錯誤
			}
		}

		successResponse(res, StatusCodes.OK, "表單提交成功，我們將盡快與您聯繫");
	} catch (error) {
		// 如果寄信或其他過程出錯，也要嘗試刪除已上傳的檔案
		for (const file of files) {
			try {
				await fs.unlink(file.path);
			} catch (unlinkError) {
				console.error(`錯誤處理中刪除檔案 ${file.filename} 失敗:`, unlinkError);
			}
		}
		// 將錯誤傳遞給全局錯誤處理器
		next(error);
	}
};
