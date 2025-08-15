import { computed } from 'vue'
import { useLanguageStore } from '@/stores/core/languageStore'

/**
 * 統一的多語言處理工具
 * @param {Object} options - 配置選項
 * @returns {Object} 多語言處理工具函數集
 */
export function useLanguage(options = {}) {
  // 可選擇是否使用 languageStore
  const useStore = options.useStore !== false
  const languageStore = useStore ? useLanguageStore() : null

  // 支援的語言配置
  const supportedLanguages =
    options.languages || (useStore ? languageStore.supportedLangs.map((l) => l.code) : ['TW', 'EN'])
  const defaultLanguage = options.defaultLanguage || (useStore ? languageStore.currentLang : 'TW')

  // 當前語言 (如果使用 store，則為響應式)
  const currentLang = useStore
    ? computed(() => languageStore.currentLang)
    : { value: defaultLanguage }

  /**
   * 獲取實體的本地化字段值
   * @param {Object} entity - 實體對象
   * @param {String} field - 欄位名稱，預設為 'name'
   * @param {String} fallback - 如果找不到本地化名稱時的預設值
   * @param {String} preferredLang - 優先使用的語言，如果指定，將優先使用此語言
   * @returns {String} 本地化的字段值
   */
  const getLocalizedField = (entity, field = 'name', fallback = '', preferredLang = null) => {
    if (!entity) return fallback

    const fieldValue = entity[field]

    // 標準格式: { TW: "值", EN: "值" }
    if (fieldValue && typeof fieldValue === 'object') {
      // 如果指定了優先語言，優先使用該語言
      if (preferredLang && fieldValue[preferredLang]) {
        return fieldValue[preferredLang]
      }

      // 嘗試獲取當前語言的值
      const lang = useStore ? currentLang.value : defaultLanguage
      if (fieldValue[lang]) {
        return fieldValue[lang]
      }

      // 嘗試獲取預設語言
      if (fieldValue[defaultLanguage]) {
        return fieldValue[defaultLanguage]
      }

      // 嘗試獲取任何可用語言
      for (const supportedLang of supportedLanguages) {
        if (fieldValue[supportedLang]) {
          return fieldValue[supportedLang]
        }
      }
    }

    // 非多語言物件，直接返回
    return fieldValue || fallback
  }

  /**
   * 將 API 資料轉換為表單格式 (如 {name: {TW: '值'}} 轉為 {name_TW: '值'})
   * @param {Object} apiData - API 資料
   * @param {Array} fields - 要處理的多語言欄位
   * @returns {Object} 表單格式資料
   */
  const toFormFormat = (apiData, fields = ['name']) => {
    if (!apiData) return {}
    const result = { ...apiData }

    fields.forEach((field) => {
      if (apiData[field] && typeof apiData[field] === 'object') {
        supportedLanguages.forEach((lang) => {
          result[`${field}_${lang}`] = apiData[field][lang] || ''
        })

        // 刪除原始欄位
        delete result[field]
      }
    })

    return result
  }

  /**
   * 將表單資料轉換為 API 格式 (如 {name_TW: '值'} 轉為 {name: {TW: '值'}})
   * @param {Object} formData - 表單資料
   * @param {Array} fields - 要處理的多語言欄位
   * @returns {Object} API 格式資料
   */
  const toApiFormat = (formData, fields = ['name']) => {
    if (!formData) return {}
    const result = { ...formData }

    fields.forEach((field) => {
      result[field] = {}

      supportedLanguages.forEach((lang) => {
        const fieldKey = `${field}_${lang}`
        if (formData[fieldKey] !== undefined) {
          result[field][lang] = formData[fieldKey] || ''
        }

        // 刪除原始欄位
        delete result[fieldKey]
      })

      // 檢查是否有任何語言包含有效值
      const hasValue = Object.values(result[field]).some((v) => v && v.trim() !== '')
      if (!hasValue) {
        delete result[field]
      }
    })

    return result
  }

  /**
   * 基本多語言欄位驗證
   * @param {Object} multilingualObject - 多語言物件 {TW: '值', EN: '值'}
   * @param {Array} requiredLanguages - 必須的語言
   * @param {Number} minLength - 最小長度
   * @returns {Object} 驗證結果
   */
  const validateField = (
    multilingualObject,
    requiredLanguages = [defaultLanguage],
    minLength = 2,
  ) => {
    // 基本類型檢查
    if (!multilingualObject || typeof multilingualObject !== 'object') {
      return { valid: false, message: '欄位為必填項' }
    }

    // 檢查必要語言
    for (const lang of requiredLanguages) {
      if (!multilingualObject[lang] || multilingualObject[lang].trim().length < minLength) {
        return {
          valid: false,
          message: `欄位必須包含${lang}版本，且至少包含 ${minLength} 個字符`,
        }
      }
    }

    return { valid: true }
  }

  /**
   * 驗證多語言欄位（根據欄位類型）
   * @param {Object} value - 多語言物件
   * @param {String} fieldType - 欄位類型如 'name', 'description'
   * @param {Array} requiredLanguages - 必須的語言
   * @param {Object} options - 額外選項
   * @returns {Object} 驗證結果
   */
  const validateFieldByType = (
    value,
    fieldType = 'name',
    requiredLanguages = [defaultLanguage],
    options = {},
  ) => {
    const { minLength = 2, maxLength = null } = options

    // 執行基本驗證
    const result = validateField(value, requiredLanguages, minLength)
    if (!result.valid) {
      // 自定義錯誤訊息
      if (result.message === '欄位為必填項') {
        return { valid: false, message: `${fieldType}為必填項` }
      }
      if (result.message.includes('欄位必須包含')) {
        return {
          valid: false,
          message: result.message.replace('欄位', fieldType),
        }
      }
      return result
    }

    // 額外驗證
    if (maxLength) {
      for (const lang of Object.keys(value)) {
        if (value[lang] && value[lang].length > maxLength) {
          return {
            valid: false,
            message: `${fieldType}的${lang}版本不能超過 ${maxLength} 個字符`,
          }
        }
      }
    }

    return { valid: true }
  }

  /**
   * 切換語言 (只在使用 languageStore 時可用)
   * @param {String} langCode - 語言代碼
   */
  const setLanguage = (langCode) => {
    if (useStore && languageStore) {
      languageStore.setLanguage(langCode)
    }
  }

  /**
   * 獲取多語言欄位的欄位名稱
   * @param {String} baseField - 基本欄位名稱（如 'name'）
   * @param {String} lang - 語言代碼（如 'TW'）
   * @returns {String} 多語言欄位名稱（如 'name_TW'）
   */
  const getFieldNameForLang = (baseField, lang = defaultLanguage) => {
    return `${baseField}_${lang}`
  }

  /**
   * 創建初始化的多語言表單數據
   * @param {Array} fields - 要處理的多語言欄位名稱數組
   * @returns {Object} 初始化表單數據
   */
  const createEmptyMultilingualForm = (fields = ['name']) => {
    const result = {}

    fields.forEach((field) => {
      supportedLanguages.forEach((lang) => {
        result[`${field}_${lang}`] = ''
      })
    })

    return result
  }

  return {
    // 核心屬性
    currentLang,
    supportedLanguages,
    defaultLanguage,

    // 核心功能
    getLocalizedField,
    toFormFormat,
    toApiFormat,
    validateField,
    validateFieldByType,
    getFieldNameForLang,
    createEmptyMultilingualForm,

    // 支援 languageStore 的功能
    setLanguage,

    // 提供向後兼容的別名
    parseApiData: toFormFormat,
    formatFormData: toApiFormat,
    formatToForm: toFormFormat,
    formatToApi: toApiFormat,
    validateMultilingualField: validateField,
  }
}
