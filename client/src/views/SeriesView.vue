<template>
  <div class="series-view-container">
    <!-- 頂部系列切換組件 -->
    <SeriesSwitch
      :current-series="currentSeries"
      :is-loading="seriesStore.isLoading || hierarchyStore.isLoading"
      :available-series="seriesStore.items"
      @change-series="changeSeries"
      @refresh-data="loadDataForCurrentSeries"
    />

    <!-- 錯誤提示 -->
    <div
      v-if="errorMessage || hierarchyStore.error"
      class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded m-4"
    >
      {{ errorMessage || hierarchyStore.error }}
    </div>

    <!-- 載入中提示 (層級數據) -->
    <div v-if="isChildLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <span class="ml-3">正在載入分類資料...</span>
    </div>

    <!-- 主內容區域 (渲染 CategoryBlock) -->
    <router-view
      v-else
      :key="currentSeries"
      :categories-data="categoriesDataForChild"
      @refresh-hierarchy="loadDataForCurrentSeries"
    />
  </div>
</template>

<style scoped>
.series-view-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/models/series'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import { useNotifications } from '@/composables/notificationCenter'
import SeriesSwitch from '@/components/products/SeriesSwitch.vue'

// =====================================================
// Initialization
// =====================================================
const seriesStore = useSeriesStore()
const hierarchyStore = useHierarchyStore()
const route = useRoute()
const router = useRouter()
const notifications = useNotifications()

// =====================================================
// Local State
// =====================================================
const errorMessage = ref('')
const seriesHierarchyData = ref(null)

// =====================================================
// Computed Properties
// =====================================================

// Get current series code from route params
const currentSeries = computed(() => {
  return route.params.seriesCode || 'default'
})

const categoriesDataForChild = computed(() => {
  return seriesHierarchyData.value?.categories || []
})

const isChildLoading = computed(() => {
  return hierarchyStore.isLoading || !seriesHierarchyData.value
})

// =====================================================
// Core Methods
// =====================================================

const loadDataForCurrentSeries = async () => {
  errorMessage.value = ''
  seriesHierarchyData.value = null

  try {
    if (!seriesStore.items || seriesStore.items.length === 0) {
      await seriesStore.fetchAll()
    }

    const availableSeries = seriesStore.items || []
    if (!availableSeries.length) {
      throw new Error('無法獲取系列列表資料')
    }

    const currentSeriesData = availableSeries.find((s) => s.code === currentSeries.value)

    if (!currentSeriesData) {
      if (availableSeries.length > 0) {
        const firstSeriesCode = availableSeries[0].code
        if (route.params.seriesCode !== firstSeriesCode) {
          router.replace({ name: 'series-category', params: { seriesCode: firstSeriesCode } })
        }
      } else {
        errorMessage.value = '沒有可用的系列'
      }
      return
    }

    const hierarchyResult = await hierarchyStore.fetchSubHierarchy(
      'series',
      currentSeriesData._id,
      { includeDetail: true, maxDepth: 4 },
    )

    if (hierarchyResult) {
      seriesHierarchyData.value = hierarchyResult
    } else {
      seriesHierarchyData.value = { ...currentSeriesData, categories: [] }
    }
  } catch (error) {
    notifications.handleApiError(error, {
      showToast: true,
      defaultMessage: '載入系列資料時發生錯誤',
    })
    errorMessage.value = error.message || '載入系列資料時發生未知錯誤'
    seriesHierarchyData.value = null
  }
}

function changeSeries(seriesCode) {
  if (seriesCode !== currentSeries.value) {
    seriesHierarchyData.value = null
    router.push({ name: 'series-category', params: { seriesCode } })
  }
}

// =====================================================
// Watchers
// =====================================================

watch(
  () => route.params.seriesCode,
  (newSeriesCode, oldSeriesCode) => {
    if (newSeriesCode && newSeriesCode !== oldSeriesCode) {
      loadDataForCurrentSeries()
    }
  },
  { immediate: true },
)
</script>
