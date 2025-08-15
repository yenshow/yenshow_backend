import express from "express";
import NewsController from "../controllers/user/NewsController.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import fileUpload from "../utils/fileUpload.js"; // 引入檔案上傳工具

const router = express.Router();

// 公開路由 (不需驗證)
router.get("/search", checkRole([Permissions.PUBLIC]), NewsController.searchItems); // 搜索
router.get("/", checkRole([Permissions.PUBLIC]), NewsController.getAllItems); // 獲取所有 (啟用狀態)
// 取得分類清單（需置於 slug 路由之前）
router.get("/categories", checkRole([Permissions.PUBLIC]), NewsController.getCategories);
router.get("/:slug", checkRole([Permissions.PUBLIC]), NewsController.getItemBySlug); // 獲取單個

// 需要身份驗證的路由
router.use(requireAuth);

// 獲取處理 'newsImages' 欄位的 multer 中間件 (陣列)
const uploadNewsImages = fileUpload.getNewsUploadMiddleware();

// 創建新聞 - 加入 uploadNewsImages 中間件
router.post("/", checkRole([Permissions.ADMIN, Permissions.STAFF]), uploadNewsImages, NewsController.createItem);

// 更新新聞 - 加入 uploadNewsImages 中間件
router.put(
	"/:id",
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	uploadNewsImages, // 同樣處理 'coverImage' 和 'contentImages'
	NewsController.updateItem
);

// 刪除新聞
router.delete("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.deleteItem);

// 批量處理 (如果批量處理也涉及檔案，則可能需要不同的中間件)
router.post("/batch", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.batchProcess);

// Route for admin to get an item by its internal ID
router.get("/by-id/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), NewsController.getItemById);

export default router;
