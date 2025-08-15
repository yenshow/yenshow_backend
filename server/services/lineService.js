import { Client } from "@line/bot-sdk";
import hierarchyService from "./HierarchyService.js";
import { createProductNavigationMessage, createProductListMessage } from "../utils/lineFlexTemplates.js";
import { transformProductImagePaths } from "../utils/urlTransformer.js";
import { trackEvent } from "./analyticsService.js";

// Initialize LINE SDK Client
const client = new Client({
	channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.LINE_CHANNEL_SECRET
});

/**
 * Fetches series and their respective categories, then sends a single Flex Message.
 * @param {string} replyToken - The reply token from the webhook event.
 * @param {string} userId - The user's ID for analytics tracking.
 */
const sendProductNavigation = async (replyToken, userId) => {
	try {
		const hierarchy = await hierarchyService.getFullHierarchyData({
			accessOptions: { filterActive: true },
			maxDepth: 1
		});

		if (!hierarchy || hierarchy.length === 0) {
			return client.replyMessage(replyToken, { type: "text", text: "目前沒有任何產品系列喔！" });
		}

		const flexMessage = createProductNavigationMessage(hierarchy);
		await client.replyMessage(replyToken, flexMessage);
		trackEvent(userId, "view_product_navigation");
	} catch (error) {
		console.error("Failed to send product navigation:", error);
		throw error;
	}
};

/**
 * 從一個分類的層級樹中，精準地提取所有產品。
 * 此邏輯模仿自 client/src/components/products/ProductTable.vue。
 * @param {object} categoryNode - 從 hierarchyService.getSubHierarchyData 獲取的分類節點。
 * @returns {Array<object>} 一個包含所有產品的陣列。
 */
function extractProductsFromCategoryTree(categoryNode) {
	const products = [];
	// categoryNode 包含 subCategories 陣列
	if (!categoryNode || !Array.isArray(categoryNode.subCategories)) {
		return products;
	}

	categoryNode.subCategories.forEach((subCategory) => {
		// 每個 subCategory 包含 specifications 陣列
		if (subCategory && Array.isArray(subCategory.specifications)) {
			subCategory.specifications.forEach((spec) => {
				// 每個 spec 包含 products 陣列
				if (spec && Array.isArray(spec.products)) {
					// 將找到的產品推入結果陣列
					// HierarchyService 已經處理了 isActive 的過濾
					products.push(...spec.products);
				}
			});
		}
	});

	return products;
}

/**
 * Sends a Flex Message containing a list of products for a specific category.
 * @param {string} replyToken - The reply token from the webhook event.
 * @param {string} categoryId - The ID of the category to get products for.
 * @param {string} userId - The user's ID for analytics tracking.
 */
const sendProductList = async (replyToken, categoryId, userId) => {
	try {
		// 1. 使用 HierarchyService 獲取該分類下的完整巢狀資料樹
		const categoryTree = await hierarchyService.getSubHierarchyData("categories", categoryId, {
			accessOptions: { filterActive: true }
		});
		const categoryName = categoryTree?.name?.TW || "Unknown Category";

		// 2. 使用模仿前端邏輯的函式來提取所有產品
		let productList = extractProductsFromCategoryTree(categoryTree);

		// 3. 將產品列表中的圖片路徑轉換為絕對 URL
		const baseUrl = process.env.PUBLIC_BASE_URL;
		if (baseUrl) {
			productList = productList.map((product) => transformProductImagePaths(product, baseUrl));
		}

		if (productList.length === 0) {
			trackEvent(userId, "view_empty_category", {
				category_id: categoryId,
				category_name: categoryName
			});
			return client.replyMessage(replyToken, { type: "text", text: "這個分類底下目前沒有任何產品喔！" });
		}

		const flexMessage = createProductListMessage(productList);
		await client.replyMessage(replyToken, flexMessage);
		trackEvent(userId, "view_category_products", {
			category_id: categoryId,
			category_name: categoryName
		});
	} catch (error) {
		console.error(`Failed to send product list for category ${categoryId}:`, error);
		throw error;
	}
};

// --- Event Handlers ---

export const handleMessage = async (event) => {
	const userId = event.source.userId;
	if (event.message.type === "text") {
		const userMessage = event.message.text.trim();
		// 判斷是否為已知關鍵字
		if (userMessage === "產品一覽") {
			return sendProductNavigation(event.replyToken, userId);
		} else {
			// 只有在所有關鍵字都匹配失敗時，才記錄為未處理訊息
			trackEvent(userId, "unhandled_text_message", {
				message_text: userMessage
			});
		}
	}
	return Promise.resolve(null);
};

export const handlePostback = async (event) => {
	const postbackData = new URLSearchParams(event.postback.data);
	const action = postbackData.get("action");
	const userId = event.source.userId;

	if (action === "view_products") {
		const categoryId = postbackData.get("categoryId");
		return sendProductList(event.replyToken, categoryId, userId);
	}

	console.log("Unhandled Postback received:", event.postback.data);
	return Promise.resolve(null);
};

export const handleFollow = async (event) => {
	const userId = event.source.userId;
	trackEvent(userId, "follow_bot");
	console.log(`User ${userId} followed the bot.`);
	const welcomeMessages = [
		{
			type: "text",
			text: "歡迎加入 YENSHOW 官方帳號！🎉\n\n我們是您在安全監控領域的專業夥伴，致力於提供最先進的門禁安防與影像監控解決方案。"
		},
		{
			type: "text",
			text: "您可以隨時點擊下方的【圖文選單】，輕鬆探索我們的全系列產品與最新消息。"
		},
		{
			type: "text",
			text: "若想直接提問，請點擊左下角的鍵盤圖示 ⌨️，即可切換回文字輸入模式與我們互動。"
		}
	];
	// Send a welcome message
	return client.replyMessage(event.replyToken, welcomeMessages);
};

export const handleUnfollow = async (event) => {
	const userId = event.source.userId;
	trackEvent(userId, "unfollow_bot");
	// It's not possible to reply to an unfollow event.
	console.log(`User ${userId} unfollowed or blocked the bot.`);
	return Promise.resolve(null);
};
