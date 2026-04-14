export const getDefaultMaxDevicesByFeature = (featureKey) => {
  if (featureKey === 'surveillance') return 4
  return 2
}

export const buildLicenseQuotasPayload = ({ featureKeys, quotaDraft, getFeatureLabel }) => {
  const safeFeatureKeys = Array.isArray(featureKeys) ? featureKeys : []
  const safeQuotaDraft = quotaDraft && typeof quotaDraft === 'object' ? quotaDraft : {}

  const quotasPayload = {}
  for (const featureKey of safeFeatureKeys) {
    const raw = safeQuotaDraft?.[featureKey]
    if (raw === '' || raw === null || raw === undefined) continue

    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0) {
      return {
        error: `Quota 設定錯誤：${getFeatureLabel?.(featureKey) || featureKey} 的 maxDevices 必須為非負整數或空白`,
      }
    }
    quotasPayload[featureKey] = { maxDevices: parsed }
  }

  return { quotas: Object.keys(quotasPayload).length > 0 ? quotasPayload : null }
}
