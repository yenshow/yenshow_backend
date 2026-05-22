import UserRole from '@/enums/UserRole.js'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'

const toId = (value) => (value != null ? String(value) : '')

const canManageUser = (actor, target) => {
  if (!actor || !target) return false

  const actorId = toId(actor._id ?? actor.id)
  const targetId = toId(target._id ?? target.id)
  if (actorId && targetId && actorId === targetId) return false
  if (target.role === UserRole.ADMIN) return false

  if (actor.role === UserRole.STAFF) return target.role === UserRole.CLIENT
  if (actor.role === UserRole.ADMIN) {
    return target.role === UserRole.CLIENT || target.role === UserRole.STAFF
  }

  return false
}

export const useUserManagementPolicy = () => {
  const userStore = useUserStore()
  const { isAdmin, isStaff, role, userId } = storeToRefs(userStore)

  const canManageTarget = (target) =>
    canManageUser({ role: role.value, _id: userId.value }, target)

  const creatableRoles = () => {
    if (isAdmin.value) return [UserRole.CLIENT, UserRole.STAFF, UserRole.ADMIN]
    if (isStaff.value) return [UserRole.CLIENT]
    return []
  }

  const canChangeRoleOnEdit = (target) => isAdmin.value && target?.role !== UserRole.ADMIN

  const editableRolesForEdit = (target) =>
    canChangeRoleOnEdit(target)
      ? [UserRole.CLIENT, UserRole.STAFF]
      : [target?.role || UserRole.CLIENT]

  const canShowCreateUserButton = (activeTab) =>
    activeTab === 'staff' ? isAdmin.value : isAdmin.value || isStaff.value

  return {
    canManageTarget,
    creatableRoles,
    canChangeRoleOnEdit,
    editableRolesForEdit,
    canShowCreateUserButton,
  }
}
