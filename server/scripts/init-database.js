import mongoose from "mongoose";
import Series from "../models/series.js";
import Category from "../models/categories.js";
import SubCategory from "../models/subCategories.js";
import Specification from "../models/specifications.js";
import { initialData } from "../enums/initialData.js";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// 清空資料庫函數
async function clearDatabase() {
	console.log("清空資料庫...");
	await Specification.deleteMany({});
	await SubCategory.deleteMany({});
	await Category.deleteMany({});
	await Series.deleteMany({});
	console.log("資料庫已清空");
}

// 初始化資料庫函數
async function initializeDatabase() {
	try {
		console.log("開始初始化資料庫...");

		// 是否要先清空資料庫（慎用）
		const shouldClearDatabase = true; // 設為 true 則會先清空資料庫
		if (shouldClearDatabase) {
			await clearDatabase();
		}

		// 創建或獲取系列
		for (const seriesData of initialData.series) {
			console.log(`處理系列: ${seriesData.code}`);

			// 查找或創建系列
			let series = await Series.findOne({ code: seriesData.code });
			if (!series) {
				series = await Series.create({
					name: seriesData.name,
					code: seriesData.code,
					isActive: true
				});
				console.log(`  創建系列: ${seriesData.code}`);
			} else {
				console.log(`  系列已存在: ${seriesData.code}`);
			}

			// 處理類別
			if (seriesData.categories && seriesData.categories.length > 0) {
				for (const categoryData of seriesData.categories) {
					console.log(`  處理類別: ${categoryData.code}`);

					// 查找或創建類別
					let category = await Category.findOne({
						code: categoryData.code,
						series: series._id
					});

					if (!category) {
						category = await Category.create({
							name: categoryData.name,
							code: categoryData.code,
							series: series._id,
							isActive: true
						});
						console.log(`    創建類別: ${categoryData.code}`);
					} else {
						console.log(`    類別已存在: ${categoryData.code}`);
					}

					// 處理子類別
					if (categoryData.subCategories && categoryData.subCategories.length > 0) {
						for (const subCategoryData of categoryData.subCategories) {
							console.log(`    處理子類別: ${subCategoryData.code}`);

							// 查找或創建子類別
							let subCategory = await SubCategory.findOne({
								code: subCategoryData.code,
								categories: category._id
							});

							if (!subCategory) {
								subCategory = await SubCategory.create({
									name: subCategoryData.name,
									code: subCategoryData.code,
									categories: category._id,
									isActive: true
								});
								console.log(`      創建子類別: ${subCategoryData.code}`);
							} else {
								console.log(`      子類別已存在: ${subCategoryData.code}`);
							}

							// 處理規格
							if (subCategoryData.specifications && subCategoryData.specifications.length > 0) {
								for (const specificationData of subCategoryData.specifications) {
									console.log(`      處理規格: ${specificationData.code}`);

									// 查找或創建規格
									let specification = await Specification.findOne({
										code: specificationData.code,
										subCategories: subCategory._id
									});

									if (!specification) {
										specification = await Specification.create({
											name: specificationData.name,
											code: specificationData.code,
											subCategories: subCategory._id,
											isActive: true
										});
										console.log(`        創建規格: ${specificationData.code}`);
									} else {
										console.log(`        規格已存在: ${specificationData.code}`);
									}
								}
							} else {
								// 創建默認規格
								const defaultSpec = await Specification.findOne({
									code: `${subCategoryData.code}_DEFAULT`,
									subCategories: subCategory._id
								});

								if (!defaultSpec) {
									await Specification.create({
										name: "標準規格",
										code: `${subCategoryData.code}_DEFAULT`,
										subCategories: subCategory._id,
										isActive: true
									});
									console.log(`        創建默認規格: ${subCategoryData.code}_DEFAULT`);
								}
							}
						}
					} else {
						// 創建默認子類別和規格
						const defaultSubCategory = await SubCategory.findOne({
							code: `${categoryData.code}_DEFAULT`,
							categories: category._id
						});

						if (!defaultSubCategory) {
							const newSubCategory = await SubCategory.create({
								name: categoryData.name,
								code: `${categoryData.code}_DEFAULT`,
								categories: category._id,
								isActive: true
							});

							await Specification.create({
								name: [
									{ language: "TW", value: "標準規格" },
									{ language: "EN", value: "Standard specifications" }
								],
								code: `${categoryData.code}_DEFAULT_SPEC`,
								values: ["標準"],
								subCategories: newSubCategory._id,
								isActive: true
							});

							console.log(`      創建默認子類別和規格: ${categoryData.code}_DEFAULT`);
						}
					}
				}
			}
		}

		console.log("資料庫初始化完成!");
	} catch (error) {
		console.error("初始化資料庫時出錯:", error);
	}
}

// 執行初始化
mongoose
	.connect(process.env.MONGO_URI || process.env.DB_URL)
	.then(() => {
		console.log("已連接到MongoDB");
		return initializeDatabase();
	})
	.then(() => {
		console.log("初始化完成，關閉數據庫連接");
		return mongoose.disconnect();
	})
	.catch((err) => {
		console.error("執行錯誤:", err);
		if (mongoose.connection.readyState === 1) {
			return mongoose.disconnect();
		}
	})
	.finally(() => {
		console.log("腳本執行完畢");
	});
