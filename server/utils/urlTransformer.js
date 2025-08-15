/**
 * 將產品對象中的相對圖片路徑轉換為絕對URL
 * @param {Object} product - 產品對象
 * @param {String} baseUrl - 公開的基礎 URL (例如 https://your-tunnel-url.com)
 * @returns {Object} 轉換後的產品對象 (或原始對象如果無需轉換)
 */
export function transformProductImagePaths(product, baseUrl) {
	if (!product || !baseUrl || !Array.isArray(product.images) || product.images.length === 0) {
		return product;
	}

	// 創建副本以避免修改原始數據（如果需要）
	const transformedProduct = { ...product };

	transformedProduct.images = product.images.map((imgPath) => {
		// 檢查是否是相對路徑且以 /storage 開頭
		if (imgPath && typeof imgPath === "string" && imgPath.startsWith("/storage")) {
			try {
				// 使用 URL 構造函數安全拼接
				return new URL(imgPath, baseUrl).href;
			} catch (e) {
				console.error(`無法創建圖片 URL: ${imgPath} with base ${baseUrl}`, e);
				return imgPath; // 出錯時返回原路徑
			}
		}
		// 如果不是相對路徑或不是 /storage 開頭，直接返回（可能是已存在的完整 URL 或其他格式）
		return imgPath;
	});

	return transformedProduct;
}

/**
 * 遞迴轉換層級數據中所有產品的圖片路徑
 * @param {Object|Array} data - 層級數據 (物件或陣列)
 * @param {String} baseUrl - 公開的基礎 URL
 * @returns {Object|Array} 轉換後的層級數據
 */
export function transformHierarchicalDataImagePaths(data, baseUrl) {
	if (!data || !baseUrl) return data;

	if (Array.isArray(data)) {
		// 如果是陣列，遞迴處理每個元素
		return data.map((item) => transformHierarchicalDataImagePaths(item, baseUrl));
	} else if (typeof data === "object" && data !== null) {
		let transformedData = { ...data }; // 複製物件

		// 檢查當前物件是否像一個產品（可以根據你的模型特徵調整判斷條件）
		if (transformedData.code && transformedData.specifications && Array.isArray(transformedData.images)) {
			transformedData = transformProductImagePaths(transformedData, baseUrl);
		}

		// 遞迴處理物件的屬性值
		for (const key in transformedData) {
			if (Object.prototype.hasOwnProperty.call(transformedData, key)) {
				transformedData[key] = transformHierarchicalDataImagePaths(transformedData[key], baseUrl);
			}
		}
		return transformedData;
	}

	// 其他類型直接返回
	return data;
}
