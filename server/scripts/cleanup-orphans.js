import mongoose from "mongoose";
import dotenv from "dotenv";
import Series from "../models/series.js";
import Category from "../models/categories.js";
import SubCategory from "../models/subCategories.js";
import Specification from "../models/specifications.js";
import Product from "../models/products.js";

// 載入環境變數
dotenv.config();

/**
 * 清理指定模型的孤兒文件。
 * @param {mongoose.Model} model - 要清理的 Mongoose 模型。
 * @param {String} modelName - 模型的名稱（用於日誌記錄）。
 * @param {mongoose.Model} parentModel - 父層的 Mongoose 模型。
 * @param {String} parentField - 在當前模型中參考父層的欄位名稱。
 */
async function cleanupModel(model, modelName, parentModel, parentField) {
	console.log(`--- 開始清理孤兒 ${modelName} ---`);

	// 1. 獲取所有父層的有效 ID
	const parentIds = await parentModel.find().distinct("_id");
	const parentIdSet = new Set(parentIds.map((id) => id.toString()));

	// 2. 查找所有孤兒文件
	// 孤兒的定義是：其 parentField 不在有效的 parentIdSet 中
	const orphans = await model.find({ [parentField]: { $nin: Array.from(parentIdSet) } });

	if (orphans.length === 0) {
		console.log(`沒有找到孤兒 ${modelName}。`);
		return;
	}

	console.log(`找到 ${orphans.length} 個孤兒 ${modelName}，準備刪除...`);
	orphans.forEach((orphan) => {
		console.log(`  - 孤兒 ${modelName} ID: ${orphan._id}, 指向無效的 ${parentField} ID: ${orphan[parentField]}`);
	});

	// 3. 刪除所有孤兒文件
	const orphanIds = orphans.map((doc) => doc._id);
	const { deletedCount } = await model.deleteMany({ _id: { $in: orphanIds } });

	console.log(`成功刪除 ${deletedCount} 個孤兒 ${modelName}。`);
}

/**
 * 主執行函數
 */
async function runCleanup() {
	try {
		console.log("開始清理資料庫中的孤兒文件...");

		// 按照從底層到頂層的順序執行清理
		await cleanupModel(Product, "Products", Specification, "specifications");
		await cleanupModel(Specification, "Specifications", SubCategory, "subCategories");
		await cleanupModel(SubCategory, "SubCategories", Category, "categories");
		await cleanupModel(Category, "Categories", Series, "series");

		console.log("\n所有孤兒文件清理完成！");
	} catch (error) {
		console.error("清理過程中發生錯誤:", error);
	}
}

// 連接到數據庫並執行腳本
mongoose
	.connect(process.env.MONGO_URI || process.env.DB_URL)
	.then(() => {
		console.log("已成功連接到 MongoDB。");
		return runCleanup();
	})
	.then(() => {
		console.log("腳本執行完畢，正在關閉資料庫連接...");
		return mongoose.disconnect();
	})
	.catch((err) => {
		console.error("執行過程中發生嚴重錯誤:", err);
		// 確保即使出錯也能關閉連接
		if (mongoose.connection.readyState === 1) {
			return mongoose.disconnect();
		}
	})
	.finally(() => {
		console.log("資料庫連接已關閉。");
	});
