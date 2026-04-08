import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import { signLicensePayload } from "../../utils/licenseSign.js";
import License from "../../models/License.js";

const STATUS_MESSAGES = {
	pending: "審核中",
	available: "可啟用",
	active: "使用中",
	inactive: "已停用"
};

/**
 * 用 licenseKey 查詢授權（所有 API 統一用 LK）
 */
const findLicenseByKey = async (licenseKey) => {
	if (!licenseKey) {
		throw ApiError.badRequest("需要提供 licenseKey");
	}
	const license = await License.findOne({ licenseKey });
	if (!license) {
		throw ApiError.notFound("找不到對應的授權", {
			code: "LICENSE_NOT_FOUND",
			message: "請確認 License Key 是否正確"
		});
	}
	return license;
};

/**
 * 線上 API 回應格式（不含 customerName、usedAt，加入 deviceFingerprint）
 */
const formatLicenseResult = (license) => ({
	serialNumber: license.serialNumber,
	licenseKey: license.licenseKey,
	product: license.product,
	deploymentProfile: license.deploymentProfile || "central",
	features: license.features || [],
	quotas: license.quotas || null,
	status: license.status,
	deviceFingerprint: license.deviceFingerprint || null
});

/**
 * 離線回應檔 payload（不含 customerName、nonce、refreshedAt）
 */
const buildOfflinePayload = (license, { isExtension, parentLicenseKey }) => ({
	licenseKey: license.licenseKey,
	serialNumber: license.serialNumber,
	product: license.product,
	deploymentProfile: license.deploymentProfile || "central",
	features: license.features || [],
	quotas: license.quotas || null,
	status: license.status,
	deviceFingerprint: license.deviceFingerprint || null,
	activatedAt: new Date().toISOString(),
	isExtension,
	parentLicenseKey: parentLicenseKey || null
});

/**
 * 驗證副 LK 的主 LK 狀態與設備指紋一致性
 * Server 端比對 DB 中主 LK 記錄的 fingerprint（不信任 client 傳來的值）
 */
const validateSubLicense = async (license, deviceFingerprint) => {
	const parentLicense = await License.findOne({ licenseKey: license.parentLicenseKey });

	if (!parentLicense) {
		throw ApiError.notFound("找不到此副 LK 的主授權", {
			code: "PARENT_NOT_FOUND"
		});
	}

	if (parentLicense.status !== "active") {
		throw ApiError.forbidden("主授權尚未啟用，無法啟用副授權", {
			code: "PARENT_NOT_ACTIVE",
			parentStatus: parentLicense.status
		});
	}

	if (!parentLicense.deviceFingerprint || parentLicense.deviceFingerprint !== deviceFingerprint) {
		throw ApiError.forbidden("設備指紋與主授權綁定的設備不一致", {
			code: "DEVICE_MISMATCH"
		});
	}

	return parentLicense;
};

/**
 * 公開授權 API Controller
 *
 * 所有 API 統一以 licenseKey 為查詢鍵。
 * 支援主 LK 首次啟用、副 LK 功能追加、主 LK 換機啟用。
 */
class LicenseController {
	/**
	 * 線上啟用
	 * POST /api/license/activate
	 *
	 * 行為邏輯：
	 * - 主 LK（無 parentLicenseKey）：綁定 deviceFingerprint → active
	 * - 副 LK（有 parentLicenseKey）：驗證主 LK 已 active 且 DB 中指紋一致 → active
	 */
	static async activate(req, res, next) {
		try {
			const { licenseKey, deviceFingerprint } = req.body;

			if (!deviceFingerprint) {
				throw ApiError.badRequest("需要提供 deviceFingerprint（設備指紋）");
			}

			const license = await findLicenseByKey(licenseKey);

			if (license.status !== "available") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{ code: "LICENSE_NOT_AVAILABLE", status: license.status }
				);
			}

			const isExtension = !!license.parentLicenseKey;

			if (isExtension) {
				await validateSubLicense(license, deviceFingerprint);
			}

			license.status = "active";
			license.deviceFingerprint = deviceFingerprint;
			license.activationMethod = "online";
			await license.save();

			return successResponse(res, StatusCodes.OK, "授權啟用成功", {
				result: formatLicenseResult(license)
			});
		} catch (error) {
			console.error("啟用授權失敗:", error);
			next(error);
		}
	}

	/**
	 * 離線啟用
	 * POST /api/license/offline-activate
	 *
	 * 統一處理主 LK 首次啟用與副 LK 功能追加。
	 * Request body: { licenseKey, deviceFingerprint }
	 */
	static async offlineActivate(req, res, next) {
		try {
			const { licenseKey, deviceFingerprint } = req.body;

			if (!licenseKey) {
				throw ApiError.badRequest("請求缺少 licenseKey");
			}
			if (!deviceFingerprint) {
				throw ApiError.badRequest("請求缺少 deviceFingerprint（設備指紋）");
			}

			const license = await findLicenseByKey(licenseKey);

			if (license.status !== "available") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{ code: "LICENSE_NOT_AVAILABLE", status: license.status }
				);
			}

			const isExtension = !!license.parentLicenseKey;

			if (isExtension) {
				await validateSubLicense(license, deviceFingerprint);
			}

			license.status = "active";
			license.deviceFingerprint = deviceFingerprint;
			license.activationMethod = "offline";
			await license.save();

			const payload = buildOfflinePayload(license, {
				isExtension,
				parentLicenseKey: license.parentLicenseKey
			});
			const signature = signLicensePayload(payload);

			return successResponse(res, StatusCodes.OK, "離線授權啟用成功", {
				result: { ...payload, signature }
			});
		} catch (error) {
			console.error("離線授權啟用失敗:", error);
			next(error);
		}
	}
}

export default LicenseController;
