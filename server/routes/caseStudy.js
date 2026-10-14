import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { checkRole, Permissions } from "../middlewares/permission.js";
import fileUpload from "../utils/fileUpload.js";
import CaseStudyController from "../controllers/caseStudyController.js";

const router = express.Router();

// 公開路由 - 任何人都可訪問
router.get("/case-studies/project-types", CaseStudyController.getProjectTypes);
router.get("/case-studies", CaseStudyController.getAll);
router.get("/case-studies/slug/:slug", CaseStudyController.getBySlug);
router.get("/case-studies/project-type/:projectType", CaseStudyController.getByProjectType);
router.get("/case-studies/search", CaseStudyController.search);

// 受保護的路由 - 僅掛在各端點，避免 router.use(requireAuth) 攔截後續 /api/*（如 LIFF 規格書下載）
router.get("/case-studies/:id", requireAuth, CaseStudyController.getById);
router.post(
	"/case-studies",
	requireAuth,
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	fileUpload.getCaseStudyUploadMiddleware(),
	CaseStudyController.create
);
router.put(
	"/case-studies/:id",
	requireAuth,
	checkRole([Permissions.ADMIN, Permissions.STAFF]),
	fileUpload.getCaseStudyUploadMiddleware(),
	CaseStudyController.update
);
router.delete("/case-studies/:id", requireAuth, checkRole([Permissions.ADMIN]), CaseStudyController.delete);

export default router;
