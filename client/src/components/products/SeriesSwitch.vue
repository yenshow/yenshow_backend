<template>
  <div class="series-switch">
    <!-- 系列導航區域 -->
    <nav
      class="flex justify-center items-center"
      :class="conditionalClass('bg-[#1e293b]', 'bg-white border-b border-slate-200')"
    >
      <!-- 系列按鈕 -->
      <div class="flex items-center space-x-4 overflow-x-auto">
        <button
          v-for="series in availableSeries"
          :key="series.code"
          @click="handleSeriesChange(series.code)"
          :disabled="isLoading"
          :class="[
            'p-[12px] text-[16px] lg:text-[24px] whitespace-nowrap',
            'border-b-2 transition-colors duration-200',
            selectedSeries === series.code
              ? isDarkTheme
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkTheme
                ? 'border-transparent text-gray-400 hover:text-gray-200'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          {{ getLocalizedField(series, 'name', '未命名系列') }}
          <span v-if="isLoading && selectedSeries === series.code" class="ml-2">
            <svg class="animate-spin h-4 w-4 inline" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
          </span>
        </button>
      </div>

      <!-- 管理類別按鈕 -->
      <button
        type="button"
        @click="handleSeriesButton"
        class="mx-[12px] lg:mx-[16px] px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer transition-colors duration-200"
        :class="
          isDarkTheme
            ? 'hover:bg-[#2a323c] border-2 border-[#3F5069] text-white'
            : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
        "
      >
        <span class="text-[12px] lg:text-[16px]">管理類別</span>
        <svg
          class="w-[16px] lg:w-[24px] aspect-square"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          ></path>
        </svg>
      </button>
    </nav>

    <!-- 使用通用多語言表單對話框 -->
    <MultilingualFormDialog
      v-model="showCategoryModal"
      title="管理類別"
      item-label="類別"
      item-label-en="categories"
      model-type="categories"
      :parent-id="getSelectedSeries?._id || ''"
      parent-field="series"
      @submit-success="handleCategorySubmitSuccess"
      @refresh-data="$emit('refresh-data')"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSeriesStore } from '@/stores/models/series'
import { useLanguage } from '@/composables/useLanguage'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import MultilingualFormDialog from '@/components/products/MultilingualFormDialog.vue'

// 定義 props 和 emits
const props = defineProps({
  currentSeries: {
    type: String,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  availableSeries: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['change-series', 'refresh-data'])

// 初始化 stores 和工具
const seriesStore = useSeriesStore()
const { getLocalizedField } = useLanguage()
const notifications = useNotifications()
const { isDarkTheme, conditionalClass } = useThemeClass()

// 基本狀態
const selectedSeries = ref(props.currentSeries)
const showCategoryModal = ref(false)

// 計算屬性：可用系列列表(如果prop未提供，則從store獲取)
const availableSeries = computed(() => {
  return props.availableSeries.length > 0 ? props.availableSeries : seriesStore.items || []
})

// 計算屬性：獲取當前選擇的系列
const getSelectedSeries = computed(() => {
  return availableSeries.value.find((s) => s.code === selectedSeries.value) || null
})

// 處理系列變更
function handleSeriesChange(seriesCode) {
  selectedSeries.value = seriesCode
  emit('change-series', seriesCode)
}

// 處理系列管理按鈕點擊
function handleSeriesButton() {
  if (getSelectedSeries.value) {
    showCategoryModal.value = true
  }
}

// 處理類別提交成功
function handleCategorySubmitSuccess(result) {
  if (!result) return

  // 使用統一的刷新機制
  notifications.refreshAfterAction(result.isNew ? 'create' : 'update', 'categories', {
    name: result.item?.name || '',
  })

  // 觸發資料刷新
  emit('refresh-data')
}

// 監聽 props 變化
watch(
  () => props.currentSeries,
  (newValue) => {
    selectedSeries.value = newValue
  },
)
</script>
