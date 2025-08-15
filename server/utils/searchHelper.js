import mongoose from "mongoose";

/**
 * 對字串中的正規表示式特殊字元進行跳脫
 * @param {string} string - 要進行跳脫的字串
 * @returns {string} 跳脫後的字串
 */
const escapeRegExp = (string) => {
	// $& 表示整個匹配到的字串
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * 準備搜尋條件
 * @param {String} keyword - 搜尋關鍵詞
 * @param {Array} searchFields - 搜尋欄位
 * @returns {Object} 搜尋條件
 */
const prepareSearchConditions = (keyword, searchFields = ["name_TW", "name_EN", "code"]) => {
	if (!keyword) return {};

	// 確保關鍵字是字串類型
	const keywordString = String(keyword);
	const trimmedKeyword = keywordString.trim();
	const escapedKeyword = escapeRegExp(trimmedKeyword); // 對關鍵字進行跳脫

	// 準備精確搜尋條件
	const exactConditions = searchFields.map((field) => ({
		[field]: new RegExp(`^${escapedKeyword}$`, "i")
	}));

	// 準備模糊搜尋條件
	const fuzzyConditions = searchFields.map((field) => ({
		[field]: new RegExp(escapedKeyword, "i")
	}));

	return {
		exactConditions,
		fuzzyConditions
	};
};

/**
 * 通用搜尋輔助工具
 * @param {Object} options - 搜尋選項
 * @param {mongoose.Model} options.model - Mongoose 模型
 * @param {string} options.keyword - 搜尋關鍵字
 * @param {string} options.codeField - 代碼欄位名稱 (默認為 'code')
 * @param {string} options.langField - 多語言欄位名稱 (默認為 'name')
 * @param {string[]} options.languages - 支援的語言 (默認為 ['TW', 'EN'])
 * @param {Object} options.additionalConditions - 附加查詢條件
 * @param {string} options.sort - 排序欄位 (默認為 'createdAt')
 * @param {string} options.sortDirection - 排序方向 (默認為 'desc')
 * @returns {Object} 查詢結果
 */
export const performSearch = async ({
	model,
	keyword,
	additionalConditions = {},
	searchFields = ["name_TW", "name_EN", "code"],
	sort = "createdAt",
	sortDirection = "asc",
	page = 1,
	limit = 100,
	populate = null
}) => {
	const skip = (page - 1) * limit;
	const { exactConditions, fuzzyConditions } = prepareSearchConditions(keyword, searchFields);

	// 如果沒有關鍵詞，直接返回基本查詢
	if (!keyword) {
		const query = {
			...additionalConditions
		};

		let findQuery = model
			.find(query)
			.sort({ [sort]: sortDirection === "asc" ? 1 : -1 })
			.skip(skip)
			.limit(limit);

		if (populate) {
			findQuery = findQuery.populate(populate);
		}

		const items = await findQuery;
		const total = await model.countDocuments(query);

		return {
			items,
			total,
			exactMatch: false
		};
	}

	// 嘗試精確搜尋
	const exactQuery = {
		$or: exactConditions,
		...additionalConditions
	};

	let exactFindQuery = model
		.find(exactQuery)
		.sort({ [sort]: sortDirection === "asc" ? 1 : -1 })
		.skip(skip)
		.limit(limit);

	if (populate) {
		exactFindQuery = exactFindQuery.populate(populate);
	}

	const exactResults = await exactFindQuery;
	const totalExact = await model.countDocuments(exactQuery);

	// 如果有精確匹配，返回精確結果
	if (exactResults.length > 0) {
		return {
			items: exactResults,
			total: totalExact,
			exactMatch: true
		};
	}

	// 否則進行模糊搜尋
	const fuzzyQuery = {
		$or: fuzzyConditions,
		...additionalConditions
	};

	let fuzzyFindQuery = model
		.find(fuzzyQuery)
		.sort({ [sort]: sortDirection === "asc" ? 1 : -1 })
		.skip(skip)
		.limit(limit);

	if (populate) {
		fuzzyFindQuery = fuzzyFindQuery.populate(populate);
	}

	const fuzzyResults = await fuzzyFindQuery;
	const total = await model.countDocuments(fuzzyQuery);

	return {
		items: fuzzyResults,
		total,
		exactMatch: false
	};
};

/**
 * 處理多語言結果
 * @param {Array} items - 搜尋結果項目
 * @param {String} lang - 語言代碼
 * @returns {Array} 處理後的多語言結果
 */
export const processMultilingualResults = (items, lang = "TW") => {
	return items.map((item) => (item.getLanguage ? item.getLanguage(lang) : item));
};
