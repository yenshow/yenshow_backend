import Series from "../../models/series.js";
import Categories from "../../models/categories.js";
import SubCategories from "../../models/subCategories.js";
import Specifications from "../../models/specifications.js";
import Products from "../../models/products.js";

/**
 * 集中定義實體之間的階層關係
 * 用於連鎖刪除等操作
 *
 * 格式：
 * 'ModelName': {
 *   childModel: MongooseModel,      // 子模型的 Mongoose 模型
 *   childModelParentField: String   // 子模型中參考父層 ID 的欄位名稱
 * }
 */
export const hierarchyConfig = {
	Series: {
		childModel: Categories,
		childModelParentField: "series"
	},
	Categories: {
		childModel: SubCategories,
		childModelParentField: "categories"
	},
	SubCategories: {
		childModel: Specifications,
		childModelParentField: "subCategories"
	},
	Specifications: {
		childModel: Products,
		childModelParentField: "specifications"
	},
	Products: {
		childModel: null, // 沒有子模型
		childModelParentField: null
	}
};
