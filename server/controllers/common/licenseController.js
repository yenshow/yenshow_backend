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
 * 根據 licenseKey 或 serialNumber 查詢授權
 * 優先使用 licenseKey（安全性較高）
 */
const findLicense = async ({ licenseKey, serialNumber }) => {
	if (!licenseKey && !serialNumber) {
		throw ApiError.badRequest("需要提供 licenseKey 或 serialNumber");
	}
	const query = licenseKey ? { licenseKey } : { serialNumber };
	const license = await License.findOne(query);
	if (!license) {
		throw ApiError.notFound("找不到對應的授權", {
			code: "LICENSE_NOT_FOUND",
			message: "請確認授權資訊是否正確"
		});
	}
	return license;
};

/**
 * 統一的授權資料回傳格式（攤平在 result 層級）
 */
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
 * 公開授權 API Controller
 *
 * API 清單：
 *  - activate       線上啟用（一次性，用 LK）
 *  - checkStatus    心跳同步（用 LK，純讀取）
 *  - offlineActivate 離線首次啟用（用 SN + deviceFingerprint）
 */
class LicenseController {
	/**
	 * 線上啟用授權
	 * POST /api/license/activate
	 *
	 * BA 系統後端呼叫：{ licenseKey } 或 { serialNumber }
	 * 一次性操作，啟用後 usedAt 被設定，不可再次啟用
	 */
	static async activate(req, res, next) {
		try {
			const license = await findLicense(req.body);

			if (license.status !== "available" && license.status !== "active") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{
						code: "LICENSE_NOT_AVAILABLE",
						status: license.status,
						message: "只有狀態為「可啟用」的授權才能被啟用"
					}
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
	 * 檢查授權狀態（心跳 / 定期同步）
	 * POST /api/license/check-status
	 *
	 * 純讀取，不修改 DB
	 * BA 系統定期呼叫以同步最新 features / 偵測 inactive
	 * 建議用 licenseKey 查詢（比 serialNumber 安全）
	 */
	static async checkStatus(req, res, next) {
		try {
			const license = await findLicense(req.body);

			return successResponse(res, StatusCodes.OK, "獲取授權狀態成功", {
				result: formatLicenseResult(license)
			});
		} catch (error) {
			console.error("檢查授權狀態失敗:", error);
			next(error);
		}
	}

	/**
	 * 離線啟用 — 處理請求檔，回傳簽名回應資料
	 * POST /api/license/offline-activate
	 *
	 * 離線設備產生請求檔 → 操作人員上傳到 yenshow.com → 下載回應檔 → 帶回設備
	 */
	static async offlineActivate(req, res, next) {
		try {
			const { serialNumber, deviceFingerprint, nonce } = req.body;

			if (!serialNumber) {
				throw ApiError.badRequest("請求檔缺少 serialNumber");
			}
			if (!deviceFingerprint) {
				throw ApiError.badRequest("請求檔缺少 deviceFingerprint（設備指紋）");
			}

			const license = await License.findOne({ serialNumber });

			if (!license) {
				throw ApiError.notFound("找不到對應的授權", {
					code: "LICENSE_NOT_FOUND",
					message: `找不到 SerialNumber 為「${serialNumber}」的授權`
				});
			}

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

			const activatedAt = new Date();
			license.usedAt = activatedAt;
			license.status = "active";
			license.deviceFingerprint = deviceFingerprint;
			license.activationMethod = "offline";
			await license.save();

			const responsePayload = {
				serialNumber: license.serialNumber,
				licenseKey: license.licenseKey,
				customerName: license.customerName,
				product: license.product,
				features: license.features || [],
				status: license.status,
				deviceFingerprint,
				activatedAt: activatedAt.toISOString(),
				nonce: nonce || null
			};

			const signature = signLicensePayload(responsePayload);

			return successResponse(res, StatusCodes.OK, "離線授權啟用成功", {
				result: {
					...responsePayload,
					signature
				}
			});
		} catch (error) {
			console.error("離線授權啟用失敗:", error);
			next(error);
		}
	}
	/**
	 * 離線刷新 — 產生帶最新 features 的簽名回應檔
	 * POST /api/license/offline-refresh
	 *
	 * 適用場景：admin 在後台修改 features 後，操作人員到此頁面產生新回應檔帶回設備
	 * 不改變授權狀態或 usedAt
	 */
	static async offlineRefresh(req, res, next) {
		try {
			const { serialNumber, deviceFingerprint, nonce } = req.body;

			if (!serialNumber) {
				throw ApiError.badRequest("需要提供 serialNumber");
			}

			const license = await License.findOne({ serialNumber });

			if (!license) {
				throw ApiError.notFound("找不到對應的授權", {
					code: "LICENSE_NOT_FOUND",
					message: `找不到 SerialNumber 為「${serialNumber}」的授權`
				});
			}

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

			const responsePayload = {
				serialNumber: license.serialNumber,
				licenseKey: license.licenseKey,
				customerName: license.customerName,
				product: license.product,
				features: license.features || [],
				status: license.status,
				deviceFingerprint: license.deviceFingerprint || deviceFingerprint || null,
				activatedAt: license.usedAt ? license.usedAt.toISOString() : null,
				refreshedAt: new Date().toISOString(),
				nonce: nonce || null
			};

			const signature = signLicensePayload(responsePayload);

			return successResponse(res, StatusCodes.OK, "離線授權刷新成功", {
				result: {
					...responsePayload,
					signature
				}
			});
		} catch (error) {
			console.error("離線授權刷新失敗:", error);
			next(error);
		}
	}
}

export default LicenseController;
