import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/core/searchStore'
import { useLanguageStore } from '@/stores/core/languageStore'
import { useSeriesStore } from '@/stores/models/series'

export function useGlobalSearch() {
  const searchStore = useSearchStore()
  const languageStore = useLanguageStore()
  const router = useRouter()
  const seriesStore = useSeriesStore()

  // 本地輸入關鍵字，用於防抖處理
  const inputKeyword = ref('')

  // 搜尋結果統計
  const resultCounts = computed(() => {
    return {
      series: searchStore.results.series?.length || 0,
      categories: searchStore.results.categories?.length || 0,
      subCategories: searchStore.results.subCategories?.length || 0,
      specifications: searchStore.results.specifications?.length || 0,
      products: searchStore.results.products?.length || 0,
      total: searchStore.totalResults,
    }
  })

  // 實體類型對應的中文名稱
  const entityTypeNames = {
    series: '系列',
    categories: '分類',
    subCategories: '子分類',
    specifications: '規格',
    products: '產品',
  }

  // 獲取實體的本地化名稱
  function getEntityName(entity) {
    if (!entity) return ''
    return languageStore.getLocalizedField(entity, 'name')
  }

  // 搜尋函數
  async function performSearch(keyword = inputKeyword.value) {
    if (!keyword || keyword.trim() === '') return

    inputKeyword.value = keyword
    await searchStore.search(keyword)
  }

  // 防抖搜尋，延遲 300ms
  let searchTimeout = null
  function debouncedSearch(keyword) {
    inputKeyword.value = keyword

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(() => {
      performSearch(keyword)
    }, 300)
  }

  // 點擊搜尋結果進行導航
  async function navigateToResult(entityType, item) {
    closeSearch()
    if (!item || !item._id) return

    try {
      let seriesCode = null

      if (entityType === 'series') {
        seriesCode = item.code
      } else {
        const seriesId = item.series?._id || item.series
        if (seriesId) {
          if (seriesStore.items.length === 0) {
            await seriesStore.fetchAll()
          }
          const series = seriesStore.items.find((s) => s._id === seriesId)
          seriesCode = series?.code
        }
      }

      if (seriesCode) {
        router.push({ name: 'series-category', params: { seriesCode } })
      } else {
        console.warn(`無法確定 '${getEntityName(item)}' 的系列, 導航失敗. Entity: ${entityType}`)
      }
    } catch (error) {
      console.error('導航到搜尋結果時發生錯誤:', error)
    }
  }

  // 清空搜尋
  function clearSearch() {
    inputKeyword.value = ''
    searchStore.closeSearch()
  }

  // 載入最近搜尋
  function loadRecentSearches() {
    searchStore.loadRecentSearches()
  }

  // 初始化
  loadRecentSearches()

  // 修改 closeSearch 函數
  function closeSearch() {
    inputKeyword.value = ''
    searchStore.closeSearch()
  }

  return {
    // 狀態
    isVisible: computed(() => searchStore.isVisible),
    isLoading: computed(() => searchStore.isLoading),
    keyword: inputKeyword,
    activeTab: computed(() => searchStore.activeTab),

    // 結果
    results: computed(() => searchStore.results),
    resultCounts,
    hasResults: computed(() => searchStore.hasResults),
    currentTabResults: computed(() => searchStore.currentTabResults),
    recentSearches: computed(() => searchStore.recentSearches),

    // 工具函數
    toggleSearch: () => searchStore.toggleSearch(),
    closeSearch,
    setActiveTab: (tab) => searchStore.setActiveTab(tab),
    search: performSearch,
    debouncedSearch,
    navigateToResult,
    clearSearch,
    getEntityName,
    entityTypeNames,
    clearRecentSearches: () => searchStore.clearRecentSearches(),
  }
}
