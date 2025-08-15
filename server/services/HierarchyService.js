import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import { EntityService } from "./EntityService.js";

// 排序輔助函數
function sortItemsByCode(items) {
	if (!Array.isArray(items)) return [];

	const parseCode = (code) => {
		if (typeof code !== "string" || !code) {
			return { num: Infinity, textPart: code || "" };
		}
		// 尋找第一個數字序列及其後的任何字符
		const match = code.match(/(\d+)(.*)/);
		if (match) {
			const num = parseInt(match[1], 10);
			const textPart = match[2] || ""; // 數字後的所有字符
			return { num, textPart };
		}
		// 如果沒有數字，則整個作為文本比較，將 num 設為 Infinity 使其排在後面
		return { num: Infinity, textPart: code };
	};

	return [...items].sort((a, b) => {
		// 假設 item 對象有 code 屬性
		const valA = parseCode(a.code);
		const valB = parseCode(b.code);

		if (valA.num !== valB.num) {
			return valA.num - valB.num; // 按數字升序
		}
		// 數字相同時，按文本部分進行不區分大小寫的排序
		return valA.textPart.localeCompare(valB.textPart, undefined, { sensitivity: "base" });
	});
}

/**
 * HierarchyService 類 - 處理跨模型的層級關係邏輯
 */
class HierarchyService {
	constructor() {
		// 層級關係定義
		this.hierarchy = [
			{ name: "series", childField: "categories" },
			{ name: "categories", parentField: "series", childField: "subCategories" },
			{ name: "subCategories", parentField: "categories", childField: "specifications" },
			{ name: "specifications", parentField: "subCategories", childField: "products" },
			{ name: "products", parentField: "specifications" }
		];

		// 層級關係快速查詢表
		this.hierarchyMap = this.hierarchy.reduce((map, level) => {
			map[level.name] = level;
			return map;
		}, {});

		// 服務實例緩存 (取代原本 Controller 的緩存)
		this._serviceCache = {};
	}

	/**
	 * 獲取指定模型的 EntityService 實例 - 惰性加載
	 * @param {String} modelName - 模型名稱 (例如 'series', 'categories', 'subCategories')
	 * @returns {Promise<EntityService>} EntityService 實例
	 */
	async getEntityService(modelName) {
		// 如果已經緩存，直接返回
		if (this._serviceCache[modelName]) {
			return this._serviceCache[modelName];
		}

		// 動態導入模型並創建服務實例
		try {
			const Model = (await import(`../models/${modelName}.js`)).default;

			// 找到該層級的配置，以傳遞給 EntityService
			const levelConfig = this.hierarchyMap[modelName] || {};
			let parentModel = null;
			if (levelConfig.parentField) {
				// 找到父模型的名稱 (例如 'series')
				const parentModelName = this.hierarchy.find((l) => l.childField === modelName)?.name;
				if (parentModelName) {
					parentModel = (await import(`../models/${parentModelName}.js`)).default;
				}
			}

			const serviceInstance = new EntityService(Model, {
				parentField: levelConfig.parentField,
				parentModel: parentModel
				// basicFields 可以保留預設或從配置讀取
			});
			this._serviceCache[modelName] = serviceInstance;
			return serviceInstance;
		} catch (error) {
			// 在錯誤訊息中包含 modelName 可能更有幫助
			console.error(`載入模型 ${modelName}.js 或建立服務失敗:`, error);
			throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `無法載入模型服務: ${modelName}`);
		}
	}

	/**
	 * 檢查層級類型是否有效
	 * @private
	 * @param {String} type - 層級類型
	 * @throws {ApiError} 無效類型錯誤
	 */
	_validateEntityType(type) {
		if (!this.hierarchyMap[type]) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `無效的實體類型: ${type}`);
		}
	}

	/**
	 * 遞迴建立層次結構樹 (業務邏輯核心)
	 * @param {String} type - 當前層級類型
	 * @param {String} id - 當前項目ID
	 * @param {Object} options - 選項 { language, maxDepth, currentDepth }
	 * @returns {Promise<Object|null>} 層次結構樹節點或 null
	 */
	async buildHierarchyTree(type, id, options = {}) {
		const currentDepth = options.currentDepth || 0;
		const maxDepth = options.maxDepth === undefined ? 5 : options.maxDepth; // 默認深度 5
		const language = options.language; // 提取語言選項
		const accessOptions = options.accessOptions || { filterActive: true }; // <--- 獲取 accessOptions，預設為官網過濾

		// 檢查深度限制
		if (maxDepth !== -1 && currentDepth > maxDepth) {
			// maxDepth 為 -1 表示不限制深度
			// 可以返回基礎信息或 null，取決於需求
			// 返回基礎信息可能更有用
			const service = await this.getEntityService(type);
			try {
				const minimalItem = await service.ensureExists(id);
				return { ...service.formatOutput(minimalItem, { language }), _id: id, type, note: "達到最大深度限制" };
			} catch {
				return { _id: id, type, error: "Item not found but reached max depth" };
			}
		}

		try {
			// 獲取當前層級的服務
			const service = await this.getEntityService(type);

			// 獲取當前項目
			const item = await service.ensureExists(id); // 通常只獲取 active 的項目
			if (!item) return null; // 如果項目不存在或 inactive，則不包含在樹中

			// 如果是產品層級，且需要過濾 active，但當前產品是 inactive，則不應包含在樹中
			if (type === "products" && accessOptions.filterActive && !item.isActive) {
				return null;
			}

			// 格式化當前項目，傳遞 language 選項
			const formattedItem = service.formatOutput(item, { language });

			// 獲取子層類型
			const childType = this.hierarchyMap[type]?.childField;

			// 如果沒有子層類型或已達最大深度，直接返回當前項目
			if (!childType || (maxDepth !== -1 && currentDepth === maxDepth)) {
				if (formattedItem.createdAt instanceof Date) {
					formattedItem.createdAt = formattedItem.createdAt.toISOString();
				}
				if (formattedItem.updatedAt instanceof Date) {
					formattedItem.updatedAt = formattedItem.updatedAt.toISOString();
				}
				return formattedItem;
			}

			// 獲取子層服務
			const childService = await this.getEntityService(childType);

			// 獲取子項
			const searchQuery = { [childService.parentField]: id };
			// 如果子層是 products，且需要過濾 active，則加入 isActive: true
			if (childType === "products" && accessOptions.filterActive) {
				searchQuery.isActive = true;
			}

			const childrenResult = await childService.search(
				searchQuery,
				{ language } // 移除 sort 選項，排序將由後續的 sortItemsByCode 處理
			);

			// 遞迴處理每個子項
			const childrenWithSubtree = [];
			if (childrenResult && childrenResult.data) {
				const sortedChildren = sortItemsByCode(childrenResult.data); // 在此排序
				for (const child of sortedChildren) {
					// 遞迴調用，增加深度
					const childWithSubtree = await this.buildHierarchyTree(childType, child._id, { ...options, currentDepth: currentDepth + 1 });
					if (childWithSubtree) {
						// 只添加成功獲取到的子節點
						childrenWithSubtree.push(childWithSubtree);
					}
				}
			}

			// 添加子項到當前項目
			return {
				...formattedItem,
				[childType]: childrenWithSubtree // 使用 childType 作為鍵名
			};
		} catch (error) {
			// 如果在查找當前項目時出錯（例如 ensureExists 拋出 NOT_FOUND）
			if (error instanceof ApiError && error.statusCode === StatusCodes.NOT_FOUND) {
				console.warn(`構建層次結構時找不到項目 (${type}, ${id})`);
				return null; // 找不到項目，則此節點不應存在於樹中
			}
			console.error(`構建層次結構時發生錯誤 (${type}, ${id}):`, error);
			// 對於其他錯誤，可以選擇拋出，或者返回部分信息
			// 這裡選擇返回基礎信息及錯誤標記
			return { _id: id, type, error: `構建子樹時出錯: ${error.message}` };
		}
	}

	/**
	 * 獲取完整的數據層次結構 (業務邏輯)
	 * @param {Object} options - 選項 { language, maxDepth }
	 * @returns {Promise<Array>} 完整的層次結構數據
	 */
	async getFullHierarchyData(options = {}) {
		const { language, maxDepth, accessOptions } = options;

		// 獲取所有系列（最頂層）
		const seriesService = await this.getEntityService("series");
		// 系列本身不過濾 isActive，但其下的產品會通過 buildHierarchyTree 過濾
		const seriesResult = await seriesService.search({}, { language, sort: { createdAt: 1 } });

		const hierarchyData = [];

		// 對每個系列，遞迴獲取完整的層次結構
		for (const series of seriesResult.data) {
			// 使用 buildHierarchyTree
			const seriesWithChildren = await this.buildHierarchyTree("series", series._id, { language, maxDepth, accessOptions });
			if (seriesWithChildren) {
				// 只添加成功構建的樹
				hierarchyData.push(seriesWithChildren);
			}
		}

		return hierarchyData;
	}

	/**
	 * 根據父項ID獲取子項列表 (業務邏輯)
	 * @param {String} parentType - 父層級類型
	 * @param {String} parentId - 父層級ID
	 * @param {Object} options - 選項 { language }
	 * @returns {Promise<Object>} 子項列表及父項信息 { children: Array, childType: String, parent: Object }
	 */
	async getChildrenByParentIdData(parentType, parentId, options = {}) {
		const { language, accessOptions } = options;

		// 檢查父層級類型有效性
		this._validateEntityType(parentType);

		// 檢查父實體是否存在 (可選但建議)
		const parentService = await this.getEntityService(parentType);
		await parentService.ensureExists(parentId);

		// 獲取子層類型
		const childType = this.hierarchyMap[parentType]?.childField;

		// 檢查是否有子層
		if (!childType) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `該層級 (${parentType}) 沒有子層或不支援該操作`);
		}

		// 獲取子層服務
		const childService = await this.getEntityService(childType);

		// 獲取子項
		const childSearchQuery = { [childService.parentField]: parentId };
		// 如果子層是 products，且需要過濾 active，則加入 isActive: true
		// (這也適用於其他層級，如果它們也需要根據 accessOptions 過濾 isActive 的話)
		if (childType === "products" && accessOptions && accessOptions.filterActive) {
			childSearchQuery.isActive = true;
		}
		// 你也可以考慮為所有層級的 search 都加入 accessOptions.filterActive 判斷
		// else if (accessOptions && accessOptions.filterActive && childService.model.schema.paths.isActive) {
		//   childSearchQuery.isActive = true;
		// }

		const childItemsResult = await childService.search(childSearchQuery, { language });

		const sortedChildren = sortItemsByCode(childItemsResult.data || []); // 在此排序

		return {
			children: sortedChildren, // 使用排序後的子項
			childType: childType,
			parent: {
				type: parentType,
				id: parentId
			}
		};
	}

	/**
	 * 獲取某項的所有上層階層 (業務邏輯)
	 * @param {String} itemType - 當前項目類型
	 * @param {String} itemId - 當前項目ID
	 * @param {Object} options - 選項 { language }
	 * @returns {Promise<Array>} 從頂層到底層的父層級項目列表
	 */
	async getParentHierarchyData(itemType, itemId, options = {}) {
		const { language, accessOptions } = options; // accessOptions 在此方法中可能不需要，因為父層通常都需要存在

		// 檢查項目類型有效性
		this._validateEntityType(itemType);

		// 尋找項目本身
		const service = await this.getEntityService(itemType);
		const item = await service.ensureExists(itemId); // 不限制 isActive，因為可能需要查找非 active 項目的父層

		// 準備返回的層次結構
		const hierarchy = [];

		// 添加當前項目
		hierarchy.push({
			type: itemType,
			item: service.formatOutput(item, { language }) // 格式化輸出
		});

		// 尋找所有父層
		let currentType = itemType;
		let currentItem = item;

		while (true) {
			// 獲取父層類型和對應的字段名
			const levelConfig = this.hierarchyMap[currentType];
			const parentType = levelConfig?.parentField;
			const parentIdField = levelConfig?.parentField; // The field name in the current item that stores the parent ID

			// 如果沒有父層類型或父ID字段，退出循環
			if (!parentType || !parentIdField) {
				break;
			}

			// 獲取父層ID
			const parentId = currentItem[parentIdField]; // 從當前項目獲取父ID

			if (!parentId) {
				console.warn(`項目 ${currentType} (ID: ${currentItem._id}) 的父層ID字段 ${parentIdField} 為空`);
				break; // 父ID不存在，無法繼續向上查找
			}

			// 獲取父層服務
			const parentService = await this.getEntityService(parentType);

			// 獲取父層項目
			try {
				// 父層通常需要是 active 的才能被視為有效的層級路徑
				const parentItem = await parentService.ensureExists(parentId);

				// 添加到層次結構的最前面
				hierarchy.unshift({
					type: parentType,
					item: parentService.formatOutput(parentItem, { language }) // 格式化輸出
				});

				// 更新當前項目和類型，繼續尋找上一層
				currentType = parentType;
				currentItem = parentItem;
			} catch (error) {
				// 如果父層找不到或 inactive
				if (error instanceof ApiError && error.statusCode === StatusCodes.NOT_FOUND) {
					console.warn(`找不到有效的父層 ${parentType} (ID: ${parentId})`);
				} else {
					console.error(`查找父層 ${parentType} (ID: ${parentId}) 時出錯:`, error);
				}
				break; // 找不到父層，停止向上查找
			}
		}

		return hierarchy;
	}

	/**
	 * 獲取指定項目以下的子階層結構 (業務邏輯)
	 * @param {String} itemType - 起始項目類型
	 * @param {String} itemId - 起始項目ID
	 * @param {Object} options - 選項 { language, maxDepth }
	 * @returns {Promise<Object|null>} 子階層樹或 null
	 */
	async getSubHierarchyData(itemType, itemId, options = {}) {
		const { language, maxDepth, accessOptions } = options;

		// 檢查層級類型有效性
		this._validateEntityType(itemType);

		// 確保起始項目存在。如果 accessOptions.filterActive 為 true，則起始項目也必須是 active。
		const startService = await this.getEntityService(itemType);
		await startService.ensureExists(itemId, { isActive: accessOptions && accessOptions.filterActive ? true : undefined });

		// 遞迴建立子階層樹
		const subHierarchyData = await this.buildHierarchyTree(itemType, itemId, { language, maxDepth, accessOptions });

		// buildHierarchyTree 在找不到項目時會返回 null
		if (!subHierarchyData) {
			// 雖然上面 ensureExists 檢查過，但以防萬一 buildHierarchyTree 內部出錯返回 null
			throw new ApiError(StatusCodes.NOT_FOUND, `找不到指定的項目 ${itemType} (ID: ${itemId}) 或其子樹構建失敗`);
		}

		return subHierarchyData;
	}
}

// 匯出單例實例
export default new HierarchyService();
