import { useToast } from 'vue-toastification'
import { defineStore } from 'pinia'

// 使用 Pinia 建立中央通知儲存庫
export const useNotificationStore = defineStore('notification', () => {
  // === Toast 核心功能 ===

  // 基礎通知函數
  function notify(message, type = 'success', options = {}) {
    const toast = useToast()
    const defaultOptions = {
      timeout: 3000,
      closeOnClick: true,
      pauseOnHover: true,
    }

    const mergedOptions = { ...defaultOptions, ...options }
    toast[type](message, mergedOptions)
  }

  // 成功通知
  function notifySuccess(message, options = {}) {
    notify(message, 'success', options)
  }

  // 錯誤通知
  function notifyError(message, options = {}) {
    notify(message, 'error', { timeout: 5000, ...options })
  }

  // 信息通知
  function notifyInfo(message, options = {}) {
    notify(message, 'info', options)
  }

  // 警告通知
  function notifyWarning(message, options = {}) {
    notify(message, 'warning', { timeout: 4000, ...options })
  }

  // === 錯誤處理功能 ===

  /**
   * 處理 API 錯誤
   * @param {Error} error - 錯誤對象
   * @param {Object} options - 設定選項
   * @returns {string} 處理後的錯誤訊息
   */
  function handleApiError(error, options = {}) {
    const { showToast = true, defaultMessage = '操作失敗，請稍後再試', timeout = 5000 } = options

    let errorMessage = defaultMessage
    let errorDetails = null

    // 解析錯誤訊息
    if (error.response) {
      // 來自後端的錯誤響應
      const { data, status } = error.response

      // 如果後端返回了錯誤訊息，優先使用
      if (data && data.message) {
        errorMessage = data.message
      } else if (data && data.error) {
        errorMessage = data.error
      }

      // 收集錯誤詳情
      if (data && data.details) {
        errorDetails = data.details
      }

      // 特殊狀態碼處理
      if (status === 401 && !window.location.pathname.includes('/login')) {
        errorMessage = '您的登入已過期，請重新登入'
        // 可以在這裡添加重定向到登錄頁的邏輯
      } else if (status === 403) {
        errorMessage = '您沒有權限執行此操作'
      } else if (status === 404) {
        errorMessage = '請求的資源不存在'
      } else if (status === 422 && data.errors) {
        // 處理驗證錯誤
        errorMessage = '表單驗證失敗'
        errorDetails = data.errors
      }
    } else if (error.request) {
      // 請求已發送但沒有收到響應
      errorMessage = '無法連接到伺服器，請檢查您的網絡連接'
    } else if (error.message) {
      // 其他錯誤
      errorMessage = error.message
    }

    // 顯示通知
    if (showToast) {
      notifyError(errorMessage, { timeout })
    }

    // 返回處理後的錯誤訊息和詳情，供進一步處理
    return {
      message: errorMessage,
      details: errorDetails,
    }
  }

  /**
   * 處理表單驗證錯誤
   * @param {Object} validationErrors - 驗證錯誤對象
   * @param {Object} options - 選項
   * @returns {Object} 格式化後的錯誤訊息
   */
  function handleValidationErrors(validationErrors, options = {}) {
    const { showToast = true } = options
    const errors = {}
    let firstError = null

    // 處理後端返回的驗證錯誤
    if (typeof validationErrors === 'object' && validationErrors !== null) {
      Object.keys(validationErrors).forEach((field) => {
        errors[field] = Array.isArray(validationErrors[field])
          ? validationErrors[field][0]
          : validationErrors[field]

        if (!firstError) {
          firstError = errors[field]
        }
      })
    }

    // 如果有錯誤且需要顯示通知
    if (firstError && showToast) {
      notifyError(firstError)
    }

    return errors
  }

  return {
    // 基本通知方法
    notify,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,

    // 錯誤處理方法
    handleApiError,
    handleValidationErrors,
  }
})

// 為了方便在組件外使用
export function useNotifications() {
  return useNotificationStore()
}
