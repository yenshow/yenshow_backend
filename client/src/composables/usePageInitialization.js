/**
 * 統一的頁面初始化管理 Composable
 * 
 * 功能：
 * 1. 自動管理 isInitialized 狀態
 * 2. 整合 useLoading 的智能時間管理
 * 3. 支持關鍵/非關鍵資料分離
 * 4. 統一的錯誤處理
 * 
 * 使用範例：
 * ```js
 * import { usePageInitialization } from '@/composables/usePageInitialization'
 * 
 * const { loading, initialize, loadNonCriticalBatch } = usePageInitialization()
 * 
 * onMounted(async () => {
 *   // 初始化關鍵資料（阻塞顯示）
 *   await initialize(async () => {
 *     await fetchData()
 *   })
 * 
 *   // 載入非關鍵資料（不阻塞顯示）
 *   loadNonCriticalBatch([
 *     async () => await loadCategories(),
 *     async () => await loadAllNews(),
 *   ])
 * })
 * 
 * // 模板中使用
 * <LoadingSpinner v-if="loading" />
 * ```
 */
import { ref, computed } from 'vue'
import { useLoading } from './useLoading'

export function usePageInitialization(options = {}) {
  const {
    // 是否使用智能時間管理（默認 true）
    useSmartTiming = true,
    // 是否在初始化前顯示 loading（默認 true）
    showLoadingBeforeInit = true,
    // 自訂時間設定
    delayShow = 200,
    minDisplay = 200,
  } = options

  // 使用 useLoading 進行智能時間管理
  const loadingManager = useLoading(!showLoadingBeforeInit, {
    delayShow,
    minDisplay,
  })

  const isInitialized = ref(false)

  // 統一的 loading 狀態（結合 isInitialized 和 loadingManager）
  const loading = computed(() => {
    // 如果尚未初始化，顯示 loading
    if (!isInitialized.value) {
      return true
    }
    // 已初始化後，使用 loadingManager 的狀態
    return useSmartTiming
      ? loadingManager.visible.value
      : loadingManager.loading.value
  })

  /**
   * 初始化函數（處理關鍵資料）
   * @param {Function} criticalDataLoader - 載入關鍵資料的異步函數
   */
  const initialize = async (criticalDataLoader) => {
    if (isInitialized.value) {
      console.warn('頁面已經初始化，跳過重複初始化')
      return
    }

    try {
      await loadingManager.withLoading(async () => {
        await criticalDataLoader()
      })
      isInitialized.value = true
    } catch (error) {
      console.error('頁面初始化失敗:', error)
      throw error
    }
  }

  /**
   * 批量載入非關鍵資料（並行，不阻塞顯示）
   * @param {Array<Function>} loaders - 載入函數陣列
   */
  const loadNonCriticalBatch = (loaders) => {
    Promise.all(
      loaders.map((loader) =>
        Promise.resolve(loader()).catch((error) => {
          console.warn('載入非關鍵資料失敗:', error)
        }),
      ),
    )
  }

  return {
    // 狀態
    loading, // 統一的 loading 狀態（用於模板）

    // 方法
    initialize, // 初始化關鍵資料
    loadNonCriticalBatch, // 批量載入非關鍵資料
    withLoading: loadingManager.withLoading, // 包裝異步操作，用於後續操作
  }
}

