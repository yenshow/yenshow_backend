/** 前端授權模組目錄（對齊後端 constants/baLicenseFeatures.js） */
export const BA_FEATURES = Object.freeze([
  { value: 'people_counting', label: '門禁管理', unit: 'devices' },
  { value: 'roll_call', label: '時段簽到', unit: 'devices' },
  { value: 'elevator', label: '電梯管理', unit: 'both' },
  { value: 'lighting', label: '照明系統', unit: 'points' },
  { value: 'hvac', label: '空調系統', unit: 'points' },
  { value: 'air_circulation', label: '空氣循環', unit: 'points' },
  { value: 'drainage', label: '排水系統', unit: 'points' },
  { value: 'power', label: '電力系統', unit: 'points' },
  { value: 'energy', label: '能源管理系統', unit: 'points' },
  { value: 'fire', label: '消防系統', unit: 'points' },
  { value: 'emergency_rescue', label: '緊急求救', unit: 'points' },
  { value: 'smoke_alarm', label: '煙霧警報', unit: 'points' },
  { value: 'environment', label: '環境品質', unit: 'points' },
  { value: 'surveillance', label: '影像監控', unit: 'devices' },
  { value: 'vehicle_access', label: '車輛進出', unit: 'devices' },
  { value: 'multimedia', label: '多媒體資訊牆席次', unit: 'devices' },
  { value: 'intercom', label: '對講系統', unit: 'devices' },
  { value: 'security', label: '保全系統', unit: 'points' },
])

const CONSTRUCTION_KEYS = Object.freeze([
  'people_counting',
  'environment',
  'surveillance',
  'vehicle_access',
  'roll_call',
])

const FEATURE_BY_VALUE = Object.freeze(Object.fromEntries(BA_FEATURES.map((f) => [f.value, f])))

export const normalizeFeatureKey = (featureKey) =>
  featureKey === 'access_security' ? 'intercom' : featureKey

export const getFeatureUnit = (featureKey) =>
  FEATURE_BY_VALUE[normalizeFeatureKey(featureKey)]?.unit || 'devices'

export const getFeatureLabel = (featureKey) => {
  const key = normalizeFeatureKey(featureKey)
  return FEATURE_BY_VALUE[key]?.label || (featureKey === 'visitor' ? '訪客系統' : featureKey)
}

export const getAllowedFeatureKeysByProfile = (deploymentProfile) => {
  if (deploymentProfile === 'construction') return [...CONSTRUCTION_KEYS]
  return BA_FEATURES.map((f) => f.value)
}

export const getQuotaFieldLabel = (featureKey) => {
  const unit = getFeatureUnit(featureKey)
  if (unit === 'points') return '點數'
  if (unit === 'both') return '台數／點數'
  return '台數'
}

export const getQuotaUnitSuffix = (featureKey) =>
  getFeatureUnit(featureKey) === 'points' ? '點' : '台'

export const formatQuotaDisplay = (featureKey, quota) => {
  const unit = getFeatureUnit(featureKey)
  if (quota == null || typeof quota !== 'object' || Array.isArray(quota)) return '不限'

  const fmt = (n, suffix) => {
    if (n === undefined || n === null || n === '') return null
    return `${n} ${suffix}`
  }

  if (unit === 'both') {
    const devices = fmt(quota.maxDevices, '台')
    const points = fmt(quota.maxPoints, '點')
    if (!devices && !points) return '不限'
    if (devices && points) return `${devices}／${points}`
    return devices || points
  }
  if (unit === 'points') return fmt(quota.maxDevices, '點') || '不限'
  return fmt(quota.maxDevices, '台') || '不限'
}

/** 顯示用：舊 access_security → intercom，略過 visitor */
export const normalizeFeaturesForDisplay = (features) => {
  const list = Array.isArray(features) ? features : []
  const out = []
  const seen = new Set()
  for (const raw of list) {
    const key = normalizeFeatureKey(raw)
    if (key === 'visitor') continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}
