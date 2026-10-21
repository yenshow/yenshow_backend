import fs from "fs";
import path from "path";
import { StatusCodes } from "http-status-codes";
import License from "../../models/License.js";
import LicenseIdempotency from "../../models/LicenseIdempotency.js";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import fileUpload from "../../utils/fileUpload.js";
import { buildBaSystemLicensePdfBuffer, getLicensePdfFilename } from "../../utils/baSystemLicensePdf.js";
import {
	sendLicenseApprovedEmail,
	sendLicensePendingReviewEmail
} from "../../services/emailService.js";
import {
	LICENSE_EXT_SORT,
	applyStaffApplicantFilter,
	attachExtensionsToMainLicenses,
	applyLicenseKeysForAvailable,
	buildMainLicenseChildrenFilter,
	escapeRegex,
	assertFeaturesForProfile,
	getLicenseCatalog,
	linkPendingExtensionsToMainLicenseKey,
	normalizeDeploymentProfile,
	parseCreateLicenseBody,
	parseExtendLicenseBody,
	saveLicenseAttachment,
	serializeLicense,
	trimAccount,
	validateQuotas
} from "../../services/licenseShared.js";

const staffAccFromActor = (req) => (req.crmActor?.role === "staff" ? req.crmActor.account : null);

const assertCanAccessLicense = (license, staffAcc) => {
	if (!staffAcc) return;
	if (trimAccount(license.applicant) !== staffAcc) {
		throw ApiError.forbidden("您只能存取自己的授權");
	}
};

const replayIdempotent = async (req, route) => {
	const existing = await LicenseIdempotency.findOne({ key: req.idempotencyKey });
	if (!existing) return null;
	if (existing.actorAccount !== req.crmActor.account || existing.route !== route) {
		throw ApiError.conflict("冪等鍵衝突，請重新產生 Idempotency-Key");
	}
	const license = await License.findById(existing.licenseId);
	if (!license) {
		throw ApiError.conflict("冪等鍵衝突，請重新產生 Idempotency-Key");
	}
	return license;
};

const rememberIdempotent = async (req, route, licenseId) => {
	try {
		await LicenseIdempotency.create({
			key: req.idempotencyKey,
			actorAccount: req.crmActor.account,
			route,
			licenseId: String(licenseId)
		});
	} catch (err) {
		if (err?.code === 11000) {
			const replay = await replayIdempotent(req, route);
			if (replay) return replay;
			throw ApiError.conflict("冪等鍵衝突，請重新產生 Idempotency-Key");
		}
		throw err;
	}
	return null;
};

export const getCatalog = (req, res) => {
	return successResponse(res, StatusCodes.OK, "獲取授權目錄成功", {
		catalog: getLicenseCatalog()
	});
};

export const listLicenses = async (req, res) => {
	const { status, orderNumber, q } = req.query;
	const filter = { parentLicenseKey: null, parentLicenseId: null };
	if (status) filter.status = status;
	if (orderNumber) filter.orderNumber = String(orderNumber).trim();
	if (q) filter.customerName = { $regex: escapeRegex(q), $options: "i" };

	const staffAcc = staffAccFromActor(req);
	if (staffAcc) filter.applicant = staffAcc;

	const licenses = await License.collection.find(filter).sort({ createdAt: -1 }).toArray();
	await attachExtensionsToMainLicenses(licenses, staffAcc);
	return successResponse(res, StatusCodes.OK, "獲取授權列表成功", {
		licenses: licenses.map((item) => serializeLicense(item))
	});
};

export const getLicense = async (req, res) => {
	const license = await License.findById(req.params.id);
	if (!license) throw ApiError.notFound("授權不存在");

	const staffAcc = staffAccFromActor(req);
	assertCanAccessLicense(license, staffAcc);

	let extensions = [];
	if (!license.parentLicenseKey && !license.parentLicenseId) {
		extensions = await License.collection
			.find(applyStaffApplicantFilter(buildMainLicenseChildrenFilter(license), staffAcc))
			.sort(LICENSE_EXT_SORT)
			.toArray();
	}

	return successResponse(res, StatusCodes.OK, "獲取授權成功", {
		license: serializeLicense(license),
		extensions: extensions.map((item) => serializeLicense(item))
	});
};

export const createLicense = async (req, res) => {
	const route = "POST /api/crm/licenses";
	const replayed = await replayIdempotent(req, route);
	if (replayed) {
		return successResponse(res, StatusCodes.CREATED, "授權建立成功", {
			license: serializeLicense(replayed)
		});
	}

	const body = parseCreateLicenseBody(req);
	const { customerName, features, notes, deploymentProfile, quotas, orderNumber } = body;

	if (!customerName) throw ApiError.badRequest("需要提供客戶名稱");
	const orderNo = trimAccount(orderNumber);
	if (!orderNo) throw ApiError.badRequest("需要提供訂單編號");

	const normalizedProfile = normalizeDeploymentProfile(deploymentProfile);
	if (!["central", "construction"].includes(normalizedProfile)) {
		throw ApiError.badRequest("deploymentProfile 必須為 central 或 construction");
	}
	assertFeaturesForProfile(features, normalizedProfile, "必須指定至少一個功能模組");

	const attachment = req.file;
	if (!attachment?.buffer) {
		throw ApiError.badRequest("請上傳已簽核報價單（圖片或 PDF）");
	}

	const newLicense = await License.create({
		product: "BA-system",
		deploymentProfile: normalizedProfile,
		features,
		quotas: validateQuotas(quotas, features),
		customerName,
		orderNumber: orderNo,
		applicant: req.crmActor.account,
		appliedAt: new Date(),
		status: "pending",
		notes: notes || null
	});

	try {
		await saveLicenseAttachment(newLicense, attachment, orderNo);
	} catch (err) {
		await License.findByIdAndDelete(newLicense._id);
		console.error("授權附件儲存失敗:", err);
		throw ApiError.internal("已簽核報價單儲存失敗，請稍後再試");
	}

	const raced = await rememberIdempotent(req, route, newLicense._id);
	if (raced) {
		await License.findByIdAndDelete(newLicense._id);
		fileUpload.deleteEntityDirectory("licenses", { id: newLicense._id.toString() });
		return successResponse(res, StatusCodes.CREATED, "授權建立成功", {
			license: serializeLicense(raced)
		});
	}

	void sendLicensePendingReviewEmail(newLicense, { isExtension: false }).catch((err) =>
		console.error("授權待審核通知失敗:", err)
	);

	return successResponse(res, StatusCodes.CREATED, "授權建立成功", {
		license: serializeLicense(newLicense)
	});
};

export const extendLicense = async (req, res) => {
	const { id } = req.params;
	const route = `POST /api/crm/licenses/${id}/extend`;
	const replayed = await replayIdempotent(req, route);
	if (replayed) {
		return successResponse(res, StatusCodes.CREATED, "副授權申請已建立，待審核通過後將產生 License Key", {
			license: serializeLicense(replayed)
		});
	}

	const body = parseExtendLicenseBody(req);
	const { features, notes, quotas, orderNumber } = body;
	const parentLicense = await License.findById(id);
	if (!parentLicense) throw ApiError.notFound("授權不存在");
	if (parentLicense.parentLicenseKey) {
		throw ApiError.badRequest("無法對副 LK 追加授權，請選擇主授權");
	}

	if (parentLicense.status === "pending") {
		if (parentLicense.licenseKey) throw ApiError.badRequest("主授權狀態異常，請聯絡管理員");
	} else if (!["available", "active"].includes(parentLicense.status)) {
		throw ApiError.badRequest("僅能在主授權為「審核中」、「可啟用」或「使用中」時追加副授權");
	}

	const staffAcc = staffAccFromActor(req);
	if (staffAcc && trimAccount(parentLicense.applicant) !== staffAcc) {
		throw ApiError.forbidden("您只能對自己的主授權追加副授權");
	}

	const orderNo = trimAccount(orderNumber);
	if (!orderNo) throw ApiError.badRequest("需要提供訂單編號");
	assertFeaturesForProfile(features, parentLicense.deploymentProfile || "central", "必須指定至少一個追加授權模組");

	const attachment = req.file;
	if (!attachment?.buffer) {
		throw ApiError.badRequest("請上傳已簽核報價單（圖片或 PDF）");
	}

	const extension = await License.create({
		product: parentLicense.product,
		deploymentProfile: parentLicense.deploymentProfile || "central",
		features,
		quotas: validateQuotas(quotas, features),
		customerName: parentLicense.customerName,
		orderNumber: orderNo,
		parentLicenseKey: parentLicense.licenseKey || null,
		parentLicenseId: parentLicense.licenseKey ? null : parentLicense._id.toString(),
		status: "pending",
		applicant: req.crmActor.account,
		appliedAt: new Date(),
		notes: notes || null
	});

	try {
		await saveLicenseAttachment(extension, attachment, orderNo);
	} catch (err) {
		await License.findByIdAndDelete(extension._id);
		console.error("追加授權附件儲存失敗:", err);
		throw ApiError.internal("已簽核報價單儲存失敗，請稍後再試");
	}

	const raced = await rememberIdempotent(req, route, extension._id);
	if (raced) {
		await License.findByIdAndDelete(extension._id);
		fileUpload.deleteEntityDirectory("licenses", { id: extension._id.toString() });
		return successResponse(res, StatusCodes.CREATED, "副授權申請已建立，待審核通過後將產生 License Key", {
			license: serializeLicense(raced)
		});
	}

	void sendLicensePendingReviewEmail(extension, { isExtension: true }).catch((err) =>
		console.error("副授權待審核通知失敗:", err)
	);

	return successResponse(res, StatusCodes.CREATED, "副授權申請已建立，待審核通過後將產生 License Key", {
		license: serializeLicense(extension)
	});
};

export const reviewLicense = async (req, res) => {
	const license = await License.findById(req.params.id);
	if (!license) throw ApiError.notFound("授權不存在");
	if (license.status !== "pending") {
		throw ApiError.badRequest("此授權已經審核過，無法再次審核");
	}

	if (license.parentLicenseId && !license.parentLicenseKey) {
		const parent = await License.findById(license.parentLicenseId);
		if (!parent?.licenseKey) {
			throw ApiError.badRequest("請先審核主授權後，再審核副授權");
		}
		license.parentLicenseKey = parent.licenseKey;
		license.parentLicenseId = null;
	}

	await applyLicenseKeysForAvailable(license, "review");
	license.status = "available";
	license.reviewer = req.crmActor.name || req.crmActor.account;
	license.reviewedAt = new Date();
	await license.save();

	if (!license.parentLicenseKey) {
		await linkPendingExtensionsToMainLicenseKey(license);
	}

	void sendLicenseApprovedEmail(license, license.reviewer).catch((err) =>
		console.error("授權審核通過通知失敗:", err)
	);

	return successResponse(res, StatusCodes.OK, "授權審核成功", {
		license: serializeLicense(license)
	});
};

export const exportLicensePdf = async (req, res) => {
	const license = await License.findById(req.params.id);
	if (!license) throw ApiError.notFound("授權不存在");
	assertCanAccessLicense(license, staffAccFromActor(req));

	const lk = trimAccount(license.licenseKey);
	if (!lk) throw ApiError.badRequest("此授權尚未產生 License Key，無法輸出 PDF");

	const features = Array.isArray(license.features) ? license.features : [];
	const quotas =
		license.quotas && typeof license.quotas === "object" && !Array.isArray(license.quotas)
			? license.quotas
			: {};
	const profile = normalizeDeploymentProfile(license.deploymentProfile);
	const buffer = await buildBaSystemLicensePdfBuffer({
		customerName: license.customerName || "",
		orderNumber: license.orderNumber != null ? String(license.orderNumber) : "-",
		licenseKey: lk,
		licenseTypeLabel: license.parentLicenseKey ? "Expanded" : "Basal",
		deploymentProfile: profile,
		features,
		quotas
	});

	res.setHeader("Content-Type", "application/pdf");
	res.setHeader(
		"Content-Disposition",
		`attachment; filename="${getLicensePdfFilename(profile, license.orderNumber)}"`
	);
	return res.send(buffer);
};

export const getAttachment = async (req, res) => {
	const license = await License.findById(req.params.id);
	if (!license) throw ApiError.notFound("授權不存在");
	assertCanAccessLicense(license, staffAccFromActor(req));
	if (!license.imageUrl) throw ApiError.notFound("找不到報價單附件");

	const resolved = path.resolve(fileUpload.webToPhysicalPath(license.imageUrl));
	const licenseRoot = path.resolve(
		fileUpload.FILES_ROOT,
		"licenses",
		fileUpload.sanitizeFileName(license._id.toString())
	);
	const relative = path.relative(licenseRoot, resolved);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw ApiError.forbidden("您無法下載此文件");
	}
	if (!fs.existsSync(resolved)) throw ApiError.notFound("找不到報價單附件");

	const ext = path.extname(resolved).toLowerCase();
	const type =
		ext === ".pdf"
			? "application/pdf"
			: ext === ".png"
				? "image/png"
				: ext === ".webp"
					? "image/webp"
					: ext === ".gif"
						? "image/gif"
						: "image/jpeg";
	res.setHeader("Content-Type", type);
	res.setHeader("Content-Disposition", `inline; filename="${path.basename(resolved)}"`);
	return fs.createReadStream(resolved).pipe(res);
};
