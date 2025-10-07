<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      :class="[
        cardClass,
        'w-full max-w-3xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <button
        @click="closeModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="關閉"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEdit ? '編輯案例' : '新增案例' }}
      </h2>

      <div v-if="loading" class="text-center py-8">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
        <p class="mt-2" :class="conditionalClass('text-gray-400', 'text-slate-500')">
          正在載入資料...
        </p>
      </div>

      <form v-else @submit.prevent="submitForm" class="space-y-[12px] lg:space-y-[24px]">
        <!-- 頁籤導航 -->
        <div class="border-b" :class="conditionalClass('border-gray-700', 'border-gray-200')">
          <nav class="flex space-x-8" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.name"
              type="button"
              @click="currentTab = tab.name"
              :class="[
                currentTab === tab.name
                  ? conditionalClass(
                      'border-blue-500 text-blue-400',
                      'border-blue-600 text-blue-700',
                    )
                  : conditionalClass(
                      'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ),
                'pb-3 px-1 border-b-2 text-sm cursor-pointer',
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div
          v-if="formError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-4"
        >
          {{ formError }}
        </div>

        <!-- 頁籤內容 -->
        <div class="space-y-[12px] lg:space-y-[24px] overflow-y-auto flex-grow min-h-[400px]">
          <!-- 基本資訊 -->
          <div v-show="currentTab === 'general'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 標題 -->
              <div class="mb-2">
                <label class="block mb-3 theme-text">標題 *</label>
                <input
                  v-model="formData.title"
                  type="text"
                  required
                  :class="[inputClass, validationErrors.title ? 'border-red-500' : '']"
                  placeholder="輸入案例標題"
                />
                <p v-if="validationErrors.title" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.title }}
                </p>
              </div>

              <!-- 專案類型 -->
              <div class="mb-2">
                <label class="block mb-3 theme-text">專案類型 *</label>
                <div class="relative" ref="projectTypeDropdownRef">
                  <button
                    type="button"
                    @click="toggleProjectTypeDropdown"
                    class="flex items-center justify-between w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                    :class="[
                      inputClass,
                      validationErrors.projectType ? 'border-red-500' : '',
                      conditionalClass(
                        'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                        'border-2 border-slate-300 bg-white hover:bg-slate-50',
                      ),
                    ]"
                  >
                    <span>{{ formData.projectType || '選擇專案類型' }}</span>
                    <svg
                      class="w-4 h-4 transition-transform"
                      :class="{ 'rotate-180': isProjectTypeDropdownOpen }"
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
                    v-if="isProjectTypeDropdownOpen"
                    :class="[
                      cardClass,
                      'absolute left-0 right-0 z-20 mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                    ]"
                  >
                    <div
                      :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                      class="backdrop-blur-sm rounded-lg"
                    >
                      <button
                        type="button"
                        @click="selectProjectType('')"
                        class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                        :class="
                          conditionalClass(
                            'hover:bg-white/10 text-white',
                            'hover:bg-slate-100 text-slate-700',
                          )
                        "
                      >
                        <span>選擇專案類型</span>
                        <span v-if="!formData.projectType" class="text-blue-400">✓</span>
                      </button>
                      <button
                        v-for="type in projectTypes"
                        :key="type"
                        type="button"
                        @click="selectProjectType(type)"
                        class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                        :class="
                          conditionalClass(
                            'hover:bg-white/10 text-white',
                            'hover:bg-slate-100 text-slate-700',
                          )
                        "
                      >
                        <span>{{ type }}</span>
                        <span v-if="formData.projectType === type" class="text-blue-400">✓</span>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="validationErrors.projectType" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.projectType }}
                </p>
              </div>

              <!-- 作者 -->
              <div class="mb-6">
                <label class="block mb-3 theme-text">作者 *</label>
                <input
                  v-model="formData.author"
                  type="text"
                  required
                  :class="[inputClass, validationErrors.author ? 'border-red-500' : '']"
                  placeholder="輸入作者名稱"
                />
                <p v-if="validationErrors.author" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.author }}
                </p>
              </div>

              <!-- 發布日期 -->
              <div class="mb-6">
                <label class="block mb-3 theme-text">發布日期</label>
                <input
                  v-model="formData.publishDate"
                  type="date"
                  :class="[inputClass, validationErrors.publishDate ? 'border-red-500' : '']"
                />
                <p v-if="validationErrors.publishDate" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.publishDate }}
                </p>
              </div>
            </div>

            <!-- 描述 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">描述 *</label>
              <textarea
                v-model="formData.description"
                required
                rows="4"
                :class="[inputClass, validationErrors.description ? 'border-red-500' : '']"
                placeholder="輸入案例描述"
              ></textarea>
              <p v-if="validationErrors.description" class="text-red-500 text-xs mt-1">
                {{ validationErrors.description }}
              </p>
            </div>

            <!-- 解決方案 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">解決方案 *</label>

              <div
                v-for="(solution, index) in formData.solutions"
                :key="index"
                class="flex items-center mb-3"
              >
                <input
                  v-model="formData.solutions[index]"
                  type="text"
                  required
                  :class="[
                    inputClass,
                    'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px]',
                  ]"
                  placeholder="請輸入解決方案"
                />
                <div class="flex ml-2">
                  <button
                    type="button"
                    @click="removeSolution(index)"
                    class="p-2 text-red-500 hover:text-red-400 cursor-pointer"
                    title="移除解決方案"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <button
                type="button"
                @click="addSolution"
                class="mt-3 flex items-center text-[#3490dc] hover:text-[#2779bd] cursor-pointer"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                新增解決方案
              </button>
            </div>
          </div>

          <!-- 附加檔案 -->
          <div v-show="currentTab === 'attachments'">
            <!-- 圖片上傳 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">圖片 (可上傳多張)</label>
              <div
                class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                @click="triggerImageInput"
              >
                <div class="space-y-1 text-center">
                  <svg
                    class="mx-auto h-12 w-12"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <div
                    class="flex text-sm"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">點擊或拖曳以上傳圖片</p>
                  </div>
                  <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                    PNG, JPG, GIF, WEBP, SVG
                  </p>
                </div>
                <input
                  ref="imageInputRef"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleImageFiles"
                />
              </div>
              <!-- 預覽區域 -->
              <div
                v-if="formData.images.length > 0 || imageFiles.length > 0"
                class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              >
                <!-- 現有圖片 -->
                <div
                  v-for="(url, index) in formData.images"
                  :key="`existing-${index}`"
                  class="relative group"
                >
                  <img
                    :src="url"
                    alt="Existing image"
                    class="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    @click.stop="removeExistingImage(index)"
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-75 group-hover:opacity-100"
                  >
                    &#x2715;
                  </button>
                </div>
                <!-- 新上傳圖片 -->
                <div
                  v-for="(file, index) in imageFiles"
                  :key="`new-${index}`"
                  class="relative group"
                >
                  <img
                    :src="file.previewUrl"
                    alt="New image"
                    class="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    @click.stop="removeNewImage(index)"
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-75 group-hover:opacity-100"
                  >
                    &#x2715;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 狀態設定 -->
        <div class="mb-6 flex items-center">
          <input
            id="caseStudyIsActive"
            type="checkbox"
            v-model="formData.isActive"
            class="h-4 w-4 rounded mr-2"
            :class="
              conditionalClass(
                'border-gray-600 text-blue-500 bg-gray-700 focus:ring-blue-600',
                'border-gray-300 text-blue-600 bg-blue-100 focus:ring-blue-500 focus:border-blue-500',
              )
            "
          />
          <label for="caseStudyIsActive" class="theme-text font-medium">啟用案例</label>
        </div>

        <!-- 按鈕 -->
        <div
          class="flex justify-end space-x-3 pt-4 border-t"
          :class="conditionalClass('border-gray-700', 'border-gray-200')"
        >
          <button
            type="button"
            @click="closeModal"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            :class="
              conditionalClass(
                'bg-gray-600 hover:bg-gray-500 text-gray-200',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              )
            "
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <span v-if="isSubmitting">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              處理中...
            </span>
            <span v-else>{{ isEdit ? '更新案例' : '新增案例' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount, onMounted } from 'vue'
import { useApi } from '@/composables/axios'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { useSiteStore } from '@/stores/siteStore'
import { useUserStore } from '@/stores/userStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  caseStudy: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'success'])

const { apiAuth } = useApi()
const notify = useNotifications()
const { cardClass, inputClass: themeInputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()
const siteStore = useSiteStore()
const userStore = useUserStore()

// 確保設置為 comeo site
siteStore.setSite('comeo')

const isEdit = computed(() => !!props.caseStudy)
const isSubmitting = ref(false)
const loading = ref(false)
const formError = ref('')

// 分頁相關
const currentTab = ref('general')
const tabs = [
  { name: 'general', label: '基本資訊' },
  { name: 'attachments', label: '附加檔案' },
]

// 圖片上傳相關
const imageFiles = ref([])
const imageInputRef = ref(null)

// 專案類型下拉選單相關
const projectTypeDropdownRef = ref(null)
const isProjectTypeDropdownOpen = ref(false)
const projectTypes = ref([
  '智慧製造',
  '數位轉型',
  '系統整合',
  '數據分析',
  '物聯網',
  '人工智慧',
  '其他',
])

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

const formData = ref({
  title: '',
  description: '',
  projectType: '',
  solutions: [''],
  images: [],
  author: '',
  publishDate: new Date().toISOString().split('T')[0],
  isActive: false,
})

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    projectType: '',
    solutions: [''],
    images: [],
    author: '',
    publishDate: new Date().toISOString().split('T')[0],
    isActive: false,
  }
  imageFiles.value = []
  if (imageInputRef.value) imageInputRef.value.value = ''
  clearErrors()
  formError.value = ''
  isSubmitting.value = false
  loading.value = false
  currentTab.value = 'general'
}

// 監聽案例資料變化
watch(
  () => props.caseStudy,
  (newCaseStudy) => {
    if (newCaseStudy) {
      formData.value = {
        title: newCaseStudy.title || '',
        description: newCaseStudy.description || '',
        projectType: newCaseStudy.projectType || '',
        solutions: newCaseStudy.solutions?.length ? [...newCaseStudy.solutions] : [''],
        images: newCaseStudy.images || [],
        author: newCaseStudy.author || '',
        publishDate: newCaseStudy.publishDate
          ? newCaseStudy.publishDate.split('T')[0]
          : new Date().toISOString().split('T')[0],
        isActive: newCaseStudy.isActive || false,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const addSolution = () => {
  formData.value.solutions.push('')
}

const removeSolution = (index) => {
  if (formData.value.solutions.length > 1) {
    formData.value.solutions.splice(index, 1)
  } else {
    formData.value.solutions = ['']
  }
}

// 專案類型下拉選單操作函數
const toggleProjectTypeDropdown = () => {
  isProjectTypeDropdownOpen.value = !isProjectTypeDropdownOpen.value
}

const selectProjectType = (type) => {
  formData.value.projectType = type
  isProjectTypeDropdownOpen.value = false
}

// 圖片上傳相關函數
const triggerImageInput = () => imageInputRef.value?.click()

const handleImageFiles = (event) => {
  const files = Array.from(event.target.files)
  files.forEach((file) => {
    const fileWithPreview = Object.assign(file, {
      previewUrl: URL.createObjectURL(file),
    })
    imageFiles.value.push(fileWithPreview)
  })
  if (imageInputRef.value) imageInputRef.value.value = ''
}

const removeNewImage = (index) => {
  URL.revokeObjectURL(imageFiles.value[index].previewUrl)
  imageFiles.value.splice(index, 1)
}

const removeExistingImage = (index) => {
  formData.value.images.splice(index, 1)
}

const closeModal = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (projectTypeDropdownRef.value && !projectTypeDropdownRef.value.contains(event.target)) {
    isProjectTypeDropdownOpen.value = false
  }
}

// 清理預覽 URL
onBeforeUnmount(() => {
  imageFiles.value.forEach((file) => URL.revokeObjectURL(file.previewUrl))
  document.removeEventListener('click', handleClickOutside)
})

// 添加事件監聽器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

const validateForm = () => {
  clearErrors()
  let isValid = true

  if (!formData.value.title?.trim()) {
    setError('title', '標題為必填項')
    isValid = false
  }

  if (!formData.value.description?.trim()) {
    setError('description', '描述為必填項')
    isValid = false
  }

  if (!formData.value.projectType) {
    setError('projectType', '專案類型為必填項')
    isValid = false
  }

  if (!formData.value.author?.trim()) {
    setError('author', '作者為必填項')
    isValid = false
  }

  // 驗證解決方案
  if (formData.value.solutions.every((s) => !s.trim())) {
    setError('solutions', '請至少填寫一個解決方案')
    isValid = false
  }

  if (!isValid && !formError.value) {
    const firstErrorKey = Object.keys(validationErrors.value)[0]
    if (firstErrorKey) {
      formError.value = validationErrors.value[firstErrorKey] || '表單包含錯誤，請檢查。'
    }
  } else if (isValid) {
    formError.value = ''
  }

  return isValid
}

const submitForm = async () => {
  clearErrors()
  if (!validateForm()) return

  isSubmitting.value = true
  formError.value = ''

  try {
    // 過濾空的解決方案
    const filteredSolutions = formData.value.solutions.filter((s) => s.trim())

    const hasNewFiles = imageFiles.value.length > 0

    let submitData
    if (hasNewFiles) {
      // 如果有新檔案，使用 FormData
      const formDataPayload = new FormData()

      // 添加新圖片
      imageFiles.value.forEach((file) => {
        formDataPayload.append('images', file)
      })

      // 添加其他表單資料
      const caseStudyData = {
        ...formData.value,
        solutions: filteredSolutions,
      }
      formDataPayload.append('caseStudyData', JSON.stringify(caseStudyData))

      submitData = formDataPayload
    } else {
      // 沒有新檔案，直接傳送 JSON
      submitData = {
        ...formData.value,
        solutions: filteredSolutions,
      }
    }

    console.log('提交案例數據:', submitData)
    console.log('用戶 token:', userStore.token ? '存在' : '不存在')
    console.log('用戶角色:', userStore.role)

    if (isEdit.value) {
      await apiAuth.put(`/api/case-studies/${props.caseStudy._id}`, submitData, {
        headers: hasNewFiles ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      notify.notifySuccess('案例更新成功')
    } else {
      await apiAuth.post('/api/case-studies', submitData, {
        headers: hasNewFiles ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      notify.notifySuccess('案例建立成功')
    }

    emit('success')
    closeModal()
  } catch (error) {
    console.error('提交表單時發生錯誤:', error)
    console.error('錯誤詳情:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      headers: error.config?.headers,
    })

    formError.value = error.response?.data?.message || '操作失敗，請稍後再試'
    notify.notifyError(formError.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>
