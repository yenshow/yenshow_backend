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
      <!-- 子分類篩選器 (下拉式選單) -->
      <div class="relative" ref="categoriesDropdownRef">
        <button
          @click="toggleCategoriesDropdown"
          class="flex items-center gap-2 px-4 py-2 rounded-[10px] transition-colors"
          :class="
            conditionalClass(
              'border-2 border-[#3F5069] hover:bg-[#3a434c]',
              'border-2 border-slate-300 bg-white hover:bg-slate-50',
            )
          "
          :disabled="!subCategories || subCategories.length === 0"
        >
          <span>{{ selectedCategoriesLabel }}</span>
          <svg
            class="w-5 h-5 transition-transform"
            :class="{ 'rotate-180': isCategoriesDropdownOpen }"
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
          v-if="isCategoriesDropdownOpen"
          class="absolute z-50 min-w-[200px] rounded-[10px] shadow-lg max-h-[300px] overflow-y-auto space-y-1"
          :class="
            conditionalClass(
              'bg-[#1e293b] border border-[#3F5069]',
              'bg-white border border-slate-200',
            )
          "
        >
          <button
            class="w-full px-4 py-2 text-left flex justify-between items-center gap-2 transition-colors"
            :class="conditionalClass('hover:bg-[#3a434c]', 'hover:bg-slate-100')"
            @click="selectAllCategories"
          >
            <span>全部</span>
            <span v-if="selectedSubCategoriesId === null" class="text-blue-400">✓</span>
          </button>
          <template v-if="subCategories && subCategories.length > 0">
            <button
              v-for="subCategory in subCategories"
              :key="subCategory._id"
              class="w-full px-4 py-2 text-left flex justify-between items-center gap-2 transition-colors"
              :class="conditionalClass('hover:bg-[#3a434c]', 'hover:bg-slate-100')"
              @click="selectSubCategories(subCategory._id)"
            >
              <span>{{ getLocalizedField(subCategory, 'name', '未命名子分類', 'TW') }}</span>
              <span v-if="selectedSubCategoriesId === subCategory._id" class="text-blue-400"
                >✓</span
              >
            </button>
          </template>
          <div
            v-else
            class="px-4 py-2 text-center"
            :class="conditionalClass('text-gray-400', 'text-slate-500')"
          >
            無子分類可選擇
          </div>
        </div>
      </div>
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
        <p class="mt-2">
          {{
            selectedSubCategoriesId
              ? `子分類 "${selectedCategoriesLabel}" 下暫無產品`
              : '該分類下暫無產品'
          }}
          <span
            v-if="targetSpecificationIds && targetSpecificationIds.length === 0"
            class="text-sm"
          >
            (因為還未定義任何規格)
          </span>
        </p>
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

        <!-- 規格欄 (改為產品名稱) -->
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
      :category-data="props.categoryData"
      @submit-success="handleProductSubmitSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import { useLanguageStore } from '@/stores/core/languageStore'
import { useApi } from '@/composables/axios'
import { useThemeClass } from '@/composables/useThemeClass'
import ProductFormModal from '@/components/products/ProductFormModal.vue'

const props = defineProps({
  categoryData: {
    type: Object,
    required: true,
    default: () => ({ _id: '', name: '', subCategories: [] }),
  },
})

const emit = defineEmits(['product-updated', 'product-deleted', 'editProduct'])

// 使用通知和本地化功能
const notify = useNotifications()
const { getLocalizedField } = useLanguage()
const languageStore = useLanguageStore()

// 僅依據 documentsByLang 與目前語言檢查是否有文件
const hasDocs = (product) => {
  const lang = languageStore.currentLang || 'TW'
  const byLang = product?.documentsByLang
  return Array.isArray(byLang?.[lang]) && byLang[lang].length > 0
}
const { entityApi } = useApi()

// 主題相關
const { cardClass, conditionalClass } = useThemeClass()

// =====================================================
// 基本狀態管理
// =====================================================
const pagination = ref({
  currentPage: 1,
  itemsPerPage: 8,
  totalItems: 0,
  totalPages: 0,
})

// const subCategories = ref([]) // 改為 computed
const selectedSubCategoriesId = ref(null)
const categoriesDropdownRef = ref(null)
const tableTopRef = ref(null)
const isCategoriesDropdownOpen = ref(false)

// 排序狀態
const sortDropdownRef = ref(null)
const isSortDropdownOpen = ref(false)
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

// 刪除產品相關
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const productToDelete = ref(null)

// 友善顯示產品型號：優先使用 name.EN，其次使用 code；無論來源為何，將第一個連字號替換為空白
const formatProductModel = (product) => {
  const source =
    (product?.name?.EN && typeof product.name.EN === 'string' && product.name.EN.trim()) ||
    (product?.code && product.code.toString()) ||
    ''
  return source.replace('-', ' ')
}

// =====================================================
// 計算屬性 (Derived from props and state)
// =====================================================

// 從 categoryData 計算子分類列表
const subCategories = computed(() => {
  return props.categoryData?.subCategories || []
})

// New: Extract all products directly from the prop structure
const allProductsFromProp = computed(() => {
  const productsList = []
  if (props.categoryData?.subCategories) {
    props.categoryData.subCategories.forEach((subCategory) => {
      if (subCategory.specifications) {
        subCategory.specifications.forEach((spec) => {
          if (spec.products && Array.isArray(spec.products)) {
            // Add subCategory and specification context if needed later
            spec.products.forEach((product) => {
              // Ensure basic product structure, add context
              productsList.push({
                ...product,
                _subCategoryId: subCategory._id, // Add subCategory ID for filtering
                _specificationId: spec._id, // Add specification ID for context
              })
            })
          }
        })
      }
    })
  }
  console.log(productsList)
  return productsList
})

// New: Filter products based on selected subcategory
const filteredProducts = computed(() => {
  let productsToFilter = []
  if (allProductsFromProp.value) {
    if (selectedSubCategoriesId.value === null) {
      productsToFilter = allProductsFromProp.value
    } else {
      productsToFilter = allProductsFromProp.value.filter(
        (p) => p._subCategoryId === selectedSubCategoriesId.value,
      )
    }
  }

  // 排序邏輯
  const { field, order } = currentSort.value
  return [...productsToFilter].sort((a, b) => {
    const valA = a[field]
    const valB = b[field]

    if (!valA) return order === 'desc' ? 1 : -1
    if (!valB) return order === 'desc' ? -1 : 1

    const dateA = new Date(valA).getTime()
    const dateB = new Date(valB).getTime()

    // 增強排序穩定性，處理無效日期
    if (isNaN(dateA)) return 1
    if (isNaN(dateB)) return -1

    return order === 'desc' ? dateB - dateA : dateA - dateB
  })
})

// New: Watch filtered products to update pagination state
watch(
  filteredProducts,
  (newFilteredProducts) => {
    const total = newFilteredProducts.length
    pagination.value.totalItems = total
    pagination.value.totalPages = Math.ceil(total / pagination.value.itemsPerPage) || 1 // Ensure totalPages is at least 1

    if (pagination.value.currentPage > pagination.value.totalPages) {
      pagination.value.currentPage = pagination.value.totalPages
    }
    if (pagination.value.currentPage < 1) {
      pagination.value.currentPage = 1
    }
  },
  { immediate: true, deep: true },
)

// 計算目標規格 IDs (Still potentially useful for display logic/debugging)
const targetSpecificationIds = computed(() => {
  let ids = []
  if (selectedSubCategoriesId.value) {
    // 只查詢選定子分類下的規格
    const selectedSub = subCategories.value.find((sc) => sc._id === selectedSubCategoriesId.value)
    if (selectedSub && selectedSub.specifications) {
      ids = selectedSub.specifications.map((spec) => spec._id).filter((id) => id) // 提取 ID 並過濾無效 ID
    }
  } else {
    // 查詢所有子分類下的所有規格
    subCategories.value.forEach((sc) => {
      if (sc.specifications) {
        sc.specifications.forEach((spec) => {
          if (spec._id) {
            ids.push(spec._id)
          }
        })
      }
    })
    ids = [...new Set(ids)]
  }
  return ids
})

// 計算選中的子分類標籤
const selectedCategoriesLabel = computed(() => {
  if (!selectedSubCategoriesId.value) return '子分類'
  const selected = subCategories.value.find((s) => s._id === selectedSubCategoriesId.value)
  if (!selected) return '選擇子分類' // Handle case where selected id might be invalid momentarily
  return getLocalizedField(selected, 'name', '未命名子分類', 'TW')
})

const currentSortLabel = computed(() => {
  const option = sortOptions.value.find(
    (opt) =>
      opt.value.field === currentSort.value.field && opt.value.order === currentSort.value.order,
  )
  return option ? option.label : '排序'
})

// 顯示的產品列表 (Now handles frontend pagination)
const displayedProducts = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage
  const end = start + pagination.value.itemsPerPage
  return filteredProducts.value ? filteredProducts.value.slice(start, end) : []
})

// =====================================================
// 事件處理功能
// =====================================================

// 處理下拉選單操作
const toggleCategoriesDropdown = () => {
  isCategoriesDropdownOpen.value = !isCategoriesDropdownOpen.value
}

const toggleSortDropdown = () => {
  isSortDropdownOpen.value = !isSortDropdownOpen.value
}

const setSort = (sortValue) => {
  currentSort.value = sortValue
  isSortDropdownOpen.value = false
  pagination.value.currentPage = 1
}

// 選擇全部子分類
const selectAllCategories = () => {
  if (selectedSubCategoriesId.value !== null) {
    selectedSubCategoriesId.value = null
    isCategoriesDropdownOpen.value = false
    // pagination.value.currentPage = 1 // Reset page when filter changes
  } else {
    isCategoriesDropdownOpen.value = false
  }
}

// 選擇子分類
const selectSubCategories = (subCategoriesId) => {
  if (selectedSubCategoriesId.value !== subCategoriesId) {
    selectedSubCategoriesId.value = subCategoriesId
    isCategoriesDropdownOpen.value = false
    // pagination.value.currentPage = 1 // Reset page when filter changes
  } else {
    isCategoriesDropdownOpen.value = false
  }
}

// 切換頁面
const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.currentPage) {
    return
  }
  pagination.value.currentPage = page

  // 切換分頁後自動捲動到表格頂端（預留約 100px ）
  nextTick(() => {
    if (tableTopRef.value) {
      const offset = 150 // 預留空間 (px)
      const targetTop = tableTopRef.value.getBoundingClientRect().top + window.scrollY - offset
      const scrollTop = targetTop < 0 ? 0 : targetTop
      window.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  })
}

// 編輯產品
const editProduct = (product) => {
  editingProductId.value = product._id
  showProductModal.value = true
}

// 處理產品提交成功
const handleProductSubmitSuccess = (payload) => {
  emit('product-updated', payload)
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
      emit('product-updated', { product: result, isNew: false }) // Rely on parent to update props
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
  if (categoriesDropdownRef.value && !categoriesDropdownRef.value.contains(event.target)) {
    isCategoriesDropdownOpen.value = false
  }
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
  if (!dateString) return '' // 如果沒有日期字串，返回空

  const date = new Date(dateString)

  // 檢查創建的日期物件是否有效
  if (isNaN(date.getTime())) {
    console.warn(`[ProductTable] formatDate: 無法解析的日期字串:`, dateString)
    return '無效日期' // 如果日期無效，返回提示信息
  }

  // 如果日期有效，正常格式化
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

// =====================================================
// 生命週期鉤子和監聽器
// =====================================================

// 監聽 categoryData ID 變化，僅重置選擇和頁碼
watch(
  () => props.categoryData?._id, // Only watch the ID
  (newId, oldId) => {
    if (newId !== oldId) {
      // Trigger on actual ID change or initial load
      selectedSubCategoriesId.value = null // Reset subcategory selection
      pagination.value.currentPage = 1 // Reset page number
      // No need to call loadProducts. Prop change triggers computed updates.
    }
  },
  { immediate: true }, // Ensures initial setup
)

// Keep Mount/Unmount for handleClickOutside
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // Initial data processing is handled by computed properties and immediate watchers
})

// Need to add onUnmounted back if keeping the event listener
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
