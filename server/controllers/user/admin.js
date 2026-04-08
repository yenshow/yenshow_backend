import User from "../../models/user.js";
import License from "../../models/License.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import UserRole from "../../enums/UserRole.js";
import crypto from "crypto";

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

/**
 * 獲取授權列表（預設僅回傳主 LK，附帶副 LK 資訊）
 */
export const getLicenses = async (req, res, next) => {
	try {
		const { status, product, sort = "-createdAt", includeExtensions } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (product) filter.product = product;
		if (!includeExtensions) filter.parentLicenseKey = null;

		const licenses = await License.find(filter).sort(sort).lean();

		if (!includeExtensions) {
			// 注意：app.js 開了 mongoose.set("sanitizeFilter", true)
			// 這會影響 $in 等 operator 在 Mongoose filter 的使用，因此這裡改用 native driver 一次抓回所有副 LK，避免 N+1 查詢。
			const licenseKeys = licenses
				.map((l) => l.licenseKey)
				.filter((k) => typeof k === "string" && k.length > 0);

			const extensionMap = {};

			if (licenseKeys.length > 0) {
				const extensions = await License.collection
					.find({ parentLicenseKey: { $in: licenseKeys } })
					.sort({ createdAt: -1 })
					.toArray();

				for (const ext of extensions) {
					const parentKey = ext.parentLicenseKey;
					if (!parentKey) continue;
					if (!extensionMap[parentKey]) extensionMap[parentKey] = [];
					extensionMap[parentKey].push(ext);
				}
			}

			for (const license of licenses) {
				license.extensions = license.licenseKey ? extensionMap[license.licenseKey] || [] : [];
			}
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

		let extensions = [];
		if (license.licenseKey && !license.parentLicenseKey) {
			extensions = await License.find({ parentLicenseKey: license.licenseKey }).sort("-createdAt");
		}

		return successResponse(res, StatusCodes.OK, "獲取授權成功", { license, extensions });
	} catch (error) {
		next(error);
	}
};

/**
 * 建立新授權
 * 必填：product、客戶名稱、申請人
 * 選填：備註
 * status 自動設為 pending（審核中）
 * serialNumber 和 licenseKey 在審核時才生成
 */
const CENTRAL_FEATURES = ["people_counting", "lighting", "drainage", "fire", "emergency_rescue", "environment", "surveillance", "vehicle_access"];
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

export const createLicense = async (req, res, next) => {
	try {
		const { customerName, applicant, features, notes, deploymentProfile, quotas } = req.body;

		if (!customerName) {
			throw ApiError.badRequest("需要提供客戶名稱");
		}

		if (!applicant) {
			throw ApiError.badRequest("需要提供申請人");
		}

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
			applicant,
			appliedAt: new Date(),
			status: "pending",
			notes: notes || null
		});

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

		await applyLicenseKeysForAvailable(license, "review");

		license.status = "available";
		license.reviewer = reviewer;
		license.reviewedAt = new Date();

		await license.save();

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
 * 更新授權
 *
 * 狀態變更約定：
 * - 不支援將授權設為「已停用」（inactive）；停用情境請以解除綁定或刪除處理
 * - 已停用（inactive）若要恢復為可啟用，可於此端點傳入 status: available（會清除綁定欄位並連動副 LK）
 */
export const updateLicense = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { status, features, notes, quotas, deploymentProfile } = req.body;
		const reviewer = getReviewer(req.user);

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		// 更新部署樣貌（僅限未啟用前調整，避免不同平台樣貌混用）
		if (deploymentProfile !== undefined) {
			const normalizedProfile = normalizeDeploymentProfile(deploymentProfile);
			if (!["central", "construction"].includes(normalizedProfile)) {
				throw ApiError.badRequest("deploymentProfile 必須為 central 或 construction");
			}
			if (license.status === "active") {
				throw ApiError.badRequest("授權已啟用，無法修改 deploymentProfile");
			}
			license.deploymentProfile = normalizedProfile;
		}

		// 更新 features（BA-system 專用）
		if (features !== undefined) {
			if (!Array.isArray(features) || features.length === 0) {
				throw ApiError.badRequest("必須指定至少一個功能模組");
			}
			const allowed = getAllowedFeaturesByProfile(license.deploymentProfile || "central");
			const invalidFeatures = features.filter((f) => !allowed.includes(f));
			if (invalidFeatures.length > 0) {
				throw ApiError.badRequest(`無效的功能模組：${invalidFeatures.join(", ")}`);
			}
			license.features = features;
		}

		// 更新 quotas（選配）
		if (quotas !== undefined) {
			const baseFeatures = features !== undefined ? features : license.features;
			license.quotas = validateQuotas(quotas, baseFeatures);
		}

		if (status !== undefined) {
			if (!["pending", "available", "active", "inactive"].includes(status)) {
				throw ApiError.badRequest("無效的狀態值");
			}

			if (status === "inactive") {
				throw ApiError.badRequest("不支援將授權設為已停用，請使用解除綁定或刪除授權");
			}

			if (status === "active") {
				throw ApiError.badRequest("「使用中」狀態由客戶端啟用流程寫入，請勿以 PUT 指定 status: active");
			}

			if (status === "available" && license.status === "inactive") {
				if (!license.parentLicenseKey && license.licenseKey) {
					await License.updateMany(
						{ parentLicenseKey: license.licenseKey },
						{ $set: { status: "available", deviceFingerprint: null, activationMethod: null } }
					);
				}
				license.deviceFingerprint = null;
				license.activationMethod = null;
			}

			// 一旦離開 pending（已審核/可啟用/使用中/停用），不可再切回 pending，避免破壞審核語意
			if (license.status !== "pending" && status === "pending") {
				throw ApiError.badRequest("授權狀態已離開「審核中」，不可切回審核中");
			}

			if (status === "available") {
				await applyLicenseKeysForAvailable(license, "fill");
				if (!license.reviewer) {
					license.reviewer = reviewer;
					license.reviewedAt = new Date();
				}
			}

			license.status = status;
		}

		if (notes !== undefined) {
			license.notes = notes;
		}

		await license.save();

		return successResponse(res, StatusCodes.OK, "授權更新成功", { license });
	} catch (error) {
		next(error);
	}
};

/**
 * 追加授權 → 建立副授權申請（pending，尚無 licenseKey）
 * POST /api/users/licenses/:id/extend
 * 只能對已審核的主 LK 追加授權；須再呼叫 review 才產生副 LK
 */
export const extendLicense = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { features, notes, applicant, quotas } = req.body;

		const parentLicense = await License.findById(id);
		if (!parentLicense) {
			throw ApiError.notFound("授權不存在");
		}

		if (parentLicense.parentLicenseKey) {
			throw ApiError.badRequest("無法對副 LK 追加授權，請選擇主授權");
		}

		if (!parentLicense.licenseKey) {
			throw ApiError.badRequest("主授權尚未審核，請先完成審核");
		}

		if (!applicant) {
			throw ApiError.badRequest("需要提供申請人（副 LK）");
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
			parentLicenseKey: parentLicense.licenseKey,
			status: "pending",
			applicant,
			appliedAt: new Date(),
			notes: notes || null
		});

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

		const deletedExtensions =
			!license.parentLicenseKey && license.licenseKey ? ((await License.deleteMany({ parentLicenseKey: license.licenseKey }))?.deletedCount ?? 0) : 0;

		await License.findByIdAndDelete(id);

		const message = deletedExtensions > 0 ? `授權刪除成功，已一併刪除 ${deletedExtensions} 組副授權` : "授權刪除成功";

		return successResponse(res, StatusCodes.OK, message, { deletedExtensions });
	} catch (error) {
		next(error);
	}
};
