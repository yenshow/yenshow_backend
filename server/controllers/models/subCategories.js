import SubCategories from "../../models/subCategories.js";
import Categories from "../../models/categories.js";
import { EntityController } from "../EntityController.js";

/**
 * SubCategories 控制器 - 管理子分類資料
 * 子分類是分類的子層，屬於第三層級
 */
class SubCategoriesController extends EntityController {
	constructor() {
		super(SubCategories, {
			entityName: "subCategories",
			responseKey: "subCategoriesList",
			parentField: "categories",
			parentModel: Categories,
			parentEntityName: "categories",
			basicFields: ["code", "isActive"],
			schema: {
				name: {
					type: Object,
					required: true,
					validate: {
						validator: function (v) {
							return v && (v.TW || v.EN); // 至少有一種語言版本
						},
						message: "子分類名稱至少需要一種語言版本"
					},
					default: { TW: "", EN: "" }
				}
			}
		});
	}
}

// 匯出單例實例
export default new SubCategoriesController();
