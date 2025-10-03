import axios from "axios";

// 支援多網站的 GA 配置
const YENSHOW_GA_MEASUREMENT_ID = process.env.YENSHOW_GA_MEASUREMENT_ID;
const YENSHOW_GA_API_SECRET = process.env.YENSHOW_GA_API_SECRET;
const COMEO_GA_MEASUREMENT_ID = process.env.COMEO_GA_MEASUREMENT_ID;
const COMEO_GA_API_SECRET = process.env.COMEO_GA_API_SECRET;

/**
 * 向 Google Analytics 發送事件
 * @param {string} lineUserId - LINE 用戶 ID，作為 GA 的 client_id
 * @param {string} eventName - 自訂事件名稱 (e.g., 'receive_message', 'follow_bot')
 * @param {object} eventParams - 事件的額外參數
 * @param {string} site - 網站類型 ('yenshow' 或 'comeo')
 */
export async function trackEvent(lineUserId, eventName, eventParams = {}, site = "yenshow") {
	// 根據網站選擇對應的 GA 配置
	const measurementId = site === "comeo" ? COMEO_GA_MEASUREMENT_ID : YENSHOW_GA_MEASUREMENT_ID;
	const apiSecret = site === "comeo" ? COMEO_GA_API_SECRET : YENSHOW_GA_API_SECRET;

	// 防呆，確保必要的環境變數存在
	if (!measurementId || !apiSecret) {
		console.warn(`${site === "comeo" ? "Comeo" : "Yenshow"} GA Measurement ID or API Secret is not set. Skipping event tracking.`);
		return;
	}

	const payload = {
		// client_id 是 GA 用來識別獨立使用者的關鍵，LINE User ID 非常適合
		client_id: lineUserId,
		// 建議也傳送 user_id
		user_id: lineUserId,
		events: [
			{
				name: eventName,
				params: {
					...eventParams,
					// GA4 需要 engagement_time_msec 和 session_id 才能在標準報表中正確計算工作階段
					engagement_time_msec: "1"
				}
			}
		]
	};

	try {
		await axios.post(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, payload, {
			headers: { "Content-Type": "application/json" }
		});
		console.log(`${site === "comeo" ? "Comeo" : "Yenshow"} GA Event '${eventName}' sent for user ${lineUserId}`);
	} catch (error) {
		console.error(`Error sending event to ${site === "comeo" ? "Comeo" : "Yenshow"} Google Analytics:`, error.response?.data || error.message);
	}
}
