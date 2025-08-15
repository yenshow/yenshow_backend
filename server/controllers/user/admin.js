import User from "../../models/user.js";
import { StatusCodes } from "http-status-codes";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import UserRole from "../../enums/UserRole.js";

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
