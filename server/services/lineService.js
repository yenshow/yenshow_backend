import { Client } from "@line/bot-sdk";
import { trackEvent } from "./analyticsService.js";

const client = new Client({
	channelAccessToken: process.env.YENSHOW_LINE_CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.YENSHOW_LINE_CHANNEL_SECRET
});

export const handleFollow = async (event) => {
	const userId = event.source.userId;
	trackEvent(userId, "follow_bot");
	console.log(`User ${userId} followed the bot.`);

	return client.replyMessage(event.replyToken, {
		type: "text",
		text: "歡迎加入 YENSHOW 官方帳號！\n\n請點擊下方【圖文選單】開啟「我的遠岫」，即可查詢規格、產品資訊、訂單與售後服務。"
	});
};

export const handleUnfollow = async (event) => {
	const userId = event.source.userId;
	trackEvent(userId, "unfollow_bot");
	console.log(`User ${userId} unfollowed or blocked the bot.`);
	return Promise.resolve(null);
};
