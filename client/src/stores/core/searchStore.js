import { defineStore } from 'pinia'
import { useSeriesStore } from '../models/series'
import { useCategoriesStore } from '../models/categories'
import { useSubCategoriesStore } from '../models/subCategories'
import { useSpecificationsStore } from '../models/specifications'
import { useProductsStore } from '../models/products'

export const useSearchStore = defineStore('search', {
  state: () => ({
    isVisible: false, // 搜尋框可見性
    keyword: '', // 搜尋關鍵字
    isLoading: false, // 加載狀態
    error: null, // 錯誤信息
    results: {
      // 搜尋結果
      series: [],
      categories: [],
      subCategories: [],
      specifications: [],
      products: [],
    },
    activeTab: 'all', // 當前活動標籤 (all, series, categories, subCategories, specifications, products)
    recentSearches: [], // 最近搜尋紀錄
    maxRecentSearches: 5, // 最大搜尋紀錄數量
  }),

  getters: {
    // 獲取所有結果
    allResults: (state) => {
      return {
        series: state.results.series || [],
        categories: state.results.categories || [],
        subCategories: state.results.subCategories || [],
        specifications: state.results.specifications || [],
        products: state.results.products || [],
      }
    },

    // 獲取當前標籤的結果
    currentTabResults: (state) => {
      if (state.activeTab === 'all') {
        return state.allResults
      }
      return { [state.activeTab]: state.results[state.activeTab] || [] }
    },

    // 是否有結果
    hasResults: (state) => {
      return Object.values(state.results).some((array) => array && array.length > 0)
    },

    // 結果總數
    totalResults: (state) => {
      return Object.values(state.results).reduce(
        (total, array) => total + (array ? array.length : 0),
        0,
      )
    },
  },

  actions: {
    // 切換搜尋框的顯示狀態
    toggleSearch() {
      this.isVisible = !this.isVisible
      if (this.isVisible) {
        // 設置焦點到搜尋框
        setTimeout(() => {
          const searchInput = document.getElementById('global-search-input')
          if (searchInput) searchInput.focus()
        }, 100)
      }
    },

    // 關閉搜尋框
    closeSearch() {
      this.isVisible = false
      this.keyword = ''
      this.results = {
        series: [],
        categories: [],
        subCategories: [],
        specifications: [],
        products: [],
      }
    },

    // 設置活動標籤
    setActiveTab(tab) {
      this.activeTab = tab
    },

    // 添加到最近搜尋
    addToRecentSearches(keyword) {
      if (!keyword || keyword.trim() === '') return

      // 去重
      this.recentSearches = this.recentSearches.filter(
        (item) => item.toLowerCase() !== keyword.toLowerCase(),
      )

      // 新增到開頭
      this.recentSearches.unshift(keyword)

      // 限制數量
      if (this.recentSearches.length > this.maxRecentSearches) {
        this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches)
      }

      // 保存到 localStorage
      localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches))
    },

    // 載入最近搜尋紀錄
    loadRecentSearches() {
      try {
        const saved = localStorage.getItem('recentSearches')
        if (saved) {
          this.recentSearches = JSON.parse(saved)
        }
      } catch (error) {
        console.error('無法載入最近搜尋紀錄:', error)
      }
    },

    // 清除最近搜尋紀錄
    clearRecentSearches() {
      this.recentSearches = []
      localStorage.removeItem('recentSearches')
    },

    // 全局搜尋
    async search(keyword = this.keyword) {
      if (!keyword || keyword.trim() === '') return

      this.keyword = keyword
      this.isLoading = true
      this.error = null

      try {
        // 添加到最近搜尋
        this.addToRecentSearches(keyword)

        // 同時搜尋所有實體類型
        const seriesStore = useSeriesStore()
        const categoriesStore = useCategoriesStore()
        const subCategoriesStore = useSubCategoriesStore()
        const specificationsStore = useSpecificationsStore()
        const productsStore = useProductsStore()

        // 並行執行所有搜尋
        const [series, categories, subCategories, specifications, products] = await Promise.all([
          seriesStore.search(keyword).catch(() => []),
          categoriesStore.search(keyword).catch(() => []),
          subCategoriesStore.search(keyword).catch(() => []),
          specificationsStore.search(keyword).catch(() => []),
          productsStore.searchProducts(keyword).catch(() => []),
        ])

        // 更新結果
        this.results = {
          series,
          categories,
          subCategories,
          specifications,
          products,
        }

        return this.results
      } catch (error) {
        console.error('搜尋過程出錯:', error)
        this.error = error.message || '搜尋時發生錯誤'
        return null
      } finally {
        this.isLoading = false
      }
    },
  },
})
