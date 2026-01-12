/**
 * 統一的載入狀態管理 Composable（優化版）
 * 
 * 包含智能時間管理：
 * - 延遲顯示：如果載入很快（< 200ms），不顯示載入狀態
 * - 最小顯示時間：如果顯示了，至少顯示 200ms，避免閃爍
 * 
 * 使用範例：
 * ```js
 * const { loading, visible, withLoading, setLoading } = useLoading()
 * 
 * // 方式1：使用 withLoading 包裝異步操作（推薦）
 * await withLoading(async () => {
 *   await fetchData()
 * })
 * 
 * // 方式2：手動控制
 * setLoading(true)
 * try {
 *   await fetchData()
 * } finally {
 *   setLoading(false)
 * }
 * 
 * // 模板中使用 visible（智能時間管理）
 * <LoadingSpinner v-if="visible" />
 * ```
 */
import { ref } from 'vue'

// UX 最佳實踐時間設定
const DELAY_SHOW = 200 // 延遲顯示時間（ms）：如果載入很快就不顯示
const MIN_DISPLAY = 200 // 最小顯示時間（ms）：避免快速閃現

export function useLoading(initialValue = false, options = {}) {
  const {
    delayShow = DELAY_SHOW, // 延遲顯示時間
    minDisplay = MIN_DISPLAY, // 最小顯示時間
  } = options

  const loading = ref(initialValue)
  const visible = ref(false) // 實際顯示狀態（考慮延遲和最小時間）

  let delayTimer = null
  let minDisplayTimer = null
  let startTime = null

  /**
   * 設置載入狀態（智能時間管理）
   * @param {boolean} value - 載入狀態
   */
  const setLoading = (value) => {
    loading.value = value

    if (value) {
      // 開始載入：延遲顯示
      startTime = Date.now()
      clearTimeout(delayTimer)
      delayTimer = setTimeout(() => {
        if (loading.value) {
          visible.value = true
        }
      }, delayShow)
    } else {
      // 停止載入：確保最小顯示時間
      const elapsed = startTime ? Date.now() - startTime : 0
      const remaining = Math.max(0, minDisplay - elapsed)

      clearTimeout(delayTimer)
      clearTimeout(minDisplayTimer)

      if (visible.value) {
        // 如果已經顯示，確保最小顯示時間
        minDisplayTimer = setTimeout(() => {
          visible.value = false
          startTime = null
        }, remaining)
      } else {
        // 如果還沒顯示，直接隱藏
        visible.value = false
        startTime = null
      }
    }
  }


  /**
   * 包裝異步操作，自動管理載入狀態（智能時間管理）
   * @param {Function} asyncFn - 異步函數
   * @param {Object} options - 選項
   * @param {Function} options.onError - 錯誤處理函數
   * @param {Function} options.onFinally - 最終處理函數
   * @returns {Promise} 異步操作的結果
   */
  const withLoading = async (asyncFn, options = {}) => {
    const { onError, onFinally } = options

    setLoading(true)
    try {
      const result = await asyncFn()
      return result
    } catch (error) {
      if (onError) {
        onError(error)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
      if (onFinally) {
        onFinally()
      }
    }
  }


  return {
    loading, // 原始載入狀態
    visible, // 實際顯示狀態（考慮時間管理）
    setLoading,
    withLoading,
  }
}

