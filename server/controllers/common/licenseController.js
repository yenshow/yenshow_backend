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
				throw ApiError.notFound("找不到對應的 SerialNumber");
			}

			// 檢查授權狀態
			if (license.status !== "active") {
				throw ApiError.forbidden(`授權未啟用 (狀態: ${license.status})`);
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
						error: "授權不存在",
						code: "LICENSE_NOT_FOUND"
					}
				});
			}

			// 檢查授權狀態
			if (license.status !== "active") {
				return successResponse(res, StatusCodes.OK, "驗證結果", {
					result: {
						valid: false,
						error: `授權未啟用 (狀態: ${license.status})`,
						code: "LICENSE_INACTIVE",
						status: license.status
					}
				});
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
				throw ApiError.unauthorized("授權不存在");
			}

			// 檢查授權狀態
			if (license.status !== "active") {
				throw ApiError.unauthorized(`授權未啟用 (狀態: ${license.status})`);
			}

			// 如果已經啟用過，直接返回成功
			if (license.activatedAt) {
				return successResponse(res, StatusCodes.OK, "授權已啟用", {
					result: {
						message: "授權已啟用",
						activatedAt: license.activatedAt
					}
				});
			}

			// 設置啟用時間
			license.activatedAt = new Date();
			await license.save();

			return successResponse(res, StatusCodes.OK, "授權啟用成功", {
				result: {
					message: "授權啟用成功",
					activatedAt: license.activatedAt
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
				throw ApiError.notFound("授權不存在");
			}

			return successResponse(res, StatusCodes.OK, "獲取授權狀態成功", {
				result: {
					license: {
						id: license.id,
						licenseKey: license.licenseKey,
						serialNumber: license.serialNumber,
						status: license.status,
						createdAt: license.createdAt,
						activatedAt: license.activatedAt,
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
