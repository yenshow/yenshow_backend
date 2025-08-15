<template>
  <div class="categories-block">
    <!-- 無資料提示 -->
    <div
      v-if="!categoryList || categoryList.length === 0"
      class="container mx-auto py-8 text-center"
    >
      <p class="theme-text-secondary">目前沒有類別資料</p>
      <p v-if="!props.categoriesData" class="text-sm theme-text-secondary mt-2">
        (或正在從父組件加載...)
      </p>
    </div>

    <!-- 分類內容顯示區域 -->
    <template v-else>
      <section
        v-for="category in categoryList"
        :key="category._id"
        class="container mx-auto py-[24px] lg:py-[48px]"
      >
        <div class="flex justify-between items-center py-[12px] lg:py-[24px]">
          <h3 class="text-[24px] lg:text-[36px] theme-text">
            {{ getLocalizedField(category, 'name', '未命名類別', 'TW') }}
          </h3>
          <div class="flex gap-2">
            <!-- 新增子分類按鈕 -->
            <button
              type="button"
              @click="handleSubCategoriesButton(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增子分類</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <!-- 新增規格按鈕 -->
            <button
              type="button"
              @click="handleSpecificationsButton(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增規格</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <!-- 新增產品按鈕 -->
            <button
              type="button"
              @click="handleAddProduct(category)"
              class="transition-colors duration-200 px-[12px] lg:px-[16px] py-[8px] lg:py-[12px] rounded-[10px] flex items-end gap-[8px] cursor-pointer"
              :class="
                isDarkTheme
                  ? 'bg-[#212a37] hover:bg-[#2a323c] border-2 border-[#3F5069]'
                  : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700'
              "
            >
              <span class="text-[12px] lg:text-[16px]">新增產品</span>
              <svg
                class="w-[16px] lg:w-[24px] aspect-square"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- 產品表格 -->
        <div class="mt-4">
          <ProductTable
            :category-data="category"
            @product-updated="handleProductUpdate"
            @product-deleted="handleProductDelete"
          />
        </div>
      </section>
    </template>

    <!-- 使用通用多語言表單對話框 - 子分類 -->
    <MultilingualFormDialog
      v-model="showSubCategoryModal"
      title="管理子分類"
      item-label="子分類"
      item-label-en="subCategories"
      model-type="subCategories"
      :parent-id="selectedCategory"
      parent-field="categories"
      @submit-success="handleSubCategorySubmitSuccess"
      @refresh-data="$emit('refresh-hierarchy')"
    />

    <!-- 使用通用多語言表單對話框 - 規格 -->
    <MultilingualFormDialog
      v-model="showSpecificationModal"
      title="管理規格"
      item-label="規格"
      item-label-en="specifications"
      model-type="specifications"
      :parent-id="selectedSubCategory"
      parent-field="subCategories"
      @submit-success="handleSpecificationSubmitSuccess"
      @refresh-data="$emit('refresh-hierarchy')"
    />

    <!-- 子分類選擇對話框 -->
    <div
      v-if="showSubCategorySelector"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div :class="[cardClass, 'w-full max-w-md rounded-[10px] shadow-lg p-[24px]']">
        <h2 class="text-[24px] font-bold text-center mb-[16px] theme-text">選擇子分類</h2>

        <!-- 錯誤提示 -->
        <div
          v-if="subCategoryError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4"
        >
          {{ subCategoryError }}
        </div>

        <!-- 選擇列表 -->
        <div v-else-if="subCategoriesList && subCategoriesList.length > 0" class="mb-[16px]">
          <p class="mb-[12px] theme-text">請選擇要管理規格的子分類：</p>

          <div class="max-h-[300px] overflow-y-auto">
            <div
              v-for="subCategory in subCategoriesList"
              :key="subCategory._id"
              :class="[
                'p-[12px] mb-[8px] rounded-[8px] cursor-pointer transition-colors',
                conditionalClass(
                  'bg-[#2a3544] hover:bg-[#344155]',
                  'bg-slate-100 hover:bg-slate-200',
                ),
              ]"
              @click="selectSubCategory(subCategory)"
            >
              {{ getLocalizedField(subCategory, 'name', '未命名子分類', 'TW') }}
            </div>
          </div>
        </div>

        <!-- 無子分類 -->
        <div
          v-else-if="!subCategoryError"
          class="mb-[16px] text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-500')"
        >
          <p>該類別下沒有子分類</p>
          <p class="text-sm mt-2">請先新增子分類後再管理規格</p>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex justify-end gap-[12px]">
          <button
            @click="closeSubCategorySelector"
            :class="[
              'px-4 py-2 rounded-[5px]',
              conditionalClass(
                'bg-gray-600 hover:bg-gray-700 text-white',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              ),
            ]"
          >
            關閉
          </button>
          <button
            @click="createSubCategory"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px]"
          >
            新增子分類
          </button>
        </div>
      </div>
    </div>

    <!-- 產品表單 -->
    <ProductFormModal
      v-if="categoryForModal"
      v-model:visible="showProductModal"
      :category-data="categoryForModal"
      @submit-success="handleProductSubmitSuccess"
      @close="categoryForModal = null"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useNotifications } from '@/composables/notificationCenter'
import { useLanguage } from '@/composables/useLanguage'
import MultilingualFormDialog from '@/components/products/MultilingualFormDialog.vue'
import ProductTable from '@/components/products/ProductTable.vue'
import ProductFormModal from '@/components/products/ProductFormModal.vue'
import { useThemeClass } from '@/composables/useThemeClass'

// Props
const props = defineProps({
  categoriesData: {
    type: Array,
    required: true,
    default: () => [],
  },
})

// Emits
const emit = defineEmits(['refresh-hierarchy'])

// 啟用通知中心和本地化工具
const notify = useNotifications()
const { getLocalizedField } = useLanguage()

// 獲取主題狀態和樣式
const { isDarkTheme, cardClass, conditionalClass } = useThemeClass()

// 基本狀態
const categoryList = ref([])
const subCategoriesList = ref([])
const selectedCategory = ref('')
const selectedSubCategory = ref('')
const categoryForModal = ref(null)
const showSubCategoryModal = ref(false)
const showSpecificationModal = ref(false)
const showSubCategorySelector = ref(false)
const subCategoryError = ref('')
const showProductModal = ref(false)

// 處理子分類按鈕點擊
function handleSubCategoriesButton(category) {
  if (!category || !category._id) {
    notify.notifyWarning('無效的類別資料')
    return
  }
  selectedCategory.value = category._id
  showSubCategoryModal.value = true
}

// 處理規格按鈕點擊
async function handleSpecificationsButton(category) {
  if (!category || !category._id) {
    notify.notifyWarning('無效的類別資料')
    return
  }
  selectedCategory.value = category._id // 記錄當前操作的 Category ID
  subCategoryError.value = ''

  const currentSubCategories = category.subCategories || []
  subCategoriesList.value = currentSubCategories

  if (currentSubCategories.length === 0) {
    subCategoryError.value = `類別「${getLocalizedField(category, 'name', '未命名類別', 'TW')}」下沒有子分類，請先新增子分類`
  }

  showSubCategorySelector.value = true
}

// 處理子分類提交成功
function handleSubCategorySubmitSuccess(result) {
  if (!result) return
  handleGenericSubmitSuccess(result.isNew ? 'create' : 'update', 'subCategories', result.item?.name)
}

// 處理規格提交成功
function handleSpecificationSubmitSuccess(result) {
  if (!result) return
  handleGenericSubmitSuccess(
    result.isNew ? 'create' : 'update',
    'specifications',
    result.item?.name,
  )
}

// 子分類選擇對話框相關方法
function selectSubCategory(subCategory) {
  if (!subCategory || !subCategory._id) {
    notify.notifyWarning('選擇的子分類無效')
    return
  }
  selectedSubCategory.value = subCategory._id
  showSubCategorySelector.value = false
  showSpecificationModal.value = true
}

function closeSubCategorySelector() {
  showSubCategorySelector.value = false
  selectedCategory.value = ''
  subCategoriesList.value = []
}

function createSubCategory() {
  showSubCategorySelector.value = false
  if (selectedCategory.value) {
    showSubCategoryModal.value = true
  } else {
    notify.notifyWarning('請先選擇一個類別')
  }
}

// 處理新增產品按鈕點擊
function handleAddProduct(category) {
  if (!category || !category._id) {
    notify.notifyWarning('無效的類別資料')
    return
  }
  categoryForModal.value = category
  showProductModal.value = true
}

// 處理產品提交成功
function handleProductSubmitSuccess(payload) {
  if (!payload || !payload.product) return

  // 直接在本地更新數據，而不是全局刷新
  handleProductUpdate(payload)

  showProductModal.value = false
  categoryForModal.value = null
}

const findProductLocation = (productId) => {
  for (const category of categoryList.value) {
    if (!category.subCategories) continue
    for (const subCategory of category.subCategories) {
      if (!subCategory.specifications) continue
      for (const spec of subCategory.specifications) {
        if (!spec.products) continue
        const productIndex = spec.products.findIndex((p) => p._id === productId)
        if (productIndex !== -1) {
          return { category, subCategory, spec, productIndex }
        }
      }
    }
  }
  return null
}

const handleProductUpdate = (payload) => {
  const { product, isNew } = payload
  if (!product?._id) return

  const location = findProductLocation(product._id)

  if (isNew) {
    // 新增產品
    // 需要找到產品對應的規格並將其添加進去
    let targetSpec = null
    for (const category of categoryList.value) {
      if (!category.subCategories) continue
      for (const subCategory of category.subCategories) {
        if (!subCategory.specifications) continue
        targetSpec = subCategory.specifications.find((s) => s._id === product.specifications)
        if (targetSpec) break
      }
      if (targetSpec) break
    }

    if (targetSpec) {
      if (!targetSpec.products) {
        targetSpec.products = []
      }
      targetSpec.products.push(product)
      notify.notifySuccess(`產品 ${getLocalizedField(product, 'name', '', 'TW')} 已成功新增`)
    }
  } else if (location) {
    // 更新產品
    location.spec.products.splice(location.productIndex, 1, product)
    notify.notifySuccess(`產品 ${getLocalizedField(product, 'name', '', 'TW')} 已成功更新`)
  }
}

const handleProductDelete = (deletedProduct) => {
  if (!deletedProduct?._id) return

  const location = findProductLocation(deletedProduct._id)

  if (location) {
    location.spec.products.splice(location.productIndex, 1)
    notify.notifySuccess(`產品 ${getLocalizedField(deletedProduct, 'name', '', 'TW')} 已成功刪除`)
  }
}

// 通用的提交成功處理函數
function handleGenericSubmitSuccess(action, modelType, itemName) {
  const modelNameMap = {
    subCategories: '子分類',
    specifications: '規格',
    products: '產品',
  }
  const actionNameMap = {
    create: '新增',
    update: '更新',
  }

  const modelName = modelNameMap[modelType] || '資料'
  const actionName = actionNameMap[action] || '操作'

  notify.notifySuccess(
    `${modelName}「${getLocalizedField({ name: itemName }, 'name', '', 'TW')}」已成功${actionName}`,
  )
  emit('refresh-hierarchy')
  if (modelType === 'subCategories') showSubCategoryModal.value = false
  if (modelType === 'specifications') showSpecificationModal.value = false
  if (modelType === 'products') showProductModal.value = false
}

// 監聽 props.categoriesData 變化來更新 categoryList
watch(
  () => props.categoriesData,
  (newData) => {
    categoryList.value = newData || []
    selectedCategory.value = ''
    selectedSubCategory.value = ''
  },
  { immediate: true, deep: true },
)
</script>
