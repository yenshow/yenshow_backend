import express from "express";
import FaqController from "../controllers/user/FaqController.js";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import fileUpload from "../utils/fileUpload.js";

const router = express.Router();

// Multer middleware for FAQ file uploads
// It expects files under fields: faqImages, faqVideos, faqDocuments
const uploadFaqAssets = fileUpload.upload.fields([
	{ name: "faqImages", maxCount: 10 }, // Client FormData should use 'faqImages'
	{ name: "faqVideos", maxCount: 5 }, // Client FormData should use 'faqVideos'
	{ name: "faqDocuments", maxCount: 5 } // Client FormData should use 'faqDocuments'
]);

// Public routes (example: get all, get one, search)
router.get("/", checkRole([Permissions.PUBLIC]), FaqController.getAllItems);
router.get("/search", checkRole([Permissions.PUBLIC]), FaqController.searchItems);
router.get("/categories", checkRole([Permissions.PUBLIC]), FaqController.getCategories);
router.get("/:slug", checkRole([Permissions.PUBLIC]), FaqController.getItemBySlug);

// Protected routes - require authentication
router.use(requireAuth);

router.get("/by-id/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), FaqController.getItemById);

router.post(
	"/",
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	uploadFaqAssets, // Apply multer middleware for file uploads
	FaqController.createItem
);

router.put(
	"/:id",
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	uploadFaqAssets, // Apply multer middleware for file uploads
	FaqController.updateItem
);

router.delete("/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), FaqController.deleteItem);

// Example for batch processing, if needed and supports files, adjust middleware
router.post("/batch", checkRole([Permissions.ADMIN, Permissions.STAFF]), FaqController.batchProcess);

export default router;
