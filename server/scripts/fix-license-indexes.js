import "dotenv/config";
import mongoose from "mongoose";
import License from "../models/License.js";

/**
 * 修復 License 集合的索引
 * 刪除舊的 unique 索引並重建使用 partialFilterExpression 的新索引
 */
async function fixLicenseIndexes() {
	try {
		const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
		await mongoose.connect(dbUrl, {
			serverSelectionTimeoutMS: 5000
		});

		console.log("✅ 已連接到 MongoDB");

		const collection = mongoose.connection.collection("licenses");
		
		// 獲取當前所有索引
		const indexes = await collection.indexes();
		console.log("📋 當前索引:", indexes.map(idx => idx.name));

		// 刪除舊的 licenseKey 和 serialNumber 索引（如果存在）
		try {
			await collection.dropIndex("licenseKey_1");
			console.log("✅ 已刪除舊的 licenseKey_1 索引");
		} catch (error) {
			if (error.code === 27) {
				console.log("ℹ️  licenseKey_1 索引不存在，跳過");
			} else {
				console.error("❌ 刪除 licenseKey_1 索引時出錯:", error.message);
			}
		}

		try {
			await collection.dropIndex("serialNumber_1");
			console.log("✅ 已刪除舊的 serialNumber_1 索引");
		} catch (error) {
			if (error.code === 27) {
				console.log("ℹ️  serialNumber_1 索引不存在，跳過");
			} else {
				console.error("❌ 刪除 serialNumber_1 索引時出錯:", error.message);
			}
		}

		// 重建索引（使用 partialFilterExpression）
		// Mongoose 會自動根據 schema 定義重建索引
		console.log("🔄 重建索引中...");
		
		// 手動創建使用 partialFilterExpression 的索引
		await collection.createIndex(
			{ licenseKey: 1 },
			{
				unique: true,
				name: "licenseKey_1",
				// partial index 不支援 $ne: null（依 MongoDB 版本）
				// 以欄位型別區分：只有 string 才納入 unique 約束
				partialFilterExpression: { licenseKey: { $type: "string" } }
			}
		);
		console.log("✅ 已創建新的 licenseKey_1 索引（使用 partialFilterExpression）");

		await collection.createIndex(
			{ serialNumber: 1 },
			{
				unique: true,
				name: "serialNumber_1",
				// partial index 不支援 $ne: null（依 MongoDB 版本）
				// 以欄位型別區分：只有 string 才納入 unique 約束
				partialFilterExpression: { serialNumber: { $type: "string" } }
			}
		);
		console.log("✅ 已創建新的 serialNumber_1 索引（使用 partialFilterExpression）");

		// 驗證索引
		const newIndexes = await collection.indexes();
		console.log("📋 更新後的索引:", newIndexes.map(idx => ({
			name: idx.name,
			key: idx.key,
			unique: idx.unique,
			partialFilterExpression: idx.partialFilterExpression
		})));

		console.log("✅ 索引修復完成！");
	} catch (error) {
		console.error("❌ 修復索引時出錯:", error);
		throw error;
	} finally {
		await mongoose.disconnect();
		console.log("✅ 已關閉資料庫連接");
	}
}

// 執行修復
fixLicenseIndexes()
	.then(() => {
		console.log("🎉 腳本執行成功");
		process.exit(0);
	})
	.catch((error) => {
		console.error("💥 腳本執行失敗:", error);
		process.exit(1);
	});

