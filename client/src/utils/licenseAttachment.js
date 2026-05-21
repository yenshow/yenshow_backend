/** 新增授權附檔：圖片或 PDF */
export const isLicenseAttachmentFile = (file) => {
  if (!file) return false
  if (file.type.startsWith('image/')) return true
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
}

/** 從 storage URL 解析顯示檔名與是否為 PDF */
export const getLicenseAttachmentUrlMeta = (url) => {
  if (!url || typeof url !== 'string') return null
  const raw = url.split('/').filter(Boolean).pop() || '附件'
  let name = raw
  try {
    name = decodeURIComponent(raw)
  } catch {
    /* 保留 raw */
  }
  return { name, isPdf: /\.pdf$/i.test(name) }
}
