<template>
  <div ref="tableTopRef" class="min-h-[300px]">
    <!-- 表頭 -->
    <div
      class="grid grid-cols-5 justify-items-center items-center py-3 text-center text-[12px] lg:text-[16px] rounded-t-lg"
      :class="
        conditionalClass(
          'bg-[#1e293b] border-b border-white/30',
          'bg-slate-100 border-b border-slate-300 text-slate-700 font-medium',
        )
      "
    >
      <div class="px-4 lg:px-6">產品</div>
      <div class="px-4 lg:px-6">子分類</div>
      <div class="px-4 lg:px-6">資料狀態</div>
      <div class="px-4 lg:px-6 flex justify-center gap-[8px] lg:gap-[12px]">上架</div>
      <div
        class="px-4 lg:px-6 flex justify-center gap-[8px] lg:gap-[12px] relative"
        ref="sortDropdownRef"
      >
        <button
          @click="toggleSortDropdown"
          class="flex items-center gap-2 px-4 py-2 rounded-[10px] transition-colors"
          :class="
            conditionalClass(
              'border-2 border-[#3F5069] hover:bg-[#3a434c]',
              'border-2 border-slate-300 bg-white hover:bg-slate-50',
            )
          "
        >
          <span>{{ currentSortLabel }}</span>
          <svg
            class="w-5 h-5 transition-transform"
            :class="{ 'rotate-180': isSortDropdownOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div
          v-if="isSortDropdownOpen"
          class="absolute top-full right-0 z-50 mt-2 min-w-[160px] rounded-[10px] shadow-lg max-h-[300px] overflow-y-auto space-y-1"
          :class="
            conditionalClass(
              'bg-[#1e293b] border border-[#3F5069]',
              'bg-white border border-slate-200',
            )
          "
        >
          <button
            v-for="option in sortOptions"
            :key="option.label"
            @click="setSort(option.value)"
            class="w-full px-4 py-2 text-left flex justify-between items-center gap-2 transition-colors"
            :class="conditionalClass('hover:bg-[#3a434c]', 'hover:bg-slate-100')"
          >
            <span>{{ option.label }}</span>
            <span
              v-if="
                currentSort.field === option.value.field && currentSort.order === option.value.order
              "
              class="text-blue-400"
              >✓</span
            >
          </button>
        </div>
      </div>
    </div>

    <!-- 產品列表 -->
    <div
      v-if="!filteredProducts || filteredProducts.length === 0"
      class="p-8 text-center h-[200px] flex justify-center items-center"
      :class="conditionalClass('text-gray-400', 'text-slate-500')"
    >
      <div>
        <svg
          class="w-12 h-12 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          :class="conditionalClass('text-gray-400', 'text-slate-400')"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <p class="mt-2">沒有找到相關產品</p>
      </div>
    </div>
    <div v-else :class="conditionalClass('divide-y divide-white/30', 'divide-y divide-slate-200')">
      <div
        v-for="(product, index) in displayedProducts"
        :key="product._id || index"
        class="grid grid-cols-5 justify-items-center items-center py-3 group"
      >
        <!-- 產品欄 -->
        <div class="flex items-center w-full px-4 lg:px-6 justify-start">
          <img
            :src="
              product?.images && product.images.length > 0 ? product.images[0] : '/placeholder.jpg'
            "
            alt="產品圖片"
            class="w-[48px] h-[48px] mr-3 object-contain rounded-md flex-shrink-0"
            @error="handleImageError($event)"
          />
          <span class="truncate theme-text">{{ formatProductModel(product) }}</span>
        </div>

        <!-- 子分類欄 (顯示產品名稱) -->
        <div class="truncate theme-text px-4 lg:px-6 text-left w-full">
          {{ getLocalizedField(product, 'name', '未命名產品', 'TW') }}
        </div>

        <!-- 資料狀態欄 -->
        <div class="w-full px-4 lg:px-6 flex justify-between theme-text-secondary">
          <span
            :title="
              '描述: ' +
              (product.description && (product.description.TW || product.description.EN)
                ? '✓'
                : '✗')
            "
            :class="
              product.description && (product.description.TW || product.description.EN)
                ? 'text-green-500'
                : 'text-red-500'
            "
          >
            描述{{
              product.description && (product.description.TW || product.description.EN) ? '✓' : '✗'
            }}
          </span>
          <span
            :title="'特點: ' + (product.features && product.features.length > 0 ? '✓' : '✗')"
            :class="
              product.features && product.features.length > 0 ? 'text-green-500' : 'text-red-500'
            "
          >
            特點{{ product.features && product.features.length > 0 ? '✓' : '✗' }}
          </span>
          <span
            :title="'文件: ' + (hasDocs(product) ? '✓' : '✗')"
            :class="hasDocs(product) ? 'text-green-500' : 'text-red-500'"
          >
            型錄{{ hasDocs(product) ? '✓' : '✗' }}
          </span>
          <span
            :title="'影片: ' + (product.videos && product.videos.length > 0 ? '✓' : '✗')"
            :class="product.videos && product.videos.length > 0 ? 'text-green-500' : 'text-red-500'"
          >
            影片{{ product.videos && product.videos.length > 0 ? '✓' : '✗' }}
          </span>
        </div>

        <!-- 上架狀態 -->
        <div class="flex justify-center">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              :checked="product?.isActive"
              class="sr-only peer"
              @change="toggleProductActive(product)"
            />
            <div
              :class="
                conditionalClass(
                  'w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white',
                  'w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600',
                )
              "
            ></div>
          </label>
        </div>

        <!-- 時間與操作 -->
        <div class="flex items-center justify-end gap-[8px] lg:gap-[12px] px-4 lg:px-6 w-full">
          <span class="theme-text-secondary whitespace-nowrap">{{
            formatDate(product[currentSort.field]) || '無更新時間'
          }}</span>
          <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              :class="
                conditionalClass(
                  'p-1 text-white hover:text-blue-400',
                  'p-1 text-slate-600 hover:text-blue-600',
                )
              "
              @click="editProduct(product)"
              title="編輯"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
            <button
              :class="
                conditionalClass(
                  'p-1 text-white hover:text-red-400',
                  'p-1 text-slate-600 hover:text-red-600',
                )
              "
              @click="confirmDelete(product)"
              title="刪除"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分頁控制 -->
    <div v-if="pagination.totalPages > 1" class="py-4 flex justify-center gap-2">
      <button
        @click="changePage(pagination.currentPage - 1)"
        :disabled="pagination.currentPage === 1"
        :class="
          conditionalClass(
            'px-3 py-1 rounded bg-[#3F5069] disabled:opacity-50 disabled:cursor-not-allowed',
            'px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed',
          )
        "
      >
        上一頁
      </button>
      <span class="px-3 py-1 theme-text">
        {{ pagination.currentPage }} / {{ pagination.totalPages }}
      </span>
      <button
        @click="changePage(pagination.currentPage + 1)"
        :disabled="pagination.currentPage === pagination.totalPages"
        :class="
          conditionalClass(
            'px-3 py-1 rounded bg-[#3F5069] disabled:opacity-50 disabled:cursor-not-allowed',
            'px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed',
          )
        "
      >
        下一頁
      </button>
    </div>

    <!-- 確認刪除對話框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="showDeleteConfirm = false"></div>
      <div :class="[cardClass, 'w-full max-w-md rounded-[10px] shadow-lg z-10 p-[24px]']">
        <h3 class="text-[18px] font-bold mb-[16px]">確認刪除</h3>
        <p class="mb-[24px]">
          確定要刪除「{{
            getLocalizedField(productToDelete, 'name', productToDelete?.code || '未命名產品', 'TW')
          }}」嗎？此操作無法恢復。
        </p>
        <div class="flex justify-end gap-[12px]">
          <button
            class="px-4 py-2 rounded-[5px]"
            :class="
              conditionalClass(
                'bg-gray-600 hover:bg-gray-700 text-white',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              )
            "
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[5px]"
            @click="deleteProduct"
            :disabled="deleting"
          >
            {{ deleting ? '處理中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 編輯產品模態框 -->
    <ProductFormModal
      v-model:visible="showProductModal"
      :product-id="editingProductId"
      :category-data="categoryDataForModal"
      @submit-success="handleProductSubmitSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import { useLanguageStore } from '@/stores/core/languageStore'
import { useApi } from '@/composables/axios'
import { useThemeClass } from '@/composables/useThemeClass'
import { useSeriesStore } from '@/stores/models/series'
import ProductFormModal from '@/components/products/ProductFormModal.vue'

const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
  searchKeyword: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['product-clicked', 'product-deleted', 'product-updated'])

const router = useRouter()
const notify = useNotifications()
const { getLocalizedField } = useLanguage()
const languageStore = useLanguageStore()
const { entityApi } = useApi()
const { cardClass, conditionalClass } = useThemeClass()
const seriesStore = useSeriesStore()

// 僅依據 documentsByLang 與目前語言檢查是否有文件
const hasDocs = (product) => {
  const lang = languageStore.currentLang || 'TW'
  const byLang = product?.documentsByLang
  return Array.isArray(byLang?.[lang]) && byLang[lang].length > 0
}

// =====================================================
// 基本狀態管理
// =====================================================
const pagination = ref({
  currentPage: 1,
  itemsPerPage: 8,
  totalItems: 0,
  totalPages: 0,
})

const tableTopRef = ref(null)
const sortDropdownRef = ref(null)
const isSortDropdownOpen = ref(false)

// 排序狀態
const sortOptions = ref([
  { label: '最新更新', value: { field: 'updatedAt', order: 'desc' } },
  { label: '最早更新', value: { field: 'updatedAt', order: 'asc' } },
  { label: '最新建立', value: { field: 'createdAt', order: 'desc' } },
  { label: '最早建立', value: { field: 'createdAt', order: 'asc' } },
])
const currentSort = ref(sortOptions.value[0].value)

// 編輯產品相關
const showProductModal = ref(false)
const editingProductId = ref('')
const categoryDataForModal = ref(null)

// 刪除產品相關
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const productToDelete = ref(null)

// 友善顯示產品型號
const formatProductModel = (product) => {
  const source =
    (product?.name?.EN && typeof product.name.EN === 'string' && product.name.EN.trim()) ||
    (product?.code && product.code.toString()) ||
    ''
  return source.replace('-', ' ')
}

// 獲取系列名稱
const getSeriesName = (product) => {
  const seriesId = product.series?._id || product.series
  if (seriesId && seriesStore.items.length > 0) {
    const series = seriesStore.items.find((s) => s._id === seriesId)
    return getLocalizedField(series, 'name', series?.code || '', 'TW')
  }
  return ''
}

// =====================================================
// 計算屬性
// =====================================================

// 過濾和排序產品
const filteredProducts = computed(() => {
  // 確保 products 是一個數組
  if (!Array.isArray(props.products) || props.products.length === 0) {
    return []
  }

  // 創建新數組並排序（不修改原數組）
  const productsToFilter = [...props.products]

  // 排序邏輯
  const { field, order } = currentSort.value
  return productsToFilter.sort((a, b) => {
    const valA = a[field]
    const valB = b[field]

    if (!valA) return order === 'desc' ? 1 : -1
    if (!valB) return order === 'desc' ? -1 : 1

    const dateA = new Date(valA).getTime()
    const dateB = new Date(valB).getTime()

    if (isNaN(dateA)) return 1
    if (isNaN(dateB)) return -1

    return order === 'desc' ? dateB - dateA : dateA - dateB
  })
})

// 監聽 props.products 變化，更新分頁
watch(
  () => props.products,
  (newProducts) => {
    const total = Array.isArray(newProducts) ? newProducts.length : 0
    pagination.value.totalItems = total
    pagination.value.totalPages = Math.ceil(total / pagination.value.itemsPerPage) || 1

    if (pagination.value.currentPage > pagination.value.totalPages) {
      pagination.value.currentPage = pagination.value.totalPages
    }
    if (pagination.value.currentPage < 1) {
      pagination.value.currentPage = 1
    }
  },
  { immediate: true, deep: true },
)

const currentSortLabel = computed(() => {
  const option = sortOptions.value.find(
    (opt) =>
      opt.value.field === currentSort.value.field && opt.value.order === currentSort.value.order,
  )
  return option ? option.label : '排序'
})

// 顯示的產品列表
const displayedProducts = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage
  const end = start + pagination.value.itemsPerPage
  return filteredProducts.value ? filteredProducts.value.slice(start, end) : []
})

// =====================================================
// 事件處理功能
// =====================================================

const toggleSortDropdown = () => {
  isSortDropdownOpen.value = !isSortDropdownOpen.value
}

const setSort = (sortValue) => {
  currentSort.value = sortValue
  isSortDropdownOpen.value = false
  pagination.value.currentPage = 1
}

// 切換頁面
const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.currentPage) {
    return
  }
  pagination.value.currentPage = page

  nextTick(() => {
    if (tableTopRef.value) {
      const offset = 150
      const targetTop = tableTopRef.value.getBoundingClientRect().top + window.scrollY - offset
      const scrollTop = targetTop < 0 ? 0 : targetTop
      window.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  })
}

// 處理產品點擊
const handleProductClick = (product) => {
  emit('product-clicked', product)
}

// 編輯產品
const editProduct = (product) => {
  editingProductId.value = product._id
  // ProductFormModal 會自己從產品資料中獲取分類資訊，所以傳入空物件即可
  categoryDataForModal.value = { _id: '', name: '', subCategories: [] }
  showProductModal.value = true
}

// 處理產品提交成功
const handleProductSubmitSuccess = (payload) => {
  emit('product-updated', payload)
  // 更新本地產品資料
  if (payload.product && props.products) {
    const index = props.products.findIndex((p) => p._id === payload.product._id)
    if (index > -1) {
      Object.assign(props.products[index], payload.product)
    }
  }
}

// 確認刪除
const confirmDelete = (product) => {
  productToDelete.value = product
  showDeleteConfirm.value = true
}

const deleteProduct = async () => {
  if (!productToDelete.value) return

  deleting.value = true
  try {
    const success = await entityApi('products').delete(productToDelete.value._id)

    if (success) {
      showDeleteConfirm.value = false
      emit('product-deleted', productToDelete.value)
    } else {
      notify.notifyError('刪除產品失敗 (API)')
    }
  } catch (error) {
    notify.handleApiError(error, { defaultMessage: '刪除產品時發生錯誤' })
  } finally {
    deleting.value = false
    productToDelete.value = null
  }
}

// 切換產品狀態
const toggleProductActive = async (product) => {
  try {
    const updatedData = { isActive: !product.isActive }
    const result = await entityApi('products').update(product._id, updatedData)

    if (result) {
      emit('product-updated', { product: result, isNew: false })
      // 更新本地狀態
      Object.assign(product, result)
    } else {
      notify.notifyError('更新產品狀態失敗 (API)')
    }
  } catch (error) {
    notify.handleApiError(error, { defaultMessage: '更新產品狀態失敗' })
  }
}

// =====================================================
// 輔助函數
// =====================================================

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(event.target)) {
    isSortDropdownOpen.value = false
  }
}

// 處理圖片載入錯誤
const handleImageError = (event) => {
  event.target.src = '/placeholder.jpg'
  event.target.classList.add('img-error')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''

  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    console.warn(`[SearchProductTable] formatDate: 無法解析的日期字串:`, dateString)
    return '無效日期'
  }

  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

// =====================================================
// 生命週期鉤子
// =====================================================

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // 載入系列列表
  if (seriesStore.items.length === 0) {
    seriesStore.fetchAll()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
