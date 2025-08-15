import Specifications from "../../models/specifications.js";
import SubCategories from "../../models/subCategories.js";
import { EntityController } from "../EntityController.js";

/**
 * Specifications 控制器 - 管理規格資料
 * 規格是子分類的子層，屬於第四層級
 */
class SpecificationsController extends EntityController {
	constructor() {
		super(Specifications, {
			entityName: "specifications",
			responseKey: "specificationsList",
			parentField: "subCategories",
			parentModel: SubCategories,
			parentEntityName: "subCategories",
			basicFields: ["code", "isActive"]
		});
	}
}

// 匯出單例實例
export default new SpecificationsController();
