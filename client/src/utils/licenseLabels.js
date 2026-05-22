/** 授權狀態顯示文案（與後端 License.status enum 一致） */
export const LICENSE_STATUS_LABELS = Object.freeze({
  pending: '審核中',
  available: '可啟用',
  active: '使用中',
})

export const getLicenseStatusText = (status) =>
  (status && LICENSE_STATUS_LABELS[status]) || status || '—'

/** 與後端 getLicensePdfFilename 一致（Content-Disposition 缺失時的 fallback） */
export const getLicensePdfFilename = (deploymentProfile, orderNumber) => {
  const prefix = deploymentProfile === 'construction' ? 'YSOS' : 'YSOP'
  const raw = orderNumber != null ? String(orderNumber).trim() : ''
  const safeOrder = raw ? raw.replace(/[^a-zA-Z0-9-_]/g, '_') : 'no-order'
  return `${prefix}-${safeOrder}.pdf`
}
