import { getFeatureUnit } from '@/enums/baLicenseFeatures'

export {
  getFeatureUnit,
  getQuotaFieldLabel,
  getQuotaUnitSuffix,
  formatQuotaDisplay,
} from '@/enums/baLicenseFeatures'

export const getDefaultMaxDevicesByFeature = (featureKey) => {
  if (featureKey === 'surveillance') return 4
  return 2
}

export const createDefaultQuotaDraftEntry = (featureKey) => {
  const maxDevices = getDefaultMaxDevicesByFeature(featureKey)
  if (featureKey === 'elevator') return { maxDevices, maxPoints: 40 }
  return { maxDevices }
}

const parseOptionalNonNegInt = (raw, label) => {
  if (raw === '' || raw === null || raw === undefined) return { value: null, empty: true }
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { error: `${label}必須為非負整數或空白` }
  }
  return { value: parsed, empty: false }
}

/**
 * quotaDraft[featureKey] = { maxDevices?, maxPoints? }（點數模組的點上限仍放 maxDevices）
 */
export const buildLicenseQuotasPayload = ({ featureKeys, quotaDraft, getFeatureLabel }) => {
  const safeFeatureKeys = Array.isArray(featureKeys) ? featureKeys : []
  const safeQuotaDraft = quotaDraft && typeof quotaDraft === 'object' ? quotaDraft : {}
  const quotasPayload = {}

  for (const featureKey of safeFeatureKeys) {
    const raw = safeQuotaDraft?.[featureKey]
    if (raw === '' || raw === null || raw === undefined) continue

    const label = getFeatureLabel?.(featureKey) || featureKey
    const entry = typeof raw === 'object' && !Array.isArray(raw) ? raw : { maxDevices: raw }
    const devicesLabel = `${label} 的${getFeatureUnit(featureKey) === 'points' ? '點數' : '台數'}`
    const devicesParsed = parseOptionalNonNegInt(entry.maxDevices, devicesLabel)
    if (devicesParsed.error) return { error: `配額設定錯誤：${devicesParsed.error}` }

    const payloadEntry = {}
    if (!devicesParsed.empty) payloadEntry.maxDevices = devicesParsed.value

    if (featureKey === 'elevator') {
      const pointsParsed = parseOptionalNonNegInt(entry.maxPoints, `${label} 的點數`)
      if (pointsParsed.error) return { error: `配額設定錯誤：${pointsParsed.error}` }
      if (!pointsParsed.empty) payloadEntry.maxPoints = pointsParsed.value
    }

    if (Object.keys(payloadEntry).length === 0) continue
    quotasPayload[featureKey] = payloadEntry
  }

  return { quotas: Object.keys(quotasPayload).length > 0 ? quotasPayload : null }
}
