import Categories from "../../models/categories.js";
import Series from "../../models/series.js";
import { EntityController } from "../EntityController.js";

/**
 * Categories 控制器 - 管理分類資料
 * 分類是系列的子層，屬於第二層級
 */
class CategoriesController extends EntityController {
	constructor() {
		super(Categories, {
			entityName: "categories",
			responseKey: "categoriesList",
			parentField: "series",
			parentModel: Series,
			parentEntityName: "series",
			basicFields: ["code", "isActive"]
		});
	}
}

// 匯出單例實例
export default new CategoriesController();
