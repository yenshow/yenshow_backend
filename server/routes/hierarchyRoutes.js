import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import SeriesController from "../controllers/models/series.js";
import CategoriesController from "../controllers/models/categories.js";
import SubCategoriesController from "../controllers/models/subCategories.js";
import SpecificationsController from "../controllers/models/specifications.js";
import ProductsController from "../controllers/models/products.js";
import HierarchyManager from "../controllers/HierarchyManager.js";
import fileUpload from "../utils/fileUpload.js";

const router = express.Router();

// 公開 API - 任何人都可訪問
router.get("/hierarchy", checkRole([Permissions.PUBLIC]), HierarchyManager.getFullHierarchy);
router.get("/hierarchy/children/:parentType/:parentId", checkRole([Permissions.PUBLIC]), HierarchyManager.getChildrenByParentId);
router.get("/hierarchy/parents/:itemType/:itemId", checkRole([Permissions.PUBLIC]), HierarchyManager.getParentHierarchy);
router.get("/hierarchy/subtree/:itemType/:itemId", checkRole([Permissions.PUBLIC]), HierarchyManager.getSubHierarchy);

// 讀取操作 - 所有角色都可訪問
router.get("/series", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), SeriesController.getAllItems);
router.get("/series/search", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), SeriesController.searchItems);
router.get("/series/:id", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), SeriesController.getItemById);

router.get("/categories", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), CategoriesController.getAllItems);
router.get("/categories/search", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), CategoriesController.searchItems);
router.get("/categories/:id", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), CategoriesController.getItemById);

router.get("/subCategories", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), SubCategoriesController.getAllItems);
router.get(
	"/subCategories/search",
	checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]),
	SubCategoriesController.searchItems
);
router.get(
	"/subCategories/:id",
	checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]),
	SubCategoriesController.getItemById
);

router.get("/specifications", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), SpecificationsController.getAllItems);
router.get(
	"/specifications/search",
	checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]),
	SpecificationsController.searchItems
);
router.get(
	"/specifications/:id",
	checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]),
	SpecificationsController.getItemById
);

router.get("/products", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), ProductsController.getProducts);
router.get("/products/search", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), ProductsController.searchProducts);
router.get(
	"/products/slug/:slug",
	checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]),
	ProductsController.getProductBySlug
);
router.get("/products/:id", checkRole([Permissions.ADMIN, Permissions.STAFF, Permissions.CLIENT, Permissions.PUBLIC]), ProductsController.getProductById);

// 寫入操作 - 僅內部角色
router.post("/series", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SeriesController.createItem);
router.put("/series/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SeriesController.updateItem);
router.delete("/series/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SeriesController.deleteItem);
router.post("/series/batch", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SeriesController.batchProcess);

router.post("/categories", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), CategoriesController.createItem);
router.put("/categories/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), CategoriesController.updateItem);
router.delete("/categories/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), CategoriesController.deleteItem);
router.post("/categories/batch", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), CategoriesController.batchProcess);

router.post("/subCategories", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SubCategoriesController.createItem);
router.put("/subCategories/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SubCategoriesController.updateItem);
router.delete("/subCategories/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SubCategoriesController.deleteItem);
router.post("/subCategories/batch", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SubCategoriesController.batchProcess);

router.post("/specifications", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SpecificationsController.createItem);
router.put("/specifications/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SpecificationsController.updateItem);
router.delete("/specifications/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SpecificationsController.deleteItem);
router.post("/specifications/batch", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), SpecificationsController.batchProcess);

router.post(
	"/products",
	requireAuth,
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	fileUpload.getProductUploadMiddleware(),
	ProductsController.createProduct
);
router.put(
	"/products/:id",
	requireAuth,
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	fileUpload.getProductUploadMiddleware(),
	ProductsController.updateProduct
);
router.delete("/products/:id", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), ProductsController.deleteProduct);
router.post("/products/batch", requireAuth, checkRole([Permissions.ADMIN, Permissions.STAFF]), ProductsController.batchProcess);

export default router;
