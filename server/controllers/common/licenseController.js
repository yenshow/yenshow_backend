import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import License from "../../models/License.js";

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
			license.status = "active"; // 使用後狀態變更為使用中
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
		license.status = "active"; // 使用後狀態變更為使用中
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
}

export default LicenseController;
