import crypto from "crypto";
import License from "../models/License.js";
import { ApiError } from "../utils/responseHandler.js";
import fileUpload from "../utils/fileUpload.js";

export const LICENSE_EXT_SORT = { appliedAt: 1, createdAt: 1, _id: 1 };

export const FEATURE_LABELS = Object.freeze({
	people_counting: "人流統計",
	lighting: "照明系統",
	hvac: "空調系統",
	drainage: "排水系統",
	power: "電力系統",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	environment: "環境品質",
	surveillance: "影像監控",
	vehicle_access: "車輛進出",
	multimedia: "多媒體資訊",
	smoke_alarm: "煙霧警報",
	air_circulation: "空氣循環",
	elevator: "電梯管理",
	energy: "能源管理系統",
	access_security: "門禁保全",
	visitor: "訪客系統",
	roll_call: "點名系統"
});

export const CENTRAL_FEATURES = [
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
	"air_circulation",
	"elevator",
	"energy",
	"access_security",
	"visitor"
];

export const CONSTRUCTION_FEATURES = [
	"people_counting",
	"environment",
	"surveillance",
	"vehicle_access",
	"roll_call"
];

export const getLicenseCatalog = () => ({
	product: "BA-system",
	profiles: [
		{
			value: "central",
			label: "YSOP 中央管理平台",
			features: [...CENTRAL_FEATURES]
		},
		{
			value: "construction",
			label: "YSOS 工地管理平台",
			features: [...CONSTRUCTION_FEATURES]
		}
	],
	featureLabels: { ...FEATURE_LABELS }
});

export const trimAccount = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeDeploymentProfile = (value) => {
	if (!value) return "central";
	if (value === "center") return "central";
	return value;
};

export const getAllowedFeaturesByProfile = (deploymentProfile) => {
	if (deploymentProfile === "construction") return CONSTRUCTION_FEATURES;
	return CENTRAL_FEATURES;
};

export const assertFeaturesForProfile = (features, deploymentProfile, emptyMessage) => {
	if (!Array.isArray(features) || features.length === 0) {
		throw ApiError.badRequest(emptyMessage);
	}
	const allowed = getAllowedFeaturesByProfile(deploymentProfile);
	const invalidFeatures = features.filter((f) => !allowed.includes(f));
	if (invalidFeatures.length > 0) {
		throw ApiError.badRequest(`無效的功能模組：${invalidFeatures.join(", ")}`);
	}
};

export const applyStaffApplicantFilter = (query, staffAcc) => {
	if (staffAcc) query.applicant = staffAcc;
	return query;
};

export const buildMainLicenseChildrenFilter = (mainLicense) => {
	const parentId = mainLicense._id?.toString() || mainLicense.id;
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

export const attachExtensionsToMainLicenses = async (licenses, staffAcc) => {
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

export const linkPendingExtensionsToMainLicenseKey = async (mainLicense) => {
	if (!mainLicense?.licenseKey || mainLicense.parentLicenseKey) return;
	const parentId = mainLicense._id?.toString();
	if (!parentId) return;

	await License.updateMany(
		{ parentLicenseId: parentId },
		{ $set: { parentLicenseKey: mainLicense.licenseKey }, $unset: { parentLicenseId: "" } }
	);
};

export const validateQuotas = (quotas, features) => {
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

export const parseJsonPart = (raw, fieldName) => {
	if (typeof raw !== "string") return raw;
	try {
		return JSON.parse(raw);
	} catch {
		throw ApiError.badRequest(`無法解析 ${fieldName} JSON 字串`);
	}
};

export const parseCreateLicenseBody = (req) => {
	if (req.is("multipart/form-data") && req.body?.licenseDataPayload) {
		return parseJsonPart(req.body.licenseDataPayload, "licenseDataPayload");
	}
	return { ...req.body };
};

export const parseExtendLicenseBody = (req) => {
	if (req.is("multipart/form-data") && req.body?.extendDataPayload) {
		return parseJsonPart(req.body.extendDataPayload, "extendDataPayload");
	}
	return { ...req.body };
};

export const generateSerialNumberAndLicenseKey = async () => {
	const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	let serialNumber = `SN-${dateStr}-${Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, "0")}`;
	let attempts = 0;

	while (attempts < 10) {
		const existing = await License.findOne({ serialNumber });
		if (!existing) break;
		serialNumber = `SN-${dateStr}-${Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, "0")}`;
		attempts++;
	}

	if (attempts >= 10) {
		throw ApiError.internal("無法生成唯一的 SerialNumber");
	}

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

export const generateLicenseKey = async () => {
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

export const applyLicenseKeysForAvailable = async (license, mode) => {
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

export const saveLicenseAttachment = async (license, attachment, orderNo) => {
	const { fileName, assetCategory } = fileUpload.resolveLicenseAttachmentMeta(
		orderNo,
		attachment.originalname,
		attachment.mimetype
	);
	license.imageUrl = fileUpload.saveAsset(
		attachment.buffer,
		"licenses",
		{ id: license._id.toString() },
		assetCategory,
		fileName,
		""
	);
	await license.save();
	return license;
};

const toIso = (value) => {
	if (!value) return value;
	if (value instanceof Date) return value.toISOString();
	return value;
};

export const serializeLicense = (doc) => {
	if (!doc) return doc;
	const raw = typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc };
	if (raw._id && !raw.id) raw.id = raw._id.toString();
	delete raw._id;
	raw.createdAt = toIso(raw.createdAt);
	raw.updatedAt = toIso(raw.updatedAt);
	raw.appliedAt = toIso(raw.appliedAt);
	raw.reviewedAt = toIso(raw.reviewedAt);
	if (Array.isArray(raw.extensions)) {
		raw.extensions = raw.extensions.map((item) => serializeLicense(item));
	}
	return raw;
};

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
