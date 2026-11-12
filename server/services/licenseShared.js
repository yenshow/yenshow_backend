import crypto from "crypto";
import License from "../models/License.js";
import { ApiError } from "../utils/responseHandler.js";
import fileUpload from "../utils/fileUpload.js";
import {
	CENTRAL_FEATURES,
	CONSTRUCTION_FEATURES,
	FEATURE_LABELS,
	FEATURE_META,
	LEGACY_FEATURE_KEY_MAP,
	LICENSE_FEATURE_ENUM,
	formatQuotaDisplay,
	getFeatureLabel,
	getFeatureUnit,
	normalizeFeatureKey
} from "../constants/baLicenseFeatures.js";

export {
	CENTRAL_FEATURES,
	CONSTRUCTION_FEATURES,
	FEATURE_LABELS,
	FEATURE_META,
	LEGACY_FEATURE_KEY_MAP,
	LICENSE_FEATURE_ENUM,
	formatQuotaDisplay,
	getFeatureLabel,
	getFeatureUnit,
	normalizeFeatureKey
};

export const LICENSE_EXT_SORT = { appliedAt: 1, createdAt: 1, _id: 1 };

/**
 * 正規化 features[]：access_security→intercom、去重、去掉已廢止 visitor（對 BA／新寫入）
 */
export const normalizeFeaturesList = (features, { dropVisitor = true } = {}) => {
	const list = Array.isArray(features) ? features : [];
	const out = [];
	const seen = new Set();
	for (const raw of list) {
		if (typeof raw !== "string" || !raw) continue;
		const key = normalizeFeatureKey(raw);
		if (dropVisitor && key === "visitor") continue;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(key);
	}
	return out;
};

/**
 * 正規化 quotas：key 轉正式鍵；合併衝突時保留較大 maxDevices／maxPoints
 */
export const normalizeQuotasMap = (quotas) => {
	if (quotas === undefined || quotas === null) return null;
	if (typeof quotas !== "object" || Array.isArray(quotas)) return null;

	const merged = {};
	for (const [rawKey, quotaValue] of Object.entries(quotas)) {
		const featureKey = normalizeFeatureKey(rawKey);
		if (featureKey === "visitor") continue;

		const incoming =
			quotaValue === null
				? { maxDevices: null }
				: typeof quotaValue === "object" && !Array.isArray(quotaValue)
					? { ...quotaValue }
					: null;
		if (!incoming) continue;

		const prev = merged[featureKey];
		if (!prev) {
			merged[featureKey] = incoming;
			continue;
		}

		const pickMax = (a, b) => {
			if (a === undefined || a === null || a === "") return b ?? null;
			if (b === undefined || b === null || b === "") return a;
			if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
			return a;
		};
		const next = { maxDevices: pickMax(prev.maxDevices, incoming.maxDevices) };
		if (featureKey === "elevator") {
			next.maxPoints = pickMax(prev.maxPoints, incoming.maxPoints);
		}
		merged[featureKey] = next;
	}

	return Object.keys(merged).length > 0 ? merged : null;
};

/** 對 BA／對外 payload：features＋quotas 一律正式鍵 */
export const normalizeLicensePayloadForBa = (license) => {
	const features = normalizeFeaturesList(license?.features);
	const featureSet = new Set(features);
	const quotas = normalizeQuotasMap(license?.quotas);
	const filtered =
		quotas == null
			? null
			: Object.fromEntries(Object.entries(quotas).filter(([k]) => featureSet.has(k)));
	return {
		features,
		quotas: filtered && Object.keys(filtered).length > 0 ? filtered : null
	};
};

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
	featureLabels: { ...FEATURE_LABELS },
	featureUnits: Object.fromEntries(Object.entries(FEATURE_META).map(([k, v]) => [k, v.unit]))
});

export const trimAccount = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeDeploymentProfile = (value) => {
	if (!value) return "central";
	if (value === "center") return "central";
	return value;
};

export const getAllowedFeaturesByProfile = (deploymentProfile) => {
	if (deploymentProfile === "construction") return [...CONSTRUCTION_FEATURES];
	return [...CENTRAL_FEATURES];
};

export const assertFeaturesForProfile = (features, deploymentProfile, emptyMessage) => {
	if (!Array.isArray(features) || features.length === 0) {
		throw ApiError.badRequest(emptyMessage);
	}

	const forbiddenLegacy = features.filter((f) => f === "access_security");
	if (forbiddenLegacy.length > 0) {
		throw ApiError.badRequest("已停用 access_security，請改用 intercom（對講系統）");
	}

	const normalized = normalizeFeaturesList(features);
	const allowed = getAllowedFeaturesByProfile(deploymentProfile);
	const invalidFeatures = normalized.filter((f) => !allowed.includes(f));
	if (invalidFeatures.length > 0) {
		throw ApiError.badRequest(`無效的功能模組：${invalidFeatures.join(", ")}`);
	}
	return normalized;
};

const parseNonNegIntOrNull = (value, fieldPath) => {
	if (value === undefined || value === null || value === "") return null;
	if (!Number.isInteger(value) || value < 0) {
		throw ApiError.badRequest(`${fieldPath} 必須為非負整數或 null`);
	}
	return value;
};

export const validateQuotas = (quotas, features) => {
	if (quotas === undefined || quotas === null) return null;
	if (typeof quotas !== "object" || Array.isArray(quotas)) {
		throw ApiError.badRequest("quotas 必須為 object");
	}

	const normalizedFeatures = normalizeFeaturesList(features);
	const featureSet = new Set(normalizedFeatures);
	const normalizedQuotasIn = normalizeQuotasMap(quotas) || {};
	const normalized = {};

	for (const [featureKey, quotaValue] of Object.entries(normalizedQuotasIn)) {
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

		const maxDevices = parseNonNegIntOrNull(quotaValue.maxDevices, `quotas.${featureKey}.maxDevices`);
		const entry = { maxDevices };

		if (featureKey === "elevator") {
			if (quotaValue.maxPoints !== undefined) {
				entry.maxPoints = parseNonNegIntOrNull(quotaValue.maxPoints, `quotas.${featureKey}.maxPoints`);
			}
		} else if (quotaValue.maxPoints !== undefined && quotaValue.maxPoints !== null) {
			throw ApiError.badRequest(`quotas.${featureKey} 僅 elevator 可使用 maxPoints`);
		}

		normalized[featureKey] = entry;
	}

	return Object.keys(normalized).length > 0 ? normalized : null;
};

/**
 * 建立／追加／審核寫入前：features／quotas 轉正式鍵，禁止落盤 access_security
 */
export const prepareFeaturesAndQuotasForPersist = (features, quotas, deploymentProfile, emptyMessage) => {
	const normalizedFeatures = assertFeaturesForProfile(features, deploymentProfile, emptyMessage);
	const normalizedQuotas = validateQuotas(quotas, normalizedFeatures);
	return { features: normalizedFeatures, quotas: normalizedQuotas };
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

/**
 * 審核通過前：舊鍵→正式鍵後再校驗（允許讀取 access_security → intercom）
 */
export const rewriteLicenseFeaturesForIssue = (license) => {
	const prepared = prepareFeaturesAndQuotasForPersist(
		normalizeFeaturesList(license.features),
		normalizeQuotasMap(license.quotas),
		license.deploymentProfile || "central",
		"必須指定至少一個授權模組"
	);
	license.features = prepared.features;
	license.quotas = prepared.quotas;
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
