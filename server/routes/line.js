import express from "express";
import * as line from "@line/bot-sdk";
import * as lineController from "../controllers/lineController.js";

const router = express.Router();

// 從環境變數讀取 LINE 配置
const config = {
	channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.LINE_CHANNEL_SECRET
};

// LINE 的簽名驗證中介軟體
// 它會驗證請求是否來自 LINE，並解析請求內容
// 注意：如果 channelSecret 或 channelAccessToken 未設定，這裡會拋出錯誤
if (!config.channelSecret) {
	throw new Error("LINE_CHANNEL_SECRET is not set in environment variables.");
}

// 將 Webhook 端點掛載到 LINE 中介軟體和我們的控制器上
router.post("/webhook", line.middleware(config), lineController.webhook);

export default router;
