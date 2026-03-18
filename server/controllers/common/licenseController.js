import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import { signLicensePayload, verifyLicenseSignature } from "../../utils/licenseSign.js";
import License from "../../models/License.js";

const STATUS_MESSAGES = {
	pending: "審核中",
	available: "可啟用",
	active: "使用中",
	inactive: "已停用"
};

/**
 * 格式化日期為台灣格式
 */
const formatDateTW = (date) => {
	return new Date(date).toLocaleDateString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	});
};

/**
 * 檢查授權是否可用（共用邏輯）
 * @returns {string|null} 錯誤訊息，null 代表可用
 */
const checkLicenseAvailability = (license) => {
	if (license.status !== "available" && license.status !== "active") {
		return {
			code: "LICENSE_NOT_AVAILABLE",
			status: license.status,
			statusText: STATUS_MESSAGES[license.status] || license.status
		};
	}
	return null;
};

/**
 * 授權驗證控制器
 * 處理客戶端的授權驗證請求（公開 API）
 */
class LicenseController {
	/**
	 * 根據 SerialNumber 獲取 License Key
	 * POST /api/license/get-license-key
	 */
	static async getLicenseKey(req, res, next) {
		try {
			const { serialNumber } = req.body;

			if (!serialNumber) {
				throw ApiError.badRequest("需要提供 serialNumber");
			}

			const license = await License.findOne({ serialNumber });

			if (!license) {
				throw ApiError.notFound("找不到對應的授權", {
					code: "LICENSE_NOT_FOUND",
					message: `找不到 SerialNumber 為「${serialNumber}」的授權，請確認是否正確`
				});
			}

			const unavailable = checkLicenseAvailability(license);
			if (unavailable) {
				throw ApiError.forbidden(
					`無法獲取 License Key：授權狀態為「${unavailable.statusText}」`,
					{ ...unavailable, message: "只有狀態為「可啟用」或「使用中」的授權才能獲取 License Key" }
				);
			}

			return successResponse(res, StatusCodes.OK, "獲取 License Key 成功", {
				result: {
					licenseKey: license.licenseKey,
					serialNumber: license.serialNumber,
					product: license.product,
					features: license.features || [],
					status: license.status
				}
			});
		} catch (error) {
			console.error("獲取 License Key 失敗:", error);
			next(error);
		}
	}

	/**
	 * 驗證授權
	 * POST /api/license/validate
	 */
	static async validate(req, res, next) {
		try {
			const { licenseKey } = req.body;

			if (!licenseKey) {
				throw ApiError.badRequest("需要提供 licenseKey");
			}

			const license = await License.findOne({ licenseKey });

			if (!license) {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						error: "找不到對應的授權",
						message: "請確認 License Key 是否正確",
						code: "LICENSE_NOT_FOUND"
					}
				});
			}

			const unavailable = checkLicenseAvailability(license);
			if (unavailable) {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						error: `授權狀態為「${unavailable.statusText}」`,
						message: "只有狀態為「可啟用」或「使用中」的授權才能通過驗證",
						code: "LICENSE_INACTIVE",
						status: unavailable.status,
						statusText: unavailable.statusText
					}
				});
			}

			if (license.usedAt) {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						error: "此授權已經被使用過",
						message: `此授權已於 ${formatDateTW(license.usedAt)} 使用過，每個授權只能使用一次`,
						code: "LICENSE_ALREADY_USED",
						usedAt: license.usedAt,
						usedAtFormatted: formatDateTW(license.usedAt)
					}
				});
			}

			license.usedAt = new Date();
			license.status = "active";
			license.activationMethod = "online";
			await license.save();

			return successResponse(res, StatusCodes.OK, "驗證成功", {
				result: {
					valid: true,
					code: "VALID",
					license: {
						id: license.id,
						serialNumber: license.serialNumber,
						product: license.product,
						features: license.features || [],
						status: license.status
					}
				}
			});
		} catch (error) {
			console.error("驗證授權失敗:", error);
			next(error);
		}
	}

	/**
	 * 啟用授權（線上版 — BA 系統後端呼叫此 API）
	 * POST /api/license/activate
	 *
	 * 支援兩種輸入：
	 *  - { licenseKey } — 用 License Key 啟用
	 *  - { serialNumber } — 用 Serial Number 啟用（自動查出 LK）
	 */
	static async activate(req, res, next) {
		try {
			const { licenseKey, serialNumber } = req.body;

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

			const unavailable = checkLicenseAvailability(license);
			if (unavailable) {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${unavailable.statusText}」`,
					{ ...unavailable, message: "只有狀態為「可啟用」或「使用中」的授權才能被使用" }
				);
			}

			if (license.usedAt) {
				throw ApiError.forbidden("此授權已經被使用過，無法再次啟用", {
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					usedAtFormatted: formatDateTW(license.usedAt),
					message: `此授權已於 ${formatDateTW(license.usedAt)} 使用過，每個授權只能使用一次`
				});
			}

			license.usedAt = new Date();
			license.status = "active";
			license.activationMethod = "online";
			await license.save();

			return successResponse(res, StatusCodes.OK, "授權啟用成功", {
				result: {
					serialNumber: license.serialNumber,
					licenseKey: license.licenseKey,
					product: license.product,
					features: license.features || [],
					status: license.status,
					customerName: license.customerName,
					usedAt: license.usedAt
				}
			});
		} catch (error) {
			console.error("啟用授權失敗:", error);
			next(error);
		}
	}

	/**
	 * 檢查授權狀態（心跳 / 定期驗證）
	 * POST /api/license/check-status
	 *
	 * 支援 licenseKey 或 serialNumber 查詢
	 */
	static async checkStatus(req, res, next) {
		try {
			const { licenseKey, serialNumber } = req.body;

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

			return successResponse(res, StatusCodes.OK, "獲取授權狀態成功", {
				result: {
					license: {
						id: license.id,
						serialNumber: license.serialNumber,
						licenseKey: license.licenseKey,
						product: license.product,
						features: license.features || [],
						status: license.status,
						customerName: license.customerName,
						createdAt: license.createdAt,
						usedAt: license.usedAt,
						notes: license.notes
					}
				}
			});
		} catch (error) {
			console.error("檢查授權狀態失敗:", error);
			next(error);
		}
	}

	// ==================== 離線授權 ====================

	/**
	 * 離線授權 — 處理請求檔，回傳簽名回應資料（供下載為回應檔）
	 * POST /api/license/offline-activate
	 */
	static async offlineActivate(req, res, next) {
		try {
			const { serialNumber, deviceFingerprint, timestamp, nonce } = req.body;

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

			const unavailable = checkLicenseAvailability(license);
			if (unavailable) {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${unavailable.statusText}」`,
					unavailable
				);
			}

			if (license.usedAt) {
				throw ApiError.forbidden("此授權已經被使用過，無法再次啟用", {
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					usedAtFormatted: formatDateTW(license.usedAt),
					message: `此授權已於 ${formatDateTW(license.usedAt)} 使用過，每個授權只能使用一次`
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

			// 回應檔 payload（含 features，供 BA 系統驗簽後直接使用）
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
	 * 離線授權 — 刷新回應檔（用於 features 變更後重新產生簽名回應檔）
	 * POST /api/license/offline-refresh
	 *
	 * 適用場景：客戶追加功能模組，admin 在後台修改 features 後，
	 * 需要產生新的回應檔帶回離線設備更新。
	 * 不會改變授權狀態或 usedAt。
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

	/**
	 * 離線授權 — 驗證回應檔簽名
	 * POST /api/license/offline-verify
	 */
	static async offlineVerify(req, res, next) {
		try {
			const { serialNumber, licenseKey, customerName, product, features, status, deviceFingerprint, activatedAt, nonce, signature } = req.body;

			if (!signature) {
				throw ApiError.badRequest("缺少 signature 欄位");
			}
			if (!serialNumber || !licenseKey) {
				throw ApiError.badRequest("缺少必要的授權資料（serialNumber, licenseKey）");
			}

			const payload = {
				serialNumber,
				licenseKey,
				customerName: customerName || null,
				product: product || null,
				features: features || [],
				status: status || null,
				deviceFingerprint: deviceFingerprint || null,
				activatedAt: activatedAt || null,
				nonce: nonce || null
			};

			const isValid = verifyLicenseSignature(payload, signature);

			if (!isValid) {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						code: "INVALID_SIGNATURE",
						message: "回應檔簽名無效，資料可能已被竄改"
					}
				});
			}

			const license = await License.findOne({ serialNumber });

			if (!license) {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						code: "LICENSE_NOT_FOUND",
						message: "簽名有效，但伺服器上找不到對應的授權"
					}
				});
			}

			if (license.status === "inactive") {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						code: "LICENSE_INACTIVE",
						message: "簽名有效，但此授權已被停用"
					}
				});
			}

			return successResponse(res, StatusCodes.OK, "驗證成功", {
				result: {
					valid: true,
					code: "VALID",
					license: {
						serialNumber: license.serialNumber,
						product: license.product,
						features: license.features || [],
						status: license.status,
						deviceFingerprint: license.deviceFingerprint,
						usedAt: license.usedAt
					}
				}
			});
		} catch (error) {
			console.error("離線授權驗證失敗:", error);
			next(error);
		}
	}
}

export default LicenseController;
