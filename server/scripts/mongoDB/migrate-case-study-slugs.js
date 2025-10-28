import mongoose from "mongoose";
import CaseStudy from "../../models/caseStudy.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// 設定 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
dotenv.config({ path: join(__dirname, "../../.env") });

/**
 * 遷移腳本：為所有沒有 slug 或 slug 為空的案例生成 slug
 */
async function migrateCaseStudySlugs() {
	try {
		// 連接資料庫
		// 預設使用虛擬機內部 IP
		const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://192.168.1.24:27017/yenshow";
		console.log(`🔗 嘗試連接到: ${mongoUri}`);
		await mongoose.connect(mongoUri);
		console.log("✅ 已連接到 MongoDB");

		// 查找所有沒有 slug 或 slug 為空的案例
		const casesWithoutSlug = await CaseStudy.find({
			$or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }]
		});

		console.log(`\n📋 找到 ${casesWithoutSlug.length} 個需要更新 slug 的案例`);

		if (casesWithoutSlug.length === 0) {
			console.log("✅ 所有案例都已有 slug，無需遷移");
			await mongoose.connection.close();
			return;
		}

		let successCount = 0;
		let errorCount = 0;

		// 逐一處理每個案例
		for (const caseStudy of casesWithoutSlug) {
			try {
				console.log(`\n處理案例: ${caseStudy.title}`);
				console.log(`  ID: ${caseStudy._id}`);

				// 使用 save() 來觸發 pre-save hook
				await caseStudy.save();

				console.log(`  ✅ 已生成 slug: ${caseStudy.slug}`);
				successCount++;
			} catch (error) {
				console.error(`  ❌ 處理失敗: ${error.message}`);
				errorCount++;
			}
		}

		// 輸出結果
		console.log("\n" + "=".repeat(50));
		console.log("📊 遷移結果：");
		console.log(`  ✅ 成功: ${successCount}`);
		console.log(`  ❌ 失敗: ${errorCount}`);
		console.log(`  📝 總計: ${casesWithoutSlug.length}`);
		console.log("=".repeat(50) + "\n");

		// 驗證結果
		const remainingWithoutSlug = await CaseStudy.countDocuments({
			$or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }]
		});

		if (remainingWithoutSlug === 0) {
			console.log("✅ 所有案例的 slug 都已成功生成！");
		} else {
			console.log(`⚠️  仍有 ${remainingWithoutSlug} 個案例沒有 slug`);
		}

		// 關閉資料庫連接
		await mongoose.connection.close();
		console.log("\n✅ 已關閉資料庫連接");
	} catch (error) {
		console.error("❌ 遷移失敗:", error);
		process.exit(1);
	}
}

// 執行遷移
migrateCaseStudySlugs();
