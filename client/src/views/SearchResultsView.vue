<template>
  <div class="search-results-view">
    <!-- 頂部系列切換組件（保留，以便用戶可以切換系列） -->
    <SeriesSwitch
      :current-series="currentSeries"
      :is-loading="seriesStore.isLoading"
      :available-series="seriesStore.items"
      @change-series="changeSeries"
    />

    <!-- 搜尋結果標題 -->
    <div class="container mx-auto py-[24px] lg:py-[48px]">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-[24px] lg:text-[36px] theme-text mb-2">
            <span v-if="searchKeyword">搜尋結果：{{ searchKeyword }}</span>
            <span v-else>搜尋結果</span>
          </h2>
          <p v-if="searchKeyword && productsList.length > 0" class="theme-text-secondary">
            找到 {{ productsList.length }} 個產品
          </p>
        </div>
        <button
          @click="goBack"
          class="px-4 py-2 rounded-lg transition-colors"
          :class="
            conditionalClass(
              'bg-gray-700 hover:bg-gray-600 text-white',
              'bg-slate-200 hover:bg-slate-300 text-slate-700',
            )
          "
        >
          返回
        </button>
      </div>

      <!-- 載入中 -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div
          class="animate-spin inline-block w-12 h-12 border-4 rounded-full"
          :class="
            conditionalClass(
              'border-gray-300 border-t-blue-500',
              'border-slate-200 border-t-blue-500',
            )
          "
        ></div>
        <span class="ml-4 theme-text">搜尋中...</span>
      </div>

      <!-- 無結果 -->
      <div v-else-if="!isLoading && productsList.length === 0" class="text-center py-16">
        <svg
          class="w-16 h-16 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          :class="conditionalClass('text-gray-400', 'text-slate-400')"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p class="theme-text-secondary text-lg">
          <span v-if="searchKeyword">找不到與「{{ searchKeyword }}」相關的產品</span>
          <span v-else>請輸入搜尋關鍵字</span>
        </p>
      </div>

      <!-- 搜尋結果表格 -->
      <SearchProductTable
        v-else
        :products="productsList"
        :search-keyword="searchKeyword"
        @product-clicked="handleProductClick"
        @product-deleted="handleProductDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/core/searchStore'
import { useSeriesStore } from '@/stores/models/series'
import { useThemeClass } from '@/composables/useThemeClass'
import SeriesSwitch from '@/components/products/SeriesSwitch.vue'
import SearchProductTable from '@/components/products/SearchProductTable.vue'

const route = useRoute()
const router = useRouter()
const searchStore = useSearchStore()
const seriesStore = useSeriesStore()
const { conditionalClass } = useThemeClass()

// 從路由查詢參數獲取搜尋關鍵字
const searchKeyword = computed(() => route.query.q || '')

// 搜尋結果 - 直接使用 store 的結果（已經是響應式的）
const searchResults = computed(() => searchStore.results)
const isLoading = computed(() => searchStore.isLoading)

// 產品列表（用於傳遞給表格組件）- 直接使用 store 的響應式數據
const productsList = computed(() => {
  // 直接從 searchStore 獲取，確保響應式追蹤
  return Array.isArray(searchStore.results.products) ? searchStore.results.products : []
})

// 當前系列（用於系列切換組件）
const currentSeries = computed(() => {
  // 如果搜尋結果中有產品，使用第一個產品的系列
  if (productsList.value && productsList.value.length > 0) {
    const firstProduct = productsList.value[0]
    const seriesId = firstProduct.series?._id || firstProduct.series
    if (seriesId && seriesStore.items.length > 0) {
      const series = seriesStore.items.find((s) => s._id === seriesId)
      return series?.code || 'default'
    }
  }
  return 'default'
})

// 載入系列列表
onMounted(async () => {
  if (seriesStore.items.length === 0) {
    await seriesStore.fetchAll()
  }

  // 如果有搜尋關鍵字但沒有搜尋結果，執行搜尋
  if (searchKeyword.value && productsList.value.length === 0 && !isLoading.value) {
    await searchStore.search(searchKeyword.value)
  }
})

// 監聽路由查詢參數變化
watch(
  () => route.query.q,
  async (newKeyword) => {
    if (newKeyword && newKeyword.trim()) {
      await searchStore.search(newKeyword.trim())
    } else {
      // 清空搜尋結果 - 確保響應式更新
      searchStore.results.series = []
      searchStore.results.categories = []
      searchStore.results.subCategories = []
      searchStore.results.specifications = []
      searchStore.results.products = []
    }
  },
  { immediate: true },
)

// 切換系列
function changeSeries(seriesCode) {
  router.push({ name: 'series-category', params: { seriesCode } })
}

// 返回上一頁
function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push({ name: 'home' })
  }
}

// 處理產品點擊（導航到對應的系列頁面）
async function handleProductClick(product) {
  const seriesId = product.series?._id || product.series
  if (seriesId) {
    if (seriesStore.items.length === 0) {
      await seriesStore.fetchAll()
    }
    const series = seriesStore.items.find((s) => s._id === seriesId)
    if (series) {
      router.push({ name: 'series-category', params: { seriesCode: series.code } })
    }
  }
}

// 處理產品刪除
function handleProductDelete(deletedProduct) {
  // 從搜尋結果中移除已刪除的產品
  if (searchStore.results.products) {
    const index = searchStore.results.products.findIndex((p) => p._id === deletedProduct._id)
    if (index > -1) {
      searchStore.results.products.splice(index, 1)
    }
  }
}
</script>

<style scoped>
.search-results-view {
  min-height: 100vh;
  width: 100%;
}
</style>
