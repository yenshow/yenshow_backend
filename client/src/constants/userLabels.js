import UserRole from '@/enums/UserRole.js'

export const ROLE_LABELS = {
  [UserRole.CLIENT]: '客戶',
  [UserRole.STAFF]: '員工',
  [UserRole.ADMIN]: '管理員',
}

export const getRoleLabel = (role) => ROLE_LABELS[role] || role || '—'
