import { ApiError } from "../utils/responseHandler.js";
import { StatusCodes } from "http-status-codes";
import { performSearch } from "../utils/searchHelper.js";
import mongoose from "mongoose";
import { hierarchyConfig } from "../controllers/models/hierarchyConfig.js"; // 導入階層設定

/**
 * EntityService 類 - 提供模型實體通用操作
 */
export class EntityService {
	/**
	 * 建構函數
	 * @param {Object} model - Mongoose 模型
	 * @param {Object} options - 配置選項
	 * @param {String} options.parentField - 父層實體欄位名稱
	 * @param {Object} options.parentModel - 父層實體模型
	 * @param {Array} options.basicFields - 基本欄位清單
	 */
	constructor(model, options = {}) {
		this.model = model;
		this.modelName = model.modelName;
		this.parentField = options.parentField || null;
		this.parentModel = options.parentModel || null;
		this.basicFields = options.basicFields || ["code", "isActive"];
		// responseKey for controller, used in EntityController
		this.responseKey = options.responseKey || `${this.modelName.toLowerCase()}List`;
	}

	/**
	 * 檢查實體是否存在
	 * @param {String} id - 實體ID
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 實體對象
	 */
	async ensureExists(id, options = {}) {
		try {
			const query = { _id: id };
			if (options.isActive !== undefined) {
				query.isActive = options.isActive;
			}

			const entity = await this.model.findOne(query);
			if (!entity) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到該${this.modelName.toLowerCase()}`);
			}

			return entity;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `查詢${this.modelName.toLowerCase()}時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 檢查父層實體是否存在
	 * @param {String} parentId - 父層實體ID
	 * @returns {Promise<Object>} - 父層實體對象
	 */
	async ensureParentExists(parentId) {
		if (!this.parentModel || !this.parentField) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `該實體類型不支持父層查詢`);
		}

		try {
			const parent = await this.parentModel.findOne({
				_id: parentId,
				isActive: true
			});

			if (!parent) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到相關的${this.parentModel.modelName.toLowerCase()}`);
			}

			return parent;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `查詢父層實體時發生錯誤: ${error.message}`);
		}
	}

	/**
	 * 檢查實體是否有依賴項
	 * @param {String} id - 實體ID
	 * @returns {Promise<void>}
	 */
	async checkDependencies(id) {
		const config = hierarchyConfig[this.modelName];
		if (config && config.childModel) {
			const count = await config.childModel.countDocuments({ [config.childModelParentField]: id });
			if (count > 0) {
				throw new ApiError(StatusCodes.BAD_REQUEST, `無法刪除此 ${this.modelName}，因為它直接或間接包含了 ${count} 個子項目。`);
			}
		}
	}

	/**
	 * 格式化輸出數據 - 極簡版本
	 * @param {Object} item - 實體項目
	 * @returns {Object} - 格式化後的數據
	 */
	formatOutput(itemDocument) {
		// itemDocument is a Mongoose document
		if (!itemDocument) return null;
		// Convert to plain object. virtuals: true ensures virtuals like 'id' (if defined) are included.
		// Models' own transformOptions will be applied here.
		const obj = itemDocument.toObject({ virtuals: true });

		// Remove language-specific virtual fields if they exist from a previous version
		// but it's better to handle this in model's toJSON/toObject if they are virtuals.
		delete obj.TW;
		delete obj.EN;

		return obj;
	}

	/**
	 * 創建實體
	 * @param {Object} data - 創建數據
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 創建的實體
	 */
	async create(data, options = {}) {
		try {
			// 檢查必要欄位，但對 Faq 和 News 模型例外
			if (!data.code && this.modelName !== "Faq" && this.modelName !== "News") {
				throw new ApiError(StatusCodes.BAD_REQUEST, `${this.modelName} 代碼欄位不能為空`);
			}

			// 創建實體
			const entity = new this.model(data);

			if (options.session) {
				await entity.save({ session: options.session });
			} else {
				await entity.save();
			}

			if (options.returnRawInstance) {
				return entity; // 返回原始 Mongoose Document 實例
			}
			return this.formatOutput(entity);
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `創建${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 更新實體
	 * @param {String} id - 實體ID
	 * @param {Object} data - 更新數據
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 更新後的實體
	 */
	async update(id, data, options = {}) {
		try {
			// 檢查實體是否存在，注意要保存返回值
			const entity = await this.ensureExists(id);

			// 處理父層關聯
			if (this.parentField && data[this.parentField]) {
				await this.ensureParentExists(data[this.parentField]);
			}

			// 準備更新資料
			const updateData = this.prepareUpdateData(data);

			// 直接使用 findByIdAndUpdate
			const updatedEntity = await this.model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, session: options.session });

			if (!updatedEntity) {
				throw new ApiError(StatusCodes.NOT_FOUND, `找不到要更新的${this.modelName.toLowerCase()}`);
			}

			if (options.returnRawInstance) {
				return updatedEntity; // 返回原始 Mongoose Document 實例
			}
			return this.formatOutputWithSeries(updatedEntity, options.populate);
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(StatusCodes.BAD_REQUEST, `更新${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	// 新增方法，準備更新資料
	prepareUpdateData(data) {
		const updateData = { ...data };
		delete updateData._id;
		delete updateData.__v;

		// 處理多語言欄位
		if (updateData.name && typeof updateData.name === "object") {
			for (const lang in updateData.name) {
				updateData[`name.${lang}`] = updateData.name[lang];
			}
			delete updateData.name;
		}

		return updateData;
	}

	/**
	 * 刪除實體
	 * @param {String} id - 實體ID
	 * @param {Object} options - 選項
	 * @returns {Promise<Boolean>} - 是否成功刪除
	 */
	async delete(id, options = {}) {
		const session = options.session;

		const execute = async (session) => {
			const config = hierarchyConfig[this.modelName];

			// 如果有子模型定義，則遞迴刪除子項目
			if (config && config.childModel) {
				const children = await config.childModel.find({ [config.childModelParentField]: id }).session(session);

				for (const child of children) {
					// 創建子模型的 EntityService 實例
					const childService = new EntityService(config.childModel);
					// 遞迴調用 delete
					await childService.delete(child._id, { session });
				}
			}

			// 刪除當前實體
			const result = await this.model.findByIdAndDelete(id).session(session);
			if (!result) {
				console.log(`實體 ${this.modelName} (ID: ${id}) 在刪除過程中未找到，可能已被處理。`);
			}
			return !!result;
		};

		// 如果已經在一個事務中，直接執行
		if (session) {
			return await execute(session);
		} else {
			// 否則，開啟一個新的事務
			const newSession = await this.model.db.startSession();
			try {
				let finalResult;
				await newSession.withTransaction(async (s) => {
					finalResult = await execute(s);
				});
				return finalResult;
			} finally {
				await newSession.endSession();
			}
		}
	}

	/**
	 * 搜索實體
	 * @param {Object} query - 查詢條件
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 搜索結果
	 */
	async search(query = {}, options = {}) {
		try {
			const { keyword, pagination, sort, populate } = options; // Get populate from options

			const baseQuery = { ...query }; // Already prepared by controller

			let sortField = "createdAt";
			let sortDirection = "asc";
			if (sort) {
				const sortKey = Object.keys(sort)[0];
				if (sortKey) {
					sortField = sortKey;
					sortDirection = sort[sortKey] === -1 ? "desc" : "asc";
				}
			}

			const page = pagination?.page || 1;
			const limit = pagination?.limit || 100;
			const searchFields = ["code", "name.TW", "name.EN"];

			const searchResults = await performSearch({
				model: this.model,
				keyword,
				additionalConditions: baseQuery,
				searchFields: searchFields,
				sort: sortField,
				sortDirection: sortDirection,
				page: page,
				limit: limit,
				populate: populate // Pass populate to performSearch
			});

			const total = searchResults.total;
			const totalPages = Math.ceil(total / limit);

			const finalData = [];
			if (searchResults.items && searchResults.items.length > 0) {
				for (const rawDoc of searchResults.items) {
					// rawDoc is a Mongoose Document
					// Use the new centralized formatting method
					finalData.push(this.formatOutputWithSeries(rawDoc, populate));
				}
			}

			return {
				data: finalData,
				pagination: pagination ? { page, limit, total, pages: totalPages } : null
			};
		} catch (error) {
			if (error instanceof ApiError) throw error;
			// Add modelName to the error message for better context
			throw new ApiError(StatusCodes.BAD_REQUEST, `搜索${this.modelName ? this.modelName.toLowerCase() : "實體"}失敗: ${error.message}`);
		}
	}

	/**
	 * 批量處理實體
	 * @param {Object} data - 批量處理數據
	 * @param {Array} data.toCreate - 要創建的實體列表
	 * @param {Array} data.toUpdate - 要更新的實體列表
	 * @param {Object} options - 選項
	 * @returns {Promise<Object>} - 批量處理結果
	 */
	async batchProcess(data, options = {}) {
		const { toCreate = [], toUpdate = [], session } = data;
		const results = {
			created: [],
			updated: [],
			errors: []
		};

		try {
			for (const item of toCreate) {
				try {
					const created = await this.create(item, {
						session,
						...options.options
					});
					results.created.push(created);
				} catch (error) {
					results.errors.push({
						operation: "create",
						data: item,
						error: error.message
					});
				}
			}

			for (const item of toUpdate) {
				if (!item._id) {
					results.errors.push({
						operation: "update",
						data: item,
						error: "缺少ID欄位"
					});
					continue;
				}

				try {
					const updated = await this.update(item._id, item, {
						session,
						...options.options
					});
					results.updated.push(updated);
				} catch (error) {
					results.errors.push({
						operation: "update",
						data: item,
						error: error.message
					});
				}
			}

			return results;
		} catch (error) {
			throw new ApiError(StatusCodes.BAD_REQUEST, `批量處理${this.modelName.toLowerCase()}失敗: ${error.message}`);
		}
	}

	/**
	 * 更新實體欄位
	 * @param {Object} entity - 實體對象
	 * @param {Object} data - 更新數據
	 */
	updateEntityFields(entity, data) {
		// 遍歷更新資料中的所有欄位
		for (const key in data) {
			// 跳過控制欄位和特殊欄位
			if (key === "_id" || key === "__v") continue;

			// 特殊處理多語言欄位
			if ((key === "name" || key === "description") && typeof data[key] === "object") {
				// 確保實體的多語言欄位已初始化
				entity[key] = entity[key] || {};

				// 逐個更新語言欄位
				for (const lang in data[key]) {
					entity[key][lang] = data[key][lang];
				}
			}
			// 特殊處理 features 陣列
			else if (key === "features" && Array.isArray(data[key])) {
				entity.features = data[key].map((feature) => {
					if (feature.name && typeof feature.name === "object") {
						return {
							featureId: feature.featureId,
							name: {
								TW: feature.name.TW || "",
								EN: feature.name.EN || ""
							}
						};
					}
					return feature;
				});
			} else {
				// 其他一般欄位直接更新
				entity[key] = data[key];
			}
		}
	}

	// Helper to consistently format and add series data
	// rawDoc is a Mongoose document, expected to be populated based on 'populateContext'
	formatOutputWithSeries(rawDoc, populateContext) {
		if (!rawDoc) return null;

		// Apply model's toJSON/toObject transforms first
		const item = rawDoc.toObject({ virtuals: true });

		// Clean up, this might be redundant if model transforms handle it
		delete item.TW;
		delete item.EN;
		delete item.__v; // Should be handled by versionKey: false in schema

		let seriesData = null;
		const modelName = rawDoc.constructor.modelName; // Get model name from the document itself

		try {
			if (modelName === "Series") {
				if (item._id) {
					// Ensure _id exists
					seriesData = { _id: item._id.toString(), name: item.name };
				}
			} else if (modelName === "Categories") {
				// 'series' field in Categories model should be populated
				if (rawDoc.series && rawDoc.series._id) {
					seriesData = { _id: rawDoc.series._id.toString(), name: rawDoc.series.name };
				}
			} else if (modelName === "SubCategories") {
				// 'categories' then 'categories.series' should be populated
				if (rawDoc.categories && rawDoc.categories.series && rawDoc.categories.series._id) {
					seriesData = { _id: rawDoc.categories.series._id.toString(), name: rawDoc.categories.series.name };
				}
			} else if (modelName === "Specifications") {
				// 'subCategories' -> 'subCategories.categories' -> 'subCategories.categories.series'
				if (rawDoc.subCategories && rawDoc.subCategories.categories && rawDoc.subCategories.categories.series && rawDoc.subCategories.categories.series._id) {
					seriesData = { _id: rawDoc.subCategories.categories.series._id.toString(), name: rawDoc.subCategories.categories.series.name };
				}
			}
		} catch (e) {
			console.error(`Error extracting series data for ${modelName} with id ${item._id}:`, e);
			// Decide if you want to attach partial data or an error marker
		}

		if (seriesData) {
			item.series = seriesData;
		}

		// Optional: Clean up deep populated fields from the item if they are now redundant
		// For example, if item.categories.series is now at item.series, you might delete item.categories.series
		if (item.categories && item.categories.series) {
			delete item.categories.series;
		}
		if (item.subCategories && item.subCategories.categories && item.subCategories.categories.series) {
			delete item.subCategories.categories.series;
		}
		// You might want to also remove item.categories or item.subCategories if all their useful info is hoisted
		// or if frontend doesn't need them directly anymore. This depends on frontend requirements.
		// Example: delete item.categories; delete item.subCategories;

		return item;
	}
}
