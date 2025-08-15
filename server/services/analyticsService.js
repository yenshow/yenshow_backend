import axios from "axios";

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID; // 從 .env 讀取
const API_SECRET = process.env.GA_API_SECRET; // 從 .env 讀取

/**
 * 向 Google Analytics 發送事件
 * @param {string} lineUserId - LINE 用戶 ID，作為 GA 的 client_id
 * @param {string} eventName - 自訂事件名稱 (e.g., 'receive_message', 'follow_bot')
 * @param {object} eventParams - 事件的額外參數
 */
export async function trackEvent(lineUserId, eventName, eventParams = {}) {
	// 防呆，確保必要的環境變數存在
	if (!MEASUREMENT_ID || !API_SECRET) {
		console.warn("GA Measurement ID or API Secret is not set. Skipping event tracking.");
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
		await axios.post(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, payload, {
			headers: { "Content-Type": "application/json" }
		});
		console.log(`GA Event '${eventName}' sent for user ${lineUserId}`);
	} catch (error) {
		console.error("Error sending event to Google Analytics:", error.response?.data || error.message);
	}
}
