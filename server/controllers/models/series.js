import Series from "../../models/series.js";
import { EntityController } from "../EntityController.js";

/**
 * Series 控制器 - 管理系列資料
 * 系列是產品結構的最頂層
 */
class SeriesController extends EntityController {
	constructor() {
		super(Series, {
			entityName: "series",
			responseKey: "seriesList",
			basicFields: ["code", "isActive"]
		});
	}
}

// 匯出單例實例
export default new SeriesController();
