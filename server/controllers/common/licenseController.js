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

const formatDateTW = (date) => {
	return new Date(date).toLocaleDateString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	});
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

const formatLicenseResult = (license) => ({
	serialNumber: license.serialNumber,
	licenseKey: license.licenseKey,
	product: license.product,
	features: license.features || [],
	status: license.status,
	customerName: license.customerName,
	usedAt: license.usedAt
});

/**
 * 統一離線回應檔 payload（activate 和 refresh 共用相同欄位集）
 */
const buildOfflinePayload = (license, { deviceFingerprint, nonce, refreshedAt }) => ({
	licenseKey: license.licenseKey,
	serialNumber: license.serialNumber,
	customerName: license.customerName,
	product: license.product,
	features: license.features || [],
	status: license.status,
	deviceFingerprint: deviceFingerprint || null,
	activatedAt: license.usedAt ? license.usedAt.toISOString() : null,
	refreshedAt: refreshedAt || null,
	nonce: nonce || null
});

/**
 * 公開授權 API Controller
 *
 * 所有 API 統一以 licenseKey 為查詢鍵。
 * serialNumber 僅保留在 DB 供後台管理 / 稽核使用。
 */
class LicenseController {
	/**
	 * 線上啟用
	 * POST /api/license/activate
	 */
	static async activate(req, res, next) {
		try {
			const license = await findLicenseByKey(req.body.licenseKey);

			if (license.status !== "available" && license.status !== "active") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{ code: "LICENSE_NOT_AVAILABLE", status: license.status }
				);
			}

			if (license.usedAt) {
				throw ApiError.forbidden("此授權已經被使用過，無法再次啟用", {
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					message: `此授權已於 ${formatDateTW(license.usedAt)} 啟用過`
				});
			}

			license.usedAt = new Date();
			license.status = "active";
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
	 * 心跳同步
	 * POST /api/license/check-status
	 */
	static async checkStatus(req, res, next) {
		try {
			const license = await findLicenseByKey(req.body.licenseKey);

			return successResponse(res, StatusCodes.OK, "獲取授權狀態成功", {
				result: formatLicenseResult(license)
			});
		} catch (error) {
			console.error("檢查授權狀態失敗:", error);
			next(error);
		}
	}

	/**
	 * 離線啟用（首次）
	 * POST /api/license/offline-activate
	 *
	 * request file: { licenseKey, deviceFingerprint, nonce }
	 */
	static async offlineActivate(req, res, next) {
		try {
			const { licenseKey, deviceFingerprint, nonce } = req.body;

			if (!licenseKey) {
				throw ApiError.badRequest("請求檔缺少 licenseKey");
			}
			if (!deviceFingerprint) {
				throw ApiError.badRequest("請求檔缺少 deviceFingerprint（設備指紋）");
			}

			const license = await findLicenseByKey(licenseKey);

			if (license.status !== "available" && license.status !== "active") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{ code: "LICENSE_NOT_AVAILABLE", status: license.status }
				);
			}

			if (license.usedAt) {
				throw ApiError.forbidden("此授權已經被使用過，無法再次啟用", {
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					message: `此授權已於 ${formatDateTW(license.usedAt)} 啟用過`
				});
			}

			if (license.deviceFingerprint && license.deviceFingerprint !== deviceFingerprint) {
				throw ApiError.forbidden("此授權已綁定其他設備，無法在此設備上啟用", {
					code: "DEVICE_MISMATCH"
				});
			}

			license.usedAt = new Date();
			license.status = "active";
			license.deviceFingerprint = deviceFingerprint;
			license.activationMethod = "offline";
			await license.save();

			const payload = buildOfflinePayload(license, { deviceFingerprint, nonce, refreshedAt: null });
			const signature = signLicensePayload(payload);

			return successResponse(res, StatusCodes.OK, "離線授權啟用成功", {
				result: { ...payload, signature }
			});
		} catch (error) {
			console.error("離線授權啟用失敗:", error);
			next(error);
		}
	}

	/**
	 * 離線刷新（features 更新後重新簽名）
	 * POST /api/license/offline-refresh
	 */
	static async offlineRefresh(req, res, next) {
		try {
			const { licenseKey, deviceFingerprint, nonce } = req.body;

			const license = await findLicenseByKey(licenseKey);

			if (license.status !== "active") {
				throw ApiError.forbidden(
					`此授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」，僅支援刷新已啟用的授權`,
					{ code: "LICENSE_NOT_ACTIVE", status: license.status }
				);
			}

			if (deviceFingerprint && license.deviceFingerprint && license.deviceFingerprint !== deviceFingerprint) {
				throw ApiError.forbidden("設備指紋不符，無法為此設備刷新授權", {
					code: "DEVICE_MISMATCH"
				});
			}

			const fp = license.deviceFingerprint || deviceFingerprint || null;
			const payload = buildOfflinePayload(license, {
				deviceFingerprint: fp,
				nonce,
				refreshedAt: new Date().toISOString()
			});
			const signature = signLicensePayload(payload);

			return successResponse(res, StatusCodes.OK, "離線授權刷新成功", {
				result: { ...payload, signature }
			});
		} catch (error) {
			console.error("離線授權刷新失敗:", error);
			next(error);
		}
	}
}

export default LicenseController;
