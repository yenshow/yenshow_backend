import { ref, reactive, computed } from 'vue'
import { useLanguage } from './useLanguage'

export function useFormValidation() {
  const errors = reactive({})
  const isSubmitting = ref(false)
  const { validateField, validateFieldByType } = useLanguage()

  /**
   * 驗證必填項
   * @param {any} value - 要驗證的值
   * @param {String} fieldName - 欄位名稱（用於錯誤訊息）
   * @returns {Object} 驗證結果 {valid, message}
   */
  const validateRequired = (value, fieldName = '此欄位') => {
    if (value === undefined || value === null || value === '') {
      return {
        valid: false,
        message: `${fieldName}為必填項`,
      }
    }

    if (Array.isArray(value) && value.length === 0) {
      return {
        valid: false,
        message: `${fieldName}為必填項`,
      }
    }

    return { valid: true }
  }

  /**
   * 驗證多語言欄位
   * @param {Object} multilingualObject - 多語言物件 {TW: '值', EN: '值'}
   * @param {String} fieldName - 欄位顯示名稱
   * @param {Array} requiredLanguages - 必須的語言
   * @param {Number} minLength - 最小長度
   * @returns {Object} 驗證結果 {valid, message}
   */
  const validateMultilingual = (
    multilingualObject,
    fieldName = '此欄位',
    requiredLanguages = ['TW'],
    minLength = 2,
  ) => {
    // 使用 useLanguage 中的通用驗證函數
    const result = validateField(multilingualObject, requiredLanguages, minLength)

    // 自定義錯誤訊息
    if (!result.valid) {
      return {
        valid: false,
        message: result.message.replace('欄位', fieldName),
      }
    }

    return result
  }

  /**
   * 驗證多語言名稱（使用通用多語言驗證函數）
   * @param {Array} name - 多語言名稱陣列
   * @param {Array} requiredLanguages - 必須的語言
   * @param {Number} minLength - 最小長度
   * @returns {Object} 驗證結果 {valid, message}
   */
  const validateMultilingualName = (name, requiredLanguages = ['TW'], minLength = 2) => {
    // 委託給型別化驗證
    return validateFieldByType(name, 'name', requiredLanguages, { minLength })
  }

  /**
   * 驗證多語言欄位（統一入口，支援不同欄位類型）
   * @param {Array} value - 多語言陣列
   * @param {String} fieldType - 欄位類型 ('name', 'description', 等)
   * @param {Array} requiredLanguages - 必須的語言
   * @param {Object} options - 驗證選項
   * @returns {Object} 驗證結果 {valid, message}
   */
  const validateMultilingualByType = (
    value,
    fieldType = 'name',
    requiredLanguages = ['TW'],
    options = {},
  ) => {
    // 直接使用增強版的 useLanguage.validateFieldByType
    return validateFieldByType(value, fieldType, requiredLanguages, options)
  }

  /**
   * 驗證代碼
   * @param {String} code - 代碼
   * @param {Number} minLength - 最小長度
   * @returns {Object} 驗證結果 {valid, message}
   */
  const validateCode = (code, minLength = 2) => {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        message: '代碼為必填項',
      }
    }

    if (code.trim().length < minLength) {
      return {
        valid: false,
        message: `代碼必須至少包含 ${minLength} 個字符`,
      }
    }

    return { valid: true }
  }

  /**
   * 清除所有錯誤
   */
  const clearErrors = () => {
    Object.keys(errors).forEach((key) => {
      delete errors[key]
    })
  }

  /**
   * 設置錯誤
   * @param {String} field - 欄位名稱
   * @param {String} message - 錯誤訊息
   */
  const setError = (field, message) => {
    errors[field] = message
  }

  /**
   * 從後端錯誤響應設置表單錯誤
   * @param {Object} errorResponse - 後端錯誤響應
   */
  const setErrorsFromResponse = (errorResponse) => {
    clearErrors()

    if (errorResponse && errorResponse.details) {
      Object.entries(errorResponse.details).forEach(([field, message]) => {
        setError(field, Array.isArray(message) ? message[0] : message)
      })
    }
  }

  /**
   * 檢查是否有錯誤
   */
  const hasErrors = computed(() => Object.keys(errors).length > 0)

  /**
   * 執行一組驗證並收集錯誤
   * @param {Array} validations - 驗證數組，每項包含 {field, validate}
   * @returns {Boolean} 是否全部通過驗證
   */
  const runValidations = (validations) => {
    clearErrors()
    let isValid = true

    validations.forEach(({ field, validate }) => {
      const result = validate()
      if (!result.valid) {
        setError(field, result.message)
        isValid = false
      }
    })

    return isValid
  }

  return {
    // 狀態
    errors,
    isSubmitting,
    hasErrors,

    // 驗證方法
    validateMultilingual,
    validateMultilingualName,
    validateMultilingualByType,
    validateCode,
    validateRequired,

    // 錯誤處理
    clearErrors,
    setError,
    setErrorsFromResponse,
    runValidations,
  }
}
