import { Router } from "express";
import multer from "multer";
import fileUpload from "../utils/fileUpload.js";
import { catchAsync } from "../utils/responseHandler.js";
import {
	crmLicenseErrorHandler,
	requireCrmLicenseAdmin,
	requireCrmLicenseAuth,
	requireIdempotencyKey
} from "../middlewares/crmLicenseAuth.js";
import * as crmLicenseController from "../controllers/crm/crmLicenseController.js";

const router = Router();
const uploadLicenseCreate = fileUpload.getSingleFileMiddleware("licenseImage");

const handleLicenseUploadError = (err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			err.statusCode = 400;
			err.message = "檔案大小超過 50MB 限制";
		} else {
			err.statusCode = 400;
		}
	}
	next(err);
};

router.use(requireCrmLicenseAuth);

router.get("/catalog", catchAsync(crmLicenseController.getCatalog));
router.get("/", catchAsync(crmLicenseController.listLicenses));
router.get("/:id/pdf", catchAsync(crmLicenseController.exportLicensePdf));
router.get("/:id/attachment", catchAsync(crmLicenseController.getAttachment));
router.get("/:id", catchAsync(crmLicenseController.getLicense));
router.post(
	"/",
	requireIdempotencyKey,
	uploadLicenseCreate,
	handleLicenseUploadError,
	catchAsync(crmLicenseController.createLicense)
);
router.post(
	"/:id/extend",
	requireIdempotencyKey,
	uploadLicenseCreate,
	handleLicenseUploadError,
	catchAsync(crmLicenseController.extendLicense)
);
router.post(
	"/:id/review",
	requireCrmLicenseAdmin,
	catchAsync(crmLicenseController.reviewLicense)
);

router.use(crmLicenseErrorHandler);

export default router;
