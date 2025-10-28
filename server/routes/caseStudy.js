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

// 受保護的路由 - 需要認證
router.use(requireAuth);

// 管理員和員工可訪問
router.get("/case-studies/:id", CaseStudyController.getById);
router.post("/case-studies", checkRole([Permissions.ADMIN, Permissions.STAFF]), fileUpload.getCaseStudyUploadMiddleware(), CaseStudyController.create);
router.put("/case-studies/:id", checkRole([Permissions.ADMIN, Permissions.STAFF]), fileUpload.getCaseStudyUploadMiddleware(), CaseStudyController.update);
router.delete("/case-studies/:id", checkRole([Permissions.ADMIN]), CaseStudyController.delete);

export default router;
