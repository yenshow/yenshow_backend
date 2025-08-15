import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";

/**
 * API 錯誤類
 * 用於統一處理 API 錯誤
 */
export class ApiError extends Error {
	constructor(statusCode, message) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}

	static badRequest(message) {
		return new ApiError(StatusCodes.BAD_REQUEST, message);
	}

	static unauthorized(message = "未經授權的訪問") {
		return new ApiError(StatusCodes.UNAUTHORIZED, message);
	}

	static forbidden(message = "禁止訪問") {
		return new ApiError(StatusCodes.FORBIDDEN, message);
	}

	static notFound(message = "找不到資源") {
		return new ApiError(StatusCodes.NOT_FOUND, message);
	}

	static conflict(message) {
		return new ApiError(StatusCodes.CONFLICT, message);
	}

	static internal(message = "內部伺服器錯誤") {
		return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message);
	}
}

/**
 * 處理 Mongoose 與系統錯誤
 * @param {Error} err 錯誤對象
 * @returns {ApiError} 轉換後的 API 錯誤
 */
export const handleMongooseError = (err) => {
	// 處理 CastError (無效的 ObjectId)
	if (err.name === "CastError") {
		// 檢查是否為 JSON 物件形式的 ID
		let value = err.value;
		if (typeof value === "object" && value !== null) {
			// 嘗試提取實際 ID 值
			if (value.$ne) {
				try {
					// 使用 $ne 中的值嘗試建立有效的 ObjectId
					new mongoose.Types.ObjectId(value.$ne);
					return ApiError.badRequest(`請使用有效的 ID 格式 (${value.$ne})`);
				} catch (e) {
					// 即使 $ne 的值也不是有效 ID
				}
			}
		}
		return ApiError.badRequest(`無效的 ${err.path}: ${err.value}`);
	}

	// 處理 Mongoose 唯一性錯誤 (11000)
	if (err.code === 11000) {
		const field = Object.keys(err.keyValue || {})[0] || "欄位";
		return ApiError.conflict(`${field}: ${err.keyValue[field]} 已存在`);
	}

	return ApiError.internal();
};

/**
 * 成功回應
 * @param {Object} res - Express 回應物件
 * @param {Number} statusCode - HTTP 狀態碼
 * @param {String} message - 成功訊息
 * @param {Object} data - 回應資料
 * @returns {Object} Express 回應
 */
export const successResponse = (res, statusCode = StatusCodes.OK, message = "操作成功", data = {}) => {
	return res.status(statusCode).json({
		success: true,
		message,
		...data
	});
};

/**
 * 錯誤回應
 * @param {Object} res - Express 回應物件
 * @param {Number} statusCode - HTTP 狀態碼
 * @param {String|Array} message - 錯誤訊息
 * @param {Object} data - 附加錯誤資料
 * @returns {Object} Express 回應
 */
export const errorResponse = (res, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message = "操作失敗", data = {}) => {
	return res.status(statusCode).json({
		success: false,
		message,
		...data
	});
};

/**
 * 使用 ApiError 生成錯誤回應
 * @param {Object} res - Express 回應物件
 * @param {ApiError} apiError - API 錯誤對象
 * @param {Object} data - 附加錯誤資料
 * @returns {Object} Express 回應
 */
export const apiErrorResponse = (res, apiError, data = {}) => {
	return errorResponse(res, apiError.statusCode, apiError.message, data);
};

// 分頁回應
export const paginatedResponse = (res, data, total, page, limit) => {
	return res.status(StatusCodes.OK).json({
		success: true,
		message: "",
		result: {
			data,
			total,
			page: parseInt(page),
			totalPages: Math.ceil(total / limit)
		}
	});
};

// 驗證錯誤回應
export const validationErrorResponse = (res, errors) => {
	return res.status(StatusCodes.BAD_REQUEST).json({
		success: false,
		message: "驗證錯誤",
		errors
	});
};

/**
 * 通用的錯誤捕獲包裝器
 * @param {Function} fn - 要執行的非同步函數
 * @returns {Function} - 包裝後的函數
 */
export const catchAsync = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 通用的控制器錯誤處理
 * @param {Function} controllerFn - 控制器函數
 * @param {String} entityName - 實體名稱，用於日誌
 * @returns {Function} - 包裝後的控制器函數
 */
export const withErrorHandling = (controllerFn, entityName) => async (req, res) => {
	try {
		await controllerFn(req, res);
	} catch (error) {
		console.error(`${entityName} 操作失敗:`, error);
		return errorResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
	}
};

/**
 * 創建特定實體的回應處理器
 * @param {String} entityName - 實體名稱
 * @returns {Object} 回應處理器物件
 */
export const createResponseHandler = (entityName) => ({
	success: (res, statusCode = StatusCodes.OK, data = {}, message) => {
		const defaultMessage = message || `${entityName}操作成功`;
		return successResponse(res, statusCode, defaultMessage, data);
	},

	error: (res, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message, data = {}) => {
		const defaultMessage = message || `${entityName}操作失敗`;
		return errorResponse(res, statusCode, defaultMessage, data);
	},

	created: (res, data = {}, message) => {
		const defaultMessage = message || `${entityName}創建成功`;
		return successResponse(res, StatusCodes.CREATED, defaultMessage, data);
	},

	notFound: (res, message) => {
		const defaultMessage = message || `找不到該${entityName}`;
		return errorResponse(res, StatusCodes.NOT_FOUND, defaultMessage);
	},

	badRequest: (res, message, data = {}) => {
		const defaultMessage = message || `${entityName}請求無效`;
		return errorResponse(res, StatusCodes.BAD_REQUEST, defaultMessage, data);
	}
});

/**
 * 全局錯誤處理中間件
 */
export const createErrorHandlerMiddleware = () => (err, req, res, next) => {
	err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	err.status = err.status || "error";

	// 是否為開發模式
	const isDev = process.env.NODE_ENV === "development";

	if (isDev) {
		return res.status(err.statusCode).json({
			status: err.status,
			message: err.message || "未知錯誤",
			stack: err.stack,
			error: err
		});
	}

	// 生產模式 - 只回傳基本錯誤資訊
	return res.status(err.statusCode).json({
		status: err.status,
		message: err.isOperational ? err.message || "未知錯誤" : "伺服器錯誤"
	});
};
