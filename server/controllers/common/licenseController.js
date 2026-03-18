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

		// 檢查授權狀態
		const statusMessages = {
			pending: "審核中",
			available: "可啟用",
			active: "使用中",
			inactive: "已停用"
		};

		if (license.status !== "available" && license.status !== "active") {
			throw ApiError.forbidden(
				`無法獲取 License Key：授權狀態為「${statusMessages[license.status] || license.status}」`,
				{
					code: "LICENSE_NOT_AVAILABLE",
					status: license.status,
					statusText: statusMessages[license.status] || license.status,
					message: "只有狀態為「可啟用」或「使用中」的授權才能獲取 License Key"
				}
			);
		}

			return successResponse(res, StatusCodes.OK, "獲取 License Key 成功", {
				result: {
					licenseKey: license.licenseKey,
					serialNumber: license.serialNumber,
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

		// 檢查授權狀態
		const statusMessages = {
			pending: "審核中",
			available: "可啟用",
			active: "使用中",
			inactive: "已停用"
		};

		if (license.status !== "available" && license.status !== "active") {
			return successResponse(res, StatusCodes.OK, "驗證結果", {
				result: {
					valid: false,
					error: `授權狀態為「${statusMessages[license.status] || license.status}」`,
					message: "只有狀態為「可啟用」或「使用中」的授權才能通過驗證",
					code: "LICENSE_INACTIVE",
					status: license.status,
					statusText: statusMessages[license.status] || license.status
				}
			});
		}

		// 檢查授權是否已經被使用過（只能使用一次）
		if (license.usedAt) {
			const usedDate = new Date(license.usedAt).toLocaleDateString("zh-TW", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit"
			});
			return successResponse(res, StatusCodes.OK, "驗證結果", {
				result: {
					valid: false,
					error: "此授權已經被使用過",
					message: `此授權已於 ${usedDate} 使用過，每個授權只能使用一次`,
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					usedAtFormatted: usedDate
				}
			});
		}

		// 驗證成功，標記為已使用（只能使用一次），狀態變更為 active
			if (!license.usedAt) {
				license.usedAt = new Date();
			license.status = "active";
			license.activationMethod = "online";
				await license.save();
			}

			// 驗證成功
			return successResponse(res, StatusCodes.OK, "驗證成功", {
				result: {
					valid: true,
					license: {
						id: license.id,
						serialNumber: license.serialNumber,
						status: license.status
					},
					code: "VALID"
				}
			});
		} catch (error) {
			console.error("驗證授權失敗:", error);
			next(error);
		}
	}

	/**
	 * 啟用授權
	 * POST /api/license/activate
	 */
	static async activate(req, res, next) {
		try {
			const { licenseKey } = req.body;

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

		// 檢查授權狀態
		const statusMessages = {
			pending: "審核中",
			available: "可啟用",
			active: "使用中",
			inactive: "已停用"
		};

		if (license.status !== "available" && license.status !== "active") {
			throw ApiError.forbidden(
				`無法啟用授權：授權狀態為「${statusMessages[license.status] || license.status}」`,
				{
					code: "LICENSE_NOT_AVAILABLE",
					status: license.status,
					statusText: statusMessages[license.status] || license.status,
					message: "只有狀態為「可啟用」或「使用中」的授權才能被使用"
				}
			);
		}

		// 檢查授權是否已經被使用過（只能使用一次）
		if (license.usedAt) {
			const usedDate = new Date(license.usedAt).toLocaleDateString("zh-TW", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit"
			});
			throw ApiError.forbidden(
				"此授權已經被使用過，無法再次啟用",
				{
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					usedAtFormatted: usedDate,
					message: `此授權已於 ${usedDate} 使用過，每個授權只能使用一次`
				}
			);
		}

		// 設置使用時間（只能使用一次），狀態變更為 active
		license.usedAt = new Date();
		license.status = "active";
		license.activationMethod = "online";
		await license.save();

		return successResponse(res, StatusCodes.OK, "授權啟用成功", {
			result: {
				message: "授權啟用成功",
				usedAt: license.usedAt
			}
		});
		} catch (error) {
			console.error("啟用授權失敗:", error);
			next(error);
		}
	}

	/**
	 * 檢查授權狀態
	 * POST /api/license/check-status
	 */
	static async checkStatus(req, res, next) {
		try {
			const { licenseKey } = req.body;

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

			return successResponse(res, StatusCodes.OK, "獲取授權狀態成功", {
				result: {
					license: {
						id: license.id,
						licenseKey: license.licenseKey,
						serialNumber: license.serialNumber,
						status: license.status,
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
	 *
	 * 流程：
	 *  1. 離線設備產生請求檔（含 serialNumber + deviceFingerprint）
	 *  2. 使用者在有網路的電腦上傳請求檔到此 API
	 *  3. 伺服器驗證 SN → 啟用授權 → 回傳帶 HMAC-SHA256 簽名的回應資料
	 *  4. 使用者把回應檔帶回離線設備匯入
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

			if (license.status !== "available" && license.status !== "active") {
				throw ApiError.forbidden(
					`無法啟用授權：授權狀態為「${STATUS_MESSAGES[license.status] || license.status}」`,
					{
						code: "LICENSE_NOT_AVAILABLE",
						status: license.status,
						statusText: STATUS_MESSAGES[license.status] || license.status
					}
				);
			}

			if (license.usedAt) {
				const usedDate = new Date(license.usedAt).toLocaleDateString("zh-TW", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit"
				});
				throw ApiError.forbidden("此授權已經被使用過，無法再次啟用", {
					code: "LICENSE_ALREADY_USED",
					usedAt: license.usedAt,
					usedAtFormatted: usedDate,
					message: `此授權已於 ${usedDate} 使用過，每個授權只能使用一次`
				});
			}

			// 如果已經綁定過設備指紋，檢查是否相符
			if (license.deviceFingerprint && license.deviceFingerprint !== deviceFingerprint) {
				throw ApiError.forbidden("此授權已綁定其他設備，無法在此設備上啟用", {
					code: "DEVICE_MISMATCH"
				});
			}

			// 啟用授權
			const activatedAt = new Date();
			license.usedAt = activatedAt;
			license.status = "active";
			license.deviceFingerprint = deviceFingerprint;
			license.activationMethod = "offline";
			await license.save();

			// 建立回應檔的 payload（不含 signature）
			const responsePayload = {
				serialNumber: license.serialNumber,
				licenseKey: license.licenseKey,
				customerName: license.customerName,
				status: license.status,
				deviceFingerprint,
				activatedAt: activatedAt.toISOString(),
				nonce: nonce || null
			};

			// 簽名
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
	 * 離線授權 — 驗證回應檔簽名（供離線設備或前端驗證用）
	 * POST /api/license/offline-verify
	 *
	 * 可選用：離線設備若有網路時可呼叫此 API 再次確認回應檔是否有效
	 */
	static async offlineVerify(req, res, next) {
		try {
			const { serialNumber, licenseKey, customerName, status, deviceFingerprint, activatedAt, nonce, signature } = req.body;

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

			// 簽名有效，進一步檢查 DB 中的授權狀態
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
