import UserRole from "../enums/UserRole.js";
import { ApiError } from "./responseHandler.js";

const toId = (value) => (value != null ? String(value) : "");

export const canManageUser = (actor, target) => {
	if (!actor || !target) return false;

	const actorId = toId(actor._id ?? actor.id);
	const targetId = toId(target._id ?? target.id);
	if (actorId && targetId && actorId === targetId) return false;
	if (target.role === UserRole.ADMIN) return false;

	if (actor.role === UserRole.STAFF) return target.role === UserRole.CLIENT;
	if (actor.role === UserRole.ADMIN) {
		return target.role === UserRole.CLIENT || target.role === UserRole.STAFF;
	}

	return false;
};

export const assertCanManageUser = (actor, target) => {
	if (!actor || !target) {
		throw ApiError.badRequest("無效的用戶資料");
	}

	const actorId = toId(actor._id ?? actor.id);
	const targetId = toId(target._id ?? target.id);
	if (actorId && targetId && actorId === targetId) {
		throw ApiError.badRequest("不能管理自己的帳號");
	}
	if (target.role === UserRole.ADMIN) {
		throw ApiError.forbidden("無法管理其他管理員帳號");
	}
	if (!canManageUser(actor, target)) {
		throw ApiError.forbidden(
			actor.role === UserRole.STAFF ? "員工僅能管理客戶帳號" : "您沒有執行此操作的權限"
		);
	}
};

export const assertCanAssignRoleOnCreate = (actor, role) => {
	if (!Object.values(UserRole).includes(role)) {
		throw ApiError.badRequest("無效的用戶角色");
	}
	if (actor.role === UserRole.STAFF && role !== UserRole.CLIENT) {
		throw ApiError.forbidden("員工僅能建立客戶帳號");
	}
};

export const assertCanAssignRoleOnUpdate = (actor, target, nextRole) => {
	if (!Object.values(UserRole).includes(nextRole)) {
		throw ApiError.badRequest("無效的用戶角色");
	}

	if (actor.role === UserRole.STAFF) {
		if (nextRole !== UserRole.CLIENT || target.role !== UserRole.CLIENT) {
			throw ApiError.forbidden("員工僅能維護客戶帳號，且不可變更角色");
		}
		return;
	}

	if (actor.role === UserRole.ADMIN) {
		if (nextRole === UserRole.ADMIN) {
			throw ApiError.forbidden("請透過建立帳號流程新增管理員，不可將既有帳號改為管理員");
		}
		if (target.role === UserRole.ADMIN) {
			throw ApiError.forbidden("無法管理其他管理員帳號");
		}
		return;
	}

	throw ApiError.forbidden("您沒有執行此操作的權限");
};
