import { ApiError, successResponse } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import HierarchyService from "../services/HierarchyService.js"; // 引入新的服務
import { transformHierarchicalDataImagePaths } from "../utils/urlTransformer.js";
import { getAccessOptions } from "../utils/accessUtils.js"; // <--- 導入 getAccessOptions

/**
 * 階層管理器 - Controller 層
 * 處理 HTTP 請求，調用 HierarchyService 處理業務邏輯
 */
class HierarchyManager {
	constructor() {
		// 注入 HierarchyService (單例)
		this.hierarchyService = HierarchyService;

		// 綁定方法
		this.getFullHierarchy = this.getFullHierarchy.bind(this);
		this.getChildrenByParentId = this.getChildrenByParentId.bind(this);
		this.getParentHierarchy = this.getParentHierarchy.bind(this);
		this.getSubHierarchy = this.getSubHierarchy.bind(this); // 確保綁定新方法
	}

	/**
	 * 處理錯誤 (Controller 層級)
	 * @private
	 * @param {Error} error - 錯誤對象
	 * @param {String} operation - 操作類型
	 * @param {Function} next - 下一個中間件
	 */
	_handleError(error, operation, next) {
		console.error(`${operation}階層資料時發生錯誤:`, error);
		// 將錯誤傳遞給全局錯誤處理中間件
		next(error);
	}

	/**
	 * GET /hierarchy - 獲取完整的數據層次結構
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getFullHierarchy(req, res, next) {
		try {
			const { lang } = req.query;
			const accessOptions = getAccessOptions(req); // <--- 獲取 accessOptions
			// maxDepth 可以從 query 獲取，如果需要的話
			const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth) : 5;

			// 調用 Service 處理業務邏輯
			const hierarchyData = await this.hierarchyService.getFullHierarchyData({ language: lang, maxDepth, accessOptions }); // <--- 傳遞 accessOptions

			// 應用遞迴轉換
			const baseUrl = process.env.PUBLIC_BASE_URL;
			const transformedHierarchy = transformHierarchicalDataImagePaths(hierarchyData, baseUrl);

			return successResponse(res, StatusCodes.OK, "獲取完整階層資料成功", {
				result: { hierarchy: transformedHierarchy }
			});
		} catch (error) {
			this._handleError(error, "獲取完整階層", next);
		}
	}

	/**
	 * GET /hierarchy/children/:parentType/:parentId - 根據父項ID獲取子項
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getChildrenByParentId(req, res, next) {
		try {
			const { parentType, parentId } = req.params;
			const { lang } = req.query;
			const accessOptions = getAccessOptions(req); // <--- 獲取 accessOptions

			// 調用 Service 處理業務邏輯
			const result = await this.hierarchyService.getChildrenByParentIdData(parentType, parentId, { language: lang, accessOptions }); // <--- 傳遞 accessOptions

			// 從 service 返回的結果構建響應
			const childService = await this.hierarchyService.getEntityService(result.childType);

			return successResponse(res, StatusCodes.OK, `獲取 ${childService.modelName.toLowerCase()} 列表成功`, {
				result: {
					[childService.responseKey || result.childType]: result.children, // 使用 EntityService 的 responseKey 或 childType
					parent: result.parent
				}
			});
		} catch (error) {
			this._handleError(error, "獲取子項", next);
		}
	}

	/**
	 * GET /hierarchy/parents/:itemType/:itemId - 獲取某項的所有上層階層
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getParentHierarchy(req, res, next) {
		try {
			const { itemType, itemId } = req.params;
			const { lang } = req.query;
			const accessOptions = getAccessOptions(req); // <--- 獲取 accessOptions

			// 調用 Service 處理業務邏輯
			const hierarchy = await this.hierarchyService.getParentHierarchyData(itemType, itemId, { language: lang, accessOptions }); // <--- 傳遞 accessOptions

			return successResponse(res, StatusCodes.OK, "獲取父層階層資料成功", {
				result: { hierarchy } // 直接返回 service 計算好的層級列表
			});
		} catch (error) {
			this._handleError(error, "獲取父層階層", next);
		}
	}

	/**
	 * GET /hierarchy/subtree/:itemType/:itemId - 獲取指定項目以下的子階層結構
	 * @param {Object} req - 請求對象
	 * @param {Object} res - 響應對象
	 * @param {Function} next - 下一個中間件
	 */
	async getSubHierarchy(req, res, next) {
		try {
			const { itemType, itemId } = req.params;
			const { lang } = req.query;
			const accessOptions = getAccessOptions(req); // <--- 獲取 accessOptions

			// 調用 Service 處理業務邏輯
			const subHierarchyData = await this.hierarchyService.getSubHierarchyData(itemType, itemId, { language: lang, accessOptions }); // <--- 傳遞 accessOptions

			// 應用遞迴轉換
			const baseUrl = process.env.PUBLIC_BASE_URL;
			const transformedHierarchy = transformHierarchicalDataImagePaths(subHierarchyData, baseUrl);

			return successResponse(res, StatusCodes.OK, `獲取 ${itemType} 子階層資料成功`, {
				result: { hierarchy: transformedHierarchy }
			});
		} catch (error) {
			this._handleError(error, "獲取子階層", next);
		}
	}
}

// 匯出單例實例
export default new HierarchyManager();
