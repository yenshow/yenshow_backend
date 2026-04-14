/** 授權狀態顯示文案（與後端 License.status enum 一致） */
export const LICENSE_STATUS_LABELS = Object.freeze({
  pending: '審核中',
  available: '可啟用',
  active: '使用中',
})

export const getLicenseStatusText = (status) =>
  (status && LICENSE_STATUS_LABELS[status]) || status || '—'
