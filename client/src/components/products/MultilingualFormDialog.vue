<template>
  <div>
    <!-- 對話框背景遮罩 -->
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        :class="[
          cardClass,
          'w-full max-w-2xl rounded-[10px] shadow-lg p-[24px] max-h-[90vh] overflow-y-auto relative',
        ]"
      >
        <h2 class="text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text">
          {{ title }}
        </h2>

        <!-- 載入中狀態 -->
        <div v-if="loading" class="text-center py-8">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
            :class="conditionalClass('border-white', 'border-blue-600')"
          ></div>
          <p class="mt-2" :class="conditionalClass('text-gray-400', 'text-slate-500')">
            正在載入數據...
          </p>
        </div>

        <!-- 錯誤提示和重試按鈕 -->
        <div v-if="error" class="text-center py-8">
          <div class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-4">
            {{ error }}
          </div>
          <button
            @click="reload"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
          >
            重新載入
          </button>
        </div>

        <!-- 表單內容 -->
        <form v-else @submit.prevent="submitForm" class="space-y-[12px] lg:space-y-[24px]">
          <!-- 項目管理區塊 -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <label class="block text-[18px] theme-text">{{ itemLabel }}</label>
              <button
                type="button"
                @click="addItem"
                class="flex items-center cursor-pointer"
                :class="
                  conditionalClass(
                    'text-[#3490dc] hover:text-[#2779bd]',
                    'text-blue-600 hover:text-blue-700',
                  )
                "
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                新增{{ itemLabel }}
              </button>
            </div>

            <!-- 空項目提示 -->
            <div
              v-if="formData.items.length === 0"
              class="mb-4"
              :class="conditionalClass('text-gray-400', 'text-slate-500')"
            >
              尚無{{ itemLabel }}，請點擊「新增{{ itemLabel }}」按鈕新增
            </div>

            <!-- 項目列表 -->
            <div
              v-for="(item, index) in formData.items"
              :key="item._id || item.id || index"
              class="mb-4"
            >
              <div class="flex mb-3">
                <!-- 項目表單欄位 -->
                <div class="flex-grow">
                  <!-- 使用 grid 佈局平分繁中與英文輸入欄位 -->
                  <div class="grid grid-cols-2 gap-3 mb-3">
                    <!-- 中文名稱輸入框 -->
                    <div class="relative">
                      <span
                        class="absolute right-3 top-3 text-xs"
                        :class="conditionalClass('text-gray-400', 'text-slate-500')"
                        >TW</span
                      >
                      <input
                        v-model="item.name_TW"
                        type="text"
                        :class="[
                          inputClass,
                          'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] pt-8',
                          validationErrors[`items[${index}].name_TW`] ? 'border-red-500' : '',
                        ]"
                        :placeholder="`請輸入${itemLabel}名稱`"
                        required
                      />
                      <div
                        v-if="validationErrors[`items[${index}].name_TW`]"
                        class="text-red-500 text-sm mt-1"
                      >
                        {{ validationErrors[`items[${index}].name_TW`] }}
                      </div>
                    </div>

                    <!-- 英文名稱輸入框 -->
                    <div class="relative">
                      <span
                        class="absolute right-3 top-3 text-xs"
                        :class="conditionalClass('text-gray-400', 'text-slate-500')"
                        >EN</span
                      >
                      <input
                        v-model="item.name_EN"
                        type="text"
                        :class="[
                          inputClass,
                          'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] pt-8',
                          validationErrors[`items[${index}].name_EN`] ? 'border-red-500' : '',
                        ]"
                        :placeholder="`Enter ${itemLabelEn} name`"
                        @input="generateCode(item, index)"
                      />
                      <div
                        v-if="validationErrors[`items[${index}].name_EN`]"
                        class="text-red-500 text-sm mt-1"
                      >
                        {{ validationErrors[`items[${index}].name_EN`] }}
                      </div>
                    </div>
                  </div>

                  <!-- 隱藏的代碼輸入框 -->
                  <input v-model="item.code" type="hidden" />
                  <div
                    v-if="validationErrors[`items[${index}].code`]"
                    class="text-red-500 text-sm mt-1"
                  >
                    {{ validationErrors[`items[${index}].code`] }}
                  </div>

                  <!-- 顯示生成的代碼提示 -->
                  <div
                    class="text-xs mb-2"
                    :class="conditionalClass('text-gray-400', 'text-slate-500')"
                  >
                    自動生成代碼: <span class="font-mono">{{ item.code }}</span>
                  </div>
                </div>
                <!-- 刪除按鈕 -->
                <button
                  type="button"
                  @click="confirmDeleteItem(item, index)"
                  class="ms-2 text-red-500 hover:text-red-400 cursor-pointer"
                  :disabled="submitting"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 表單按鈕區域 -->
          <div class="flex justify-end gap-4">
            <button
              type="button"
              :class="[
                'px-4 py-2 rounded-[10px] cursor-pointer',
                conditionalClass(
                  'bg-gray-600 hover:bg-gray-700',
                  'bg-slate-300 hover:bg-slate-400 text-slate-700',
                ),
              ]"
              @click="closeDialog"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-[10px] cursor-pointer text-white"
              :disabled="submitting"
            >
              {{ submitting ? '處理中...' : `更新${itemLabel}` }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 刪除確認對話框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="showDeleteConfirm = false"></div>
      <div :class="[cardClass, 'w-full max-w-md rounded-[10px] shadow-lg z-10 p-[24px]']">
        <h3 class="text-[18px] font-bold mb-[16px] theme-text">確認刪除</h3>
        <p class="mb-[24px] theme-text">
          確定要刪除「{{ getItemName(itemToDelete) }}」{{ itemLabel }}嗎？此操作無法恢復。
        </p>
        <div class="flex justify-end gap-[12px]">
          <button
            :class="[
              'px-4 py-2 rounded-[5px]',
              conditionalClass(
                'bg-gray-600 hover:bg-gray-700',
                'bg-slate-300 hover:bg-slate-400 text-slate-700',
              ),
            ]"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-[5px] text-white"
            @click="deleteItem"
            :disabled="deleting"
          >
            {{ deleting ? '處理中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useLanguageStore } from '@/stores/core/languageStore'
import { useFormValidation } from '@/composables/useFormValidation'
import { useLanguage } from '@/composables/useLanguage'
import { useNotifications } from '@/composables/notificationCenter'
import { createEntityStore } from '@/stores/entityStore'
import { useApi } from '@/composables/axios'
import { useThemeClass } from '@/composables/useThemeClass'

// 獲取主題相關工具
const { cardClass, inputClass, conditionalClass } = useThemeClass()

// 定義 props
const props = defineProps({
  // 對話框是否顯示
  modelValue: {
    type: Boolean,
    default: false,
  },
  // 標題
  title: {
    type: String,
    default: '管理項目',
  },
  // 項目標籤（中文）
  itemLabel: {
    type: String,
    default: '項目',
  },
  // 項目標籤（英文）
  itemLabelEn: {
    type: String,
    default: 'item',
  },
  // 模型類型 - 用於確定使用哪個 store
  modelType: {
    type: String,
    required: true,
  },
  // 父項目 ID
  parentId: {
    type: String,
    required: true,
  },
  // 父欄位名稱，例如 series, category 等
  parentField: {
    type: String,
    default: '',
  },
})

// 定義 emits
const emit = defineEmits(['update:modelValue', 'submit-success', 'reload-request', 'refresh-data'])

// 初始化工具
const languageStore = useLanguageStore()
const { validateRequired, errors: validationErrors } = useFormValidation()
const { getLocalizedField, toFormFormat, toApiFormat } = useLanguage()
const notify = useNotifications()

// 基本狀態
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const showDeleteConfirm = ref(false)
const itemToDelete = ref(null)
const deletingIndex = ref(-1)
const deleting = ref(false)
const entityStore = ref(null)

// 表單數據
const formData = ref({
  parentId: '',
  items: [],
})

// 初始化 store (動態創建 entity store)
const initStore = () => {
  try {
    // 使用 createEntityStore 工廠函數動態創建 store
    entityStore.value = createEntityStore(props.modelType)()
  } catch (error) {
    error.value = `初始化 store 失敗: ${error.message}`
  }
}

// 監聽對話框狀態
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // 對話框開啟時，初始化 store 並載入數據
      initStore()
      loadData()
    }
  },
  { immediate: true },
)

// 監聽父 ID 變化
watch(
  () => props.parentId,
  (newValue) => {
    if (props.modelValue && newValue) {
      loadData()
    }
  },
)

// 載入數據
const loadData = async () => {
  loading.value = true
  error.value = ''
  // resetForm(); // 暫時註釋掉 resetForm，以便觀察 formData 的變化

  try {
    const { apiAuth } = useApi()
    const requestUrl = `/api/hierarchy/children/${props.parentField}/${props.parentId}`

    const { data } = await apiAuth.get(requestUrl, {
      params: { lang: languageStore.currentLang },
    })

    if (!data || !data.success) {
      console.error('[MultilingualFormDialog] API call failed or data.success is false.')
      throw new Error(`無法載入${props.itemLabel}數據`)
    }

    formData.value.parentId = props.parentId // 設置 parentId

    // 新方式：同時檢查 <modelType> 和 <modelType>List 鍵名
    const listKey = `${props.modelType}List` // 例如 "subCategoriesList"
    const singleKey = props.modelType // 例如 "subCategories"

    let itemsData = null

    if (data.result) {
      const dataResultKeys = Object.keys(data.result)
      let actualKeyToUse = null

      // 優先以不區分大小寫的方式尋找 List 版本的鍵
      for (const key of dataResultKeys) {
        if (key.toLowerCase() === listKey.toLowerCase()) {
          actualKeyToUse = key
          break
        }
      }

      // 如果 List 版本的鍵沒找到，再以不區分大小寫的方式尋找 Single 版本的鍵
      if (!actualKeyToUse) {
        for (const key of dataResultKeys) {
          if (key.toLowerCase() === singleKey.toLowerCase()) {
            actualKeyToUse = key
            break
          }
        }
      }

      if (actualKeyToUse && Array.isArray(data.result[actualKeyToUse])) {
        itemsData = data.result[actualKeyToUse]
      } else {
        console.log('data.result', data.result)
        // 更新警告訊息以反映新的查找邏輯
        console.warn(
          `[MultilingualFormDialog] Could not find valid array data. Tried to find keys similar to '${listKey}' or '${singleKey}' (case-insensitive) in the received data.`,
        )
      }
    }

    if (!Array.isArray(itemsData)) {
      // 保留這個檢查以防萬一
      console.warn('[MultilingualFormDialog] itemsData is not a valid array after checking keys.')
      formData.value.items = [] // 確保 items 是數組
    } else {
      formData.value.items = convertToFormFormat(itemsData)
    }
  } catch (err) {
    console.error('[MultilingualFormDialog] Error in loadData:', err) // 打印錯誤
    error.value = notify.handleApiError(err, {
      showToast: false,
      defaultMessage: `無法載入${props.itemLabel}數據，請稍後再試`,
    }).message
    formData.value.items = [] // 出錯時清空列表
  } finally {
    loading.value = false
  }
}

// 重置表單
const resetForm = () => {
  formData.value = {
    parentId: props.parentId,
    items: [],
  }
  Object.keys(validationErrors).forEach((key) => delete validationErrors[key])
}

// 關閉對話框
const closeDialog = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 重新載入
const reload = () => {
  emit('reload-request')
  loadData()
}

// 將數據轉換為表單格式
function convertToFormFormat(items) {
  return items.map((item) => {
    // 使用 toFormFormat 函數處理
    const formItem = toFormFormat(item, ['name'])

    // 添加必要的其他字段
    return {
      ...formItem,
      _id: item._id || item.id,
      code: item.code || '',
      isActive: item.isActive !== false,
      [props.parentField]: props.parentId,
      _originalData: item,
    }
  })
}

// 獲取項目名稱
function getItemName(item) {
  if (!item) return `未命名${props.itemLabel}`
  return item.name_TW || getLocalizedField(item, 'name', `未命名${props.itemLabel}`)
}

// 新增項目
function addItem() {
  // 基本欄位
  const newItem = {
    name_TW: '',
    name_EN: '',
    code: '',
    isActive: true,
  }

  // 添加父項目關聯
  if (props.parentField) {
    newItem[props.parentField] = props.parentId
  }

  formData.value.items.push(newItem)
}

// 確認刪除項目
function confirmDeleteItem(item, index) {
  itemToDelete.value = item
  deletingIndex.value = index
  showDeleteConfirm.value = true
}

// 刪除項目
async function deleteItem() {
  deleting.value = true

  try {
    if (itemToDelete.value._id && entityStore.value) {
      // 使用 entityStore 的 delete 方法刪除
      await entityStore.value.delete(itemToDelete.value._id)
      // 刪除成功後由事件通知刷新
      emit('refresh-data')
    }

    // 從表單中移除
    if (deletingIndex.value > -1) {
      formData.value.items.splice(deletingIndex.value, 1)
    }

    showDeleteConfirm.value = false
    notify.notifySuccess(`${props.itemLabel}已成功刪除`)
  } catch (error) {
    notify.handleApiError(error, {
      defaultMessage: `刪除${props.itemLabel}失敗`,
    })
  } finally {
    deleting.value = false
  }
}

// 驗證表單
function validateForm() {
  // 清除先前的錯誤
  Object.keys(validationErrors).forEach((key) => delete validationErrors[key])

  for (let i = 0; i < formData.value.items.length; i++) {
    const item = formData.value.items[i]

    // 驗證中文名稱
    const nameResult = validateRequired(item.name_TW, '中文名稱')
    if (!nameResult.valid) {
      validationErrors[`items[${i}].name_TW`] = nameResult.message
    } else if (item.name_TW.length < 2) {
      validationErrors[`items[${i}].name_TW`] = '中文名稱至少需要 2 個字符'
    }

    // 確保從英文名稱生成代碼
    if (!item.code && item.name_EN) {
      generateCode(item, i)
    }

    // 如果沒有英文名稱但有中文名稱，使用索引
    if (!item.code && !item.name_EN && item.name_TW) {
      item.code = `${props.itemLabelEn}_${i + 1}`
    }

    // 驗證代碼是否存在
    if (!item.code) {
      validationErrors[`items[${i}].code`] = '請確保有英文名稱以生成代碼'
    }

    // 檢查代碼是否重複
    const codeExists =
      formData.value.items.findIndex((c, idx) => idx !== i && c.code === item.code) !== -1

    if (codeExists) {
      validationErrors[`items[${i}].code`] = '代碼已存在，請使用不同的代碼'
      // 自動修復重複代碼
      item.code = `${item.code}_${i + 1}`
    }
  }

  return Object.keys(validationErrors).length === 0
}

// 從英文名稱生成代碼
function generateCode(item, index) {
  if (item.name_EN) {
    // 修改代碼生成邏輯，保留原始大小寫
    let code = item.name_EN
      .replace(/[^a-zA-Z0-9\s]/g, '') // 移除特殊字符但保留大小寫
      .replace(/\s+/g, '_')

    // 檢查代碼是否已存在
    const codeExists = formData.value.items.some((c, idx) => idx !== index && c.code === code)

    // 如果代碼已存在，添加索引編號
    if (codeExists) {
      code = `${code}_${index + 1}`
    }

    // 更新代碼欄位
    item.code = code
  } else if (!item.code) {
    // 如果英文名稱為空且沒有現有代碼，清空代碼
    item.code = ''
  }
}

// 提交表單
async function submitForm() {
  if (!entityStore.value) {
    error.value = '系統初始化中，請稍後再試'
    return
  }

  submitting.value = true

  try {
    if (!validateForm()) {
      submitting.value = false
      return
    }

    // 準備要送出的數據
    const toCreate = []
    const toUpdate = []

    formData.value.items.forEach((item) => {
      // 使用 toApiFormat 處理多語言格式
      const apiData = toApiFormat(item, ['name'])

      // 始終使用最新的 code，不再顯示警告或考慮恢復原始 code
      apiData.code = item.code

      apiData.isActive = item.isActive !== false
      apiData[props.parentField] = props.parentId

      if (item._id) {
        apiData._id = item._id
        toUpdate.push(apiData)
      } else {
        toCreate.push(apiData)
      }
    })

    const { apiAuth } = useApi()
    const { data } = await apiAuth.post(`/api/${props.modelType}/batch`, {
      [`${props.parentField}Id`]: props.parentId,
      toCreate,
      toUpdate,
    })

    if (!data || !data.success) {
      throw new Error(data?.message || `更新${props.itemLabel}失敗`)
    }
    // 刷新資料 (在 pinia store 和本地資料都標記為需要刷新)
    entityStore.value.fetchAll({ force: true })

    const itemName = formData.value.items[0]
      ? getItemName(formData.value.items[0])
      : props.itemLabel
    notify.notifySuccess(`${props.itemLabel}「${itemName}」已更新`)

    // 觸發刷新
    // 由事件通知父層刷新
    emit('refresh-data')
    emit('submit-success', data)
    closeDialog()
  } catch (err) {
    error.value = notify.handleApiError(err, {
      showToast: false,
      defaultMessage: '系統錯誤，請稍後再試',
    }).message
  } finally {
    submitting.value = false
  }
}
</script>
