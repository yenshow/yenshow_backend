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
 * 獲取授權列表
 */
export const getLicenses = async (req, res, next) => {
	try {
		const { status, sort = "-createdAt" } = req.query;
		const filter = {};

		// 過濾條件
		if (status) filter.status = status;

		const licenses = await License.find(filter).sort(sort);

		return successResponse(res, StatusCodes.OK, "獲取授權列表成功", { licenses });
	} catch (error) {
		next(error);
	}
};

/**
 * 獲取單一授權
 */
export const getLicense = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		return successResponse(res, StatusCodes.OK, "獲取授權成功", { license });
	} catch (error) {
		next(error);
	}
};

/**
 * 建立新授權
 * 只需提供：客戶名稱、申請人、備註
 * status 自動設為 pending（審核中）
 * serialNumber 和 licenseKey 在審核時才生成
 */
export const createLicense = async (req, res, next) => {
	try {
		const { customerName, applicant, notes } = req.body;

		// 驗證必填欄位
		if (!customerName) {
			throw ApiError.badRequest("需要提供客戶名稱");
		}

		if (!applicant) {
			throw ApiError.badRequest("需要提供申請人");
		}

		// 建立新授權（status 自動設為 pending，申請時間自動記錄）
		const newLicense = await License.create({
			customerName,
			applicant,
			appliedAt: new Date(),
			status: "pending",
			notes: notes || null
			// serialNumber 和 licenseKey 在審核時才生成（預設為 null）
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
 * 自動生成 serialNumber 和 licenseKey
 * status 變更為 available（可啟用）
 * 記錄審核人和審核時間
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

		// 使用輔助函數生成 SerialNumber 和 License Key
		const { serialNumber, licenseKey } = await generateSerialNumberAndLicenseKey();

		// 更新授權：生成 serialNumber 和 licenseKey，變更狀態為 available，記錄審核資訊
		license.serialNumber = serialNumber;
		license.licenseKey = licenseKey;
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
	const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
	let serialNumber = `SN-${dateStr}-${randomNum}`;
	let attempts = 0;

	// 確保 SerialNumber 唯一
	while (attempts < 10) {
		const existing = await License.findOne({ serialNumber });
		if (!existing) {
			break;
		}
		const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
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
 * 更新授權
 */
export const updateLicense = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { status, notes } = req.body;
		const reviewer = getReviewer(req.user);

		const license = await License.findById(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		// 更新欄位
		if (status !== undefined) {
			if (!["pending", "available", "active", "inactive"].includes(status)) {
				throw ApiError.badRequest("無效的狀態值");
			}
			
			// 如果狀態變更為 available，且還沒有 serialNumber 和 licenseKey，則自動生成
			if (status === "available" && (!license.serialNumber || !license.licenseKey)) {
				const { serialNumber, licenseKey } = await generateSerialNumberAndLicenseKey();
				license.serialNumber = serialNumber;
				license.licenseKey = licenseKey;
				
				// 如果還沒有審核人資訊，則記錄當前操作者為審核人
				if (!license.reviewer) {
					license.reviewer = reviewer;
					license.reviewedAt = new Date();
				}
			}
			
			// 如果狀態變更為 active，且尚未使用過，則記錄使用時間
			if (status === "active" && !license.usedAt) {
				license.usedAt = new Date();
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
 * 刪除授權
 */
export const deleteLicense = async (req, res, next) => {
	try {
		const { id } = req.params;

		const license = await License.findByIdAndDelete(id);

		if (!license) {
			throw ApiError.notFound("授權不存在");
		}

		return successResponse(res, StatusCodes.OK, "授權刪除成功");
	} catch (error) {
		next(error);
	}
};

