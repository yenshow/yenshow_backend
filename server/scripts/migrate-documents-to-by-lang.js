import mongoose from "mongoose";
import dotenv from "dotenv";
import Products from "../models/products.js";

// 將 legacy documents 內容搬遷到 documentsByLang.TW（若該語言陣列為空）
// 並保留原 documents（不刪除），以確保相容與可回滾

dotenv.config();

async function migrate() {
	try {
		const mongoUri = process.env.MONGO_URI || process.env.DB_URL;
		if (!mongoUri) {
			console.error("[migrate-docs] 缺少 MONGO_URI/DB_URL 環境變數");
			process.exit(1);
		}

		await mongoose.connect(mongoUri);
		console.log("[migrate-docs] 已連接至 MongoDB");

		// 僅處理存在 documents 的產品
		const cursor = Products.find({ documents: { $exists: true, $ne: [] } }).cursor();

		let processed = 0;
		for await (const product of cursor) {
			const doc = product;
			const legacyDocs = Array.isArray(doc.documents) ? doc.documents.filter(Boolean) : [];
			const byLang = doc.documentsByLang || { TW: [], EN: [] };

			// 僅在 TW 目前為空時進行搬遷，避免覆蓋既有語言資料
			const twEmpty = !Array.isArray(byLang.TW) || byLang.TW.length === 0;
			if (legacyDocs.length > 0 && twEmpty) {
				byLang.TW = legacyDocs.slice();
				doc.documentsByLang = byLang;
				await doc.save();
				processed += 1;
				console.log(`[migrate-docs] 已遷移 product ${doc._id} 的 ${legacyDocs.length} 筆文件到 documentsByLang.TW`);
			}
		}

		console.log(`[migrate-docs] 完成，更新筆數: ${processed}`);
	} catch (err) {
		console.error("[migrate-docs] 執行錯誤:", err);
	} finally {
		await mongoose.disconnect();
		console.log("[migrate-docs] 連線已關閉");
	}
}

migrate();
