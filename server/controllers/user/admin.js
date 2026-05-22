import User from "../../models/user.js";
import License from "../../models/License.js";
import News from "../../models/News.js";
import Faq from "../../models/Faq.js";
import CaseStudy from "../../models/caseStudy.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import UserRole from "../../enums/UserRole.js";
import crypto from "crypto";
import fileUpload from "../../utils/fileUpload.js";
import { buildBaSystemLicensePdfBuffer } from "../../utils/baSystemLicensePdf.js";
import {
	sendLicenseApprovedEmail,
	sendLicensePendingReviewEmail
} from "../../services/emailService.js";

const LICENSE_EXT_SORT = { appliedAt: 1, createdAt: 1, _id: 1 };

const applyStaffApplicantFilter = (query, staffAcc) => {
	if (staffAcc) query.applicant = staffAcc;
	return query;
};

/** 查詢主 LK 底下副授權（含審核前以 parentLicenseId 暫掛者） */
const buildMainLicenseChildrenFilter = (mainLicense) => {
	const parentId = mainLicense._id?.toString();
	const or = parentId ? [{ parentLicenseId: parentId }] : [];
	if (mainLicense.licenseKey) or.push({ parentLicenseKey: mainLicense.licenseKey });
	return or.length === 1 ? or[0] : { $or: or };
};

const groupExtensionsBy = (extensions, field) => {
	const map = {};
	for (const ext of extensions) {
		const key = ext[field];
		if (!key) continue;
		if (!map[key]) map[key] = [];
		map[key].push(ext);
	}
	return map;
};

const attachExtensionsToMainLicenses = async (licenses, staffAcc) => {
	const licenseKeys = licenses.map((l) => l.licenseKey).filter((k) => typeof k === "string" && k.length > 0);
	const pendingParentIds = licenses
		.filter((l) => !l.parentLicenseKey && !l.licenseKey)
		.map((l) => (l._id != null ? String(l._id) : null))
		.filter(Boolean);

	const fetches = [];
	if (licenseKeys.length > 0) {
		fetches.push(
			License.collection
				.find(applyStaffApplicantFilter({ parentLicenseKey: { $in: licenseKeys } }, staffAcc))
				.sort(LICENSE_EXT_SORT)
				.toArray()
		);
	}
	if (pendingParentIds.length > 0) {
		fetches.push(
			License.collection
				.find(applyStaffApplicantFilter({ parentLicenseId: { $in: pendingParentIds } }, staffAcc))
				.sort(LICENSE_EXT_SORT)
				.toArray()
		);
	}

	const fetchResults = await Promise.all(fetches);
	let ri = 0;
	const byKeyExts = licenseKeys.length > 0 ? fetchResults[ri++] : [];
	const byIdExts = pendingParentIds.length > 0 ? fetchResults[ri++] : [];
	const extensionMap = groupExtensionsBy(byKeyExts, "parentLicenseKey");
	const extensionMapByParentId = groupExtensionsBy(byIdExts, "parentLicenseId");

	for (const license of licenses) {
		const parentId = license._id != null ? String(license._id) : null;
		const byKey = license.licenseKey ? extensionMap[license.licenseKey] || [] : [];
		const byId = parentId ? extensionMapByParentId[parentId] || [] : [];
		license.extensions = [...byKey, ...byId];
	}
};

/** 主 LK 審核通過後，將以 parentLicenseId 暫掛的副授權改為 parentLicenseKey */
const linkPendingExtensionsToMainLicenseKey = async (mainLicense) => {
	if (!mainLicense?.licenseKey || mainLicense.parentLicenseKey) return;
	const parentId = mainLicense._id?.toString();
	if (!parentId) return;

	await License.updateMany(
		{ parentLicenseId: parentId },
		{ $set: { parentLicenseKey: mainLicense.licenseKey }, $unset: { parentLicenseId: "" } }
	);
};

/**
 * 獲取用戶列表 (支援過濾)
 */
export const getUsers = async (req, res, next) => {
	try {
		const { role, isActive, sort = "createdAt" } = req.query;
		const filter = {};

		// 過濾條件
		if (role) filter.role = role;
		if (isActive !== undefined) filter.isActive = isActive === "true";

		const users = await User.find(filter).select("-password -tokens").sort(sort);

		return successResponse(res, StatusCodes.OK, "獲取用戶列表成功", { users });
	} catch (error) {
		next(error);
	}
};

/**
 * 創建用戶 (通用方法)
 */
export const createUser = async (req, res, next) => {
	try {
		const { account, email, password, role, ...additionalInfo } = req.body;

		// 基本驗證
		if (!account || !password || !role) {
			throw ApiError.badRequest("帳號、密碼和角色為必填欄位");
		}

		// 角色驗證
		if (!Object.values(UserRole).includes(role)) {
			throw ApiError.badRequest("無效的用戶角色");
		}

		// 建立用戶資料
		const userData = {
			account,
			password,
			email,
			role,
			isActive: true,
			isFirstLogin: true
		};

		// 根據角色添加特定資訊
		if (role === UserRole.CLIENT && additionalInfo.clientInfo) {
			userData.clientInfo = additionalInfo.clientInfo;
		} else if ((role === UserRole.STAFF || role === UserRole.ADMIN) && additionalInfo.staffInfo) {
			userData.staffInfo = additionalInfo.staffInfo;
		}

		const user = await User.create(userData);

		return successResponse(res, StatusCodes.CREATED, "用戶創建成功", {
			user: {
				_id: user._id,
				account: user.account,
				email: user.email,
				role: user.role,
				...(user.clientInfo ? { clientInfo: user.clientInfo } : {}),
				...(user.staffInfo ? { staffInfo: user.staffInfo } : {})
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * 更新用戶 (通用方法)
 */
export const updateUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email, role, isActive, clientInfo, staffInfo } = req.body;

		// 檢查是否嘗試更新自己
		if (id === req.user.id) {
			throw ApiError.badRequest("不能更新自己的帳號");
		}

		// 基本更新數據
		const updateData = {};

		// 只更新提供的欄位
		if (email !== undefined) updateData.email = email;
		if (role !== undefined) {
			// 角色驗證
			if (!Object.values(UserRole).includes(role)) {
				throw ApiError.badRequest("無效的用戶角色");
			}
			updateData.role = role;
		}
		if (isActive !== undefined) updateData.isActive = isActive;

		// 根據角色添加特定資訊
		if (role === UserRole.CLIENT && clientInfo) {
			updateData.clientInfo = clientInfo;
		} else if ((role === UserRole.STAFF || role === UserRole.ADMIN) && staffInfo) {
			updateData.staffInfo = staffInfo;
		}

		const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password -tokens");

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		return successResponse(res, StatusCodes.OK, "用戶更新成功", { user });
	} catch (error) {
		next(error);
	}
};

/**
 * 刪除用戶
 */
export const deleteUser = async (req, res, next) => {
	try {
		const { id } = req.params;

		// 檢查是否嘗試刪除自己
		if (id === req.user.id) {
			throw ApiError.badRequest("不能刪除自己的帳號");
		}

		// 查找並刪除用戶
		const user = await User.findByIdAndDelete(id);

		if (!user) {
			throw ApiError.notFound("用戶不存在");
		}

		// 返回成功響應
		return successResponse(res, StatusCodes.OK, "用戶刪除成功", {
			result: {
				id: user._id,
				account: user.account
			}
		});
	} catch (error) {
		console.error("刪除用戶失敗:", error);
		next(error);
	}
};

// ==================== 授權管理功能 ====================

const trimAccount = (value) => (typeof value === "string" ? value.trim() : "");

/** 非員工：null；員工：登入帳號 trim 後字串（可能為空） */
const getStaffApplicantAccount = (req) => {
	if (req.user?.role !== UserRole.STAFF) return null;
	return trimAccount(req.user.account);
};

/** 建立／追加授權：記錄建立者登入帳號（員工資料範圍用） */
const applicantFromRequester = (req) => {
	const a = trimAccount(req.user?.account);
	if (!a) {
		throw ApiError.badRequest("無法取得登入帳號");
	}
	return a;
};

/**
 * 獲取授權列表（預設僅回傳主 LK，附帶副 LK 資訊）
 */
export const getLicenses = async (req, res, next) => {
	try {
		const { status, product, sort = "-createdAt", includeExtensions } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (product) filter.product = product;
		// 僅主 LK：排除副 LK（含審核前以 parentLicenseId 暫掛、尚無 parentLicenseKey 者）
		if (!includeExtensions) {
			filter.parentLicenseKey = null;
			filter.parentLicenseId = null;
		}

		const staffAcc = getStaffApplicantAccount(req);
		if (staffAcc !== null && !staffAcc) {
			return successResponse(res, StatusCodes.OK, "獲取授權列表成功", { licenses: [] });
		}
		if (staffAcc) {
			filter.applicant = staffAcc;
		}

		let licenses = await License.find(filter).sort(sort).lean();

		if (!includeExtensions) {
			// sanitizeFilter 下 $in 需用 native driver，一次載入副 LK 避免 N+1
			await attachExtensionsToMainLicenses(licenses, staffAcc);
		}

		return successResponse(res, StatusCodes.OK, "獲取授權列表成功", { licenses });
	} catch (error) {
		next(error);
	}
};

/**
 * 獲取單一授權（含其下所有副 LK）
 */
export const getLicense = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		const staffAcc = getStaffApplicantAccount(req);
		if (staffAcc !== null) {
			if (!staffAcc) {
				throw ApiError.forbidden("無法確認您的帳號");
			}
			if (trimAccount(license.applicant) !== staffAcc) {
				throw ApiError.forbidden("您只能存取自己的授權");
			}
		}

		let extensions = [];
		if (!license.parentLicenseKey) {
			extensions = await License.find(
				applyStaffApplicantFilter(buildMainLicenseChildrenFilter(license), staffAcc)
			).sort(LICENSE_EXT_SORT);
		}

		return successResponse(res, StatusCodes.OK, "獲取授權成功", { license, extensions });
	} catch (error) {
		next(error);
	}
};

/**
 * 下載 BA System License PDF（須已產生 License Key）
 */
export const exportLicensePdf = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		const staffAcc = getStaffApplicantAccount(req);
		if (staffAcc !== null) {
			if (!staffAcc) {
				throw ApiError.forbidden("無法確認您的帳號");
			}
			if (trimAccount(license.applicant) !== staffAcc) {
				throw ApiError.forbidden("您只能存取自己的授權");
			}
		}

		const lk = trimAccount(license.licenseKey);
		if (!lk) {
			throw ApiError.badRequest("此授權尚未產生 License Key，無法輸出 PDF");
		}

		const licenseTypeLabel = license.parentLicenseKey ? "Expanded" : "Basal";
		const features = Array.isArray(license.features) ? license.features : [];
		const quotas =
			license.quotas && typeof license.quotas === "object" && !Array.isArray(license.quotas) ? license.quotas : {};

		const buffer = await buildBaSystemLicensePdfBuffer({
			customerName: license.customerName || "",
			orderNumber: license.orderNumber != null ? String(license.orderNumber) : "-",
			licenseKey: lk,
			licenseTypeLabel,
			deploymentProfile: normalizeDeploymentProfile(license.deploymentProfile),
			features,
			quotas
		});

		const safeKey = lk.replace(/[^a-zA-Z0-9-_]/g, "_");
		const filename = `BA-System-License-${safeKey}.pdf`;

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.send(buffer);
	} catch (error) {
		next(error);
	}
};

/**
 * 建立新授權
 * 必填：product、客戶名稱、訂單編號；建立者帳號由後端寫入 applicant
 * 選填：備註
 * status 自動設為 pending（審核中）
 * serialNumber 和 licenseKey 在審核時才生成
 */
const CENTRAL_FEATURES = [
	"people_counting",
	"lighting",
	"hvac",
	"drainage",
	"power",
	"fire",
	"emergency_rescue",
	"environment",
	"surveillance",
	"vehicle_access",
	"multimedia",
	"smoke_alarm",
	"air_circulation"
];
const CONSTRUCTION_FEATURES = ["people_counting", "environment", "surveillance", "vehicle_access"];

const normalizeDeploymentProfile = (value) => {
	if (!value) return "central";
	if (value === "center") return "central";
	return value;
};

const getAllowedFeaturesByProfile = (deploymentProfile) => {
	if (deploymentProfile === "construction") return CONSTRUCTION_FEATURES;
	return CENTRAL_FEATURES;
};

const validateQuotas = (quotas, features) => {
	if (quotas === undefined || quotas === null) return null;
	if (typeof quotas !== "object" || Array.isArray(quotas)) {
		throw ApiError.badRequest("quotas 必須為 object");
	}

	const featureSet = new Set((features || []).filter((f) => typeof f === "string"));
	const normalized = {};

	for (const [featureKey, quotaValue] of Object.entries(quotas)) {
		if (!featureSet.has(featureKey)) {
			throw ApiError.badRequest(`quotas 的 key 必須同時出現在 features[]：${featureKey}`);
		}
		if (quotaValue === null) {
			normalized[featureKey] = { maxDevices: null };
			continue;
		}
		if (typeof quotaValue !== "object" || Array.isArray(quotaValue)) {
			throw ApiError.badRequest(`quotas.${featureKey} 必須為 object`);
		}

		const maxDevices = quotaValue.maxDevices;
		if (maxDevices === undefined || maxDevices === null || maxDevices === "") {
			normalized[featureKey] = { maxDevices: null };
			continue;
		}
		if (!Number.isInteger(maxDevices) || maxDevices < 0) {
			throw ApiError.badRequest(`quotas.${featureKey}.maxDevices 必須為非負整數或 null`);
		}

		normalized[featureKey] = { maxDevices };
	}

	return Object.keys(normalized).length > 0 ? normalized : null;
};

const parseCreateLicenseBody = (req) => {
	if (req.is("multipart/form-data") && req.body?.licenseDataPayload) {
		try {
			return JSON.parse(req.body.licenseDataPayload);
		} catch {
			throw ApiError.badRequest("無法解析 licenseDataPayload JSON 字串");
		}
	}
	return { ...req.body };
};

export const createLicense = async (req, res, next) => {
	try {
		const body = parseCreateLicenseBody(req);
		const { customerName, features, notes, deploymentProfile, quotas, orderNumber } = body;

		if (!customerName) {
			throw ApiError.badRequest("需要提供客戶名稱");
		}

		const orderNo = trimAccount(orderNumber);
		if (!orderNo) {
			throw ApiError.badRequest("需要提供訂單編號");
		}

		const resolvedApplicant = applicantFromRequester(req);

		const normalizedProfile = normalizeDeploymentProfile(deploymentProfile);
		if (!["central", "construction"].includes(normalizedProfile)) {
			throw ApiError.badRequest("deploymentProfile 必須為 central 或 construction");
		}

		if (!Array.isArray(features) || features.length === 0) {
			throw ApiError.badRequest("必須指定至少一個功能模組");
		}
		const allowed = getAllowedFeaturesByProfile(normalizedProfile);
		const invalidFeatures = features.filter((f) => !allowed.includes(f));
		if (invalidFeatures.length > 0) {
			throw ApiError.badRequest(`無效的功能模組：${invalidFeatures.join(", ")}`);
		}

		const normalizedQuotas = validateQuotas(quotas, features);

		const newLicense = await License.create({
			product: "BA-system",
			deploymentProfile: normalizedProfile,
			features,
			quotas: normalizedQuotas,
			customerName,
			orderNumber: orderNo,
			applicant: resolvedApplicant,
			appliedAt: new Date(),
			status: "pending",
			notes: notes || null
		});

		const attachment = req.file;
		if (attachment?.buffer) {
			try {
				const { fileName, assetCategory } = fileUpload.resolveLicenseAttachmentMeta(
					orderNo,
					attachment.originalname,
					attachment.mimetype
				);
				newLicense.imageUrl = fileUpload.saveAsset(
					attachment.buffer,
					"licenses",
					{ id: newLicense._id.toString() },
					assetCategory,
					fileName,
					""
				);
				await newLicense.save();
			} catch (err) {
				console.error("授權附件儲存失敗:", err);
			}
		}

		void sendLicensePendingReviewEmail(newLicense, { isExtension: false }).catch((err) =>
			console.error("授權待審核通知失敗:", err)
		);

		return successResponse(res, StatusCodes.CREATED, "授權建立成功", {
			license: newLicense
		});
	} catch (error) {
		next(error);
	}
};

/**
 * 獲取審核人資訊的輔助函數
 */
const getReviewer = (user) => {
	return user?.account || user?.email || "系統管理員";
};

/**
 * 審核授權（管理員專用）
 * 主 LK：自動生成 serialNumber + licenseKey
 * 副 LK：僅生成 licenseKey（無 SerialNumber）
 * status 變更為 available（可啟用），記錄審核人與時間
 */
export const reviewLicense = async (req, res, next) => {
	try {
		const { id } = req.params;
		const reviewer = getReviewer(req.user);

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		// 檢查是否已經審核過
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
		license.reviewer = reviewer;
		license.reviewedAt = new Date();

		await license.save();

		if (!license.parentLicenseKey) {
			await linkPendingExtensionsToMainLicenseKey(license);
		}

		void sendLicenseApprovedEmail(license, reviewer).catch((err) =>
			console.error("授權審核通過通知失敗:", err)
		);

		return successResponse(res, StatusCodes.OK, "授權審核成功", { license });
	} catch (error) {
		next(error);
	}
};

/**
 * 生成 SerialNumber 和 License Key 的輔助函數
 * 用於審核授權和更新授權時自動生成
 */
const generateSerialNumberAndLicenseKey = async () => {
	// 生成 SerialNumber（格式：SN-YYYYMMDD-XXXX）
	const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomNum = Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, "0");
	let serialNumber = `SN-${dateStr}-${randomNum}`;
	let attempts = 0;

	// 確保 SerialNumber 唯一
	while (attempts < 10) {
		const existing = await License.findOne({ serialNumber });
		if (!existing) {
			break;
		}
		const randomNum = Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, "0");
		serialNumber = `SN-${dateStr}-${randomNum}`;
		attempts++;
	}

	if (attempts >= 10) {
		throw ApiError.internal("無法生成唯一的 SerialNumber");
	}

	// 生成 License Key（基於 SerialNumber + 時間戳 + 隨機數）
	let finalLicenseKey;
	attempts = 0;

	while (attempts < 10) {
		const timestamp = Date.now();
		const random = crypto.randomBytes(8).toString("hex");
		const data = `${serialNumber}:${timestamp}:${random}`;
		const hash = crypto.createHash("sha256").update(data).digest("hex");
		const licenseKey = hash
			.substring(0, 16)
			.match(/.{1,4}/g)
			.join("-")
			.toUpperCase();

		// 檢查是否已存在
		const existingKey = await License.findOne({ licenseKey });
		if (!existingKey) {
			finalLicenseKey = licenseKey;
			break;
		}

		attempts++;
	}

	if (attempts >= 10) {
		throw ApiError.internal("無法生成唯一的 License Key");
	}

	return { serialNumber, licenseKey: finalLicenseKey };
};

/**
 * 產生 License Key（不依賴 SerialNumber）
 * 用於副 LK，避免副 LK 產生新 SerialNumber。
 */
const generateLicenseKey = async () => {
	let attempts = 0;
	while (attempts < 10) {
		const timestamp = Date.now();
		const random = crypto.randomBytes(8).toString("hex");
		const data = `EXT:${timestamp}:${random}`;
		const hash = crypto.createHash("sha256").update(data).digest("hex");
		const licenseKey = hash
			.substring(0, 16)
			.match(/.{1,4}/g)
			.join("-")
			.toUpperCase();

		const existingKey = await License.findOne({ licenseKey });
		if (!existingKey) return licenseKey;
		attempts++;
	}

	throw ApiError.internal("無法生成唯一的 License Key");
};

/**
 * 寫入 SN / LK：review=審核時必產生；fill=改為 available 時僅補缺漏
 */
const applyLicenseKeysForAvailable = async (license, mode) => {
	const isReview = mode === "review";
	const isChild = Boolean(license.parentLicenseKey);

	if (isChild) {
		if (isReview || !license.licenseKey) {
			license.licenseKey = await generateLicenseKey();
		}
		return;
	}

	if (isReview || !license.serialNumber || !license.licenseKey) {
		const gen = await generateSerialNumberAndLicenseKey();
		license.serialNumber = gen.serialNumber;
		license.licenseKey = gen.licenseKey;
	}
};

/**
 * 追加授權 → 建立副授權申請（pending，尚無 licenseKey）
 * POST /api/users/licenses/:id/extend
 * 主 LK 為審核中時以 parentLicenseId 暫掛；主 LK 審核通過後改寫為 parentLicenseKey。
 * 須再呼叫 review 才產生副 LK 的 licenseKey。
 */
export const extendLicense = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { features, notes, quotas, orderNumber } = req.body;

		const parentLicense = await License.findById(id);
		if (!parentLicense) {
			throw ApiError.notFound("授權不存在");
		}

		if (parentLicense.parentLicenseKey) {
			throw ApiError.badRequest("無法對副 LK 追加授權，請選擇主授權");
		}

		const isParentPending = parentLicense.status === "pending";
		if (isParentPending) {
			if (parentLicense.licenseKey) {
				throw ApiError.badRequest("主授權狀態異常，請聯絡管理員");
			}
		} else if (!["available", "active"].includes(parentLicense.status)) {
			throw ApiError.badRequest("僅能在主授權為「審核中」、「可啟用」或「使用中」時追加副授權");
		}

		const staffAcc = getStaffApplicantAccount(req);
		if (staffAcc !== null) {
			if (!staffAcc) {
				throw ApiError.forbidden("無法確認您的帳號");
			}
			if (trimAccount(parentLicense.applicant) !== staffAcc) {
				throw ApiError.forbidden("您只能對自己的主授權追加副授權");
			}
		}

		const resolvedApplicant = applicantFromRequester(req);

		const orderNo = trimAccount(orderNumber);
		if (!orderNo) {
			throw ApiError.badRequest("需要提供訂單編號");
		}

		if (!Array.isArray(features) || features.length === 0) {
			throw ApiError.badRequest("必須指定至少一個追加授權模組");
		}
		const allowed = getAllowedFeaturesByProfile(parentLicense.deploymentProfile || "central");
		const invalidFeatures = features.filter((f) => !allowed.includes(f));
		if (invalidFeatures.length > 0) {
			throw ApiError.badRequest(`無效的功能模組：${invalidFeatures.join(", ")}`);
		}

		const normalizedQuotas = validateQuotas(quotas, features);

		const extension = await License.create({
			product: parentLicense.product,
			deploymentProfile: parentLicense.deploymentProfile || "central",
			features,
			quotas: normalizedQuotas,
			customerName: parentLicense.customerName,
			orderNumber: orderNo,
			parentLicenseKey: parentLicense.licenseKey || null,
			parentLicenseId: parentLicense.licenseKey ? null : parentLicense._id.toString(),
			status: "pending",
			applicant: resolvedApplicant,
			appliedAt: new Date(),
			notes: notes || null
		});

		void sendLicensePendingReviewEmail(extension, { isExtension: true }).catch((err) =>
			console.error("副授權待審核通知失敗:", err)
		);

		return successResponse(res, StatusCodes.CREATED, "副授權申請已建立，待審核通過後將產生 License Key", {
			license: extension
		});
	} catch (error) {
		next(error);
	}
};

/**
 * 解除設備綁定 → available
 * POST /api/users/licenses/:id/unbind
 * 主 LK 解除綁定時，其下所有副 LK 也一併重置為 available
 */
export const unbindLicense = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findById(id);
		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		if (license.status !== "active") {
			throw ApiError.badRequest("只能解除「使用中」狀態的授權綁定");
		}

		if (license.parentLicenseKey) {
			throw ApiError.badRequest("無法單獨解除副 LK 綁定，請解除主授權綁定");
		}

		let extensionsReset = 0;
		if (license.licenseKey) {
			const result = await License.updateMany(
				{ parentLicenseKey: license.licenseKey },
				{ $set: { status: "available", deviceFingerprint: null, activationMethod: null } }
			);
			extensionsReset = result.modifiedCount;
		}

		license.status = "available";
		license.deviceFingerprint = null;
		license.activationMethod = null;
		await license.save();

		return successResponse(res, StatusCodes.OK, "解除綁定成功", {
			license,
			extensionsReset
		});
	} catch (error) {
		next(error);
	}
};

/**
 * 刪除授權
 * 刪除主 LK 時，一併刪除所有 parentLicenseKey 指向該主 LK 的副授權。
 * 刪除副 LK 時僅刪除該筆。
 */
export const deleteLicense = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		const isAdmin = req.user?.role === UserRole.ADMIN;
		const staffAcc = getStaffApplicantAccount(req);
		if (staffAcc !== null) {
			if (!staffAcc) {
				throw ApiError.forbidden("無法確認您的帳號");
			}
			if (trimAccount(license.applicant) !== staffAcc) {
				throw ApiError.forbidden("您只能刪除自己的授權");
			}
		}
		if (staffAcc !== null && license.status !== "pending") {
			throw ApiError.forbidden("員工僅能刪除「審核中」的授權");
		}
		if (staffAcc === null && isAdmin && !["pending", "available"].includes(license.status)) {
			throw ApiError.forbidden("管理員僅能刪除「審核中」或「可啟用」的授權");
		}

		let deletedExtensions = 0;
		if (!license.parentLicenseKey) {
			const childLicenses = await License.find(
				applyStaffApplicantFilter(buildMainLicenseChildrenFilter(license), staffAcc)
			)
				.select("_id")
				.lean();
			for (const child of childLicenses) {
				if (child?._id) {
					fileUpload.deleteEntityDirectory("licenses", { id: child._id.toString() });
				}
			}
			if (childLicenses.length > 0) {
				const ids = childLicenses.map((c) => c._id).filter(Boolean);
				const delMany = await License.deleteMany({ _id: { $in: ids } });
				deletedExtensions = delMany?.deletedCount ?? 0;
			}
		}

		fileUpload.deleteEntityDirectory("licenses", { id: license._id.toString() });

		await License.findByIdAndDelete(id);

		const message = deletedExtensions > 0 ? `授權刪除成功，已一併刪除 ${deletedExtensions} 組副授權` : "授權刪除成功";

		return successResponse(res, StatusCodes.OK, message, { deletedExtensions });
	} catch (error) {
		next(error);
	}
};

/** 導覽列「審核中」數量（專欄／授權／案例） */
export const getPendingReviewCounts = async (req, res, next) => {
	try {
		const isAdminUser = req.user?.role === UserRole.ADMIN;
		const staffAcc = getStaffApplicantAccount(req);
		const counts = { contentManagement: 0, licenses: 0, comeo: 0 };

		if (isAdminUser) {
			const [newsCount, faqCount, comeoCount] = await Promise.all([
				News.countDocuments({ isActive: false }),
				Faq.countDocuments({ isActive: false }),
				CaseStudy.countDocuments({ isActive: false })
			]);
			counts.contentManagement = newsCount + faqCount;
			counts.comeo = comeoCount;
		}

		if (staffAcc !== null && !staffAcc) {
			return successResponse(res, StatusCodes.OK, "獲取審核中數量成功", { counts });
		}

		counts.licenses = await License.countDocuments(
			applyStaffApplicantFilter({ status: "pending" }, staffAcc)
		);

		return successResponse(res, StatusCodes.OK, "獲取審核中數量成功", { counts });
	} catch (error) {
		next(error);
	}
};
