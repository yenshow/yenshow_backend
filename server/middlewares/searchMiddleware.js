import { StatusCodes } from "http-status-codes";
import { errorResponse, catchAsync } from "../utils/responseHandler.js";

/**
 * 處理通用搜尋參數
 */
export const processSearchParams = catchAsync(async (req, res, next) => {
	const { keyword, lang = "TW", sort = "createdAt", sortDirection = "desc" } = req.query;

	// 驗證排序方向
	if (sortDirection && !["asc", "desc"].includes(sortDirection)) {
		return errorResponse(res, StatusCodes.BAD_REQUEST, "排序方向必須是 'asc' 或 'desc'");
	}

	// 設置搜尋參數
	req.searchParams = {
		keyword: keyword ? keyword.trim() : "",
		lang,
		sort,
		sortDirection
	};

	next();
});

export default {
	processSearchParams
};
