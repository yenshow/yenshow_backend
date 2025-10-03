<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      :class="[
        cardClass,
        'w-full max-w-4xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
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
        <div
          v-if="formError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-4"
        >
          {{ formError }}
        </div>

        <!-- 基本資訊 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 標題 -->
          <div>
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
          <div>
            <label class="block mb-3 theme-text">專案類型 *</label>
            <select
              v-model="formData.projectType"
              required
              :class="[inputClass, validationErrors.projectType ? 'border-red-500' : '']"
            >
              <option value="">選擇專案類型</option>
              <option value="智慧製造">智慧製造</option>
              <option value="數位轉型">數位轉型</option>
              <option value="系統整合">系統整合</option>
              <option value="數據分析">數據分析</option>
              <option value="物聯網">物聯網</option>
              <option value="人工智慧">人工智慧</option>
              <option value="其他">其他</option>
            </select>
            <p v-if="validationErrors.projectType" class="text-red-500 text-xs mt-1">
              {{ validationErrors.projectType }}
            </p>
          </div>

          <!-- 作者 -->
          <div>
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
          <div>
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
        <div>
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
        <div>
          <label class="block mb-3 theme-text">解決方案 *</label>
          <div v-for="(solution, index) in formData.solutions" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="formData.solutions[index]"
              type="text"
              required
              :class="[inputClass, 'flex-1']"
              placeholder="輸入解決方案"
            />
            <button
              v-if="formData.solutions.length > 1"
              @click="removeSolution(index)"
              type="button"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              移除
            </button>
          </div>
          <button
            @click="addSolution"
            type="button"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            新增解決方案
          </button>
        </div>

        <!-- 成效 -->
        <div>
          <label class="block mb-3 theme-text">成效 *</label>
          <div v-for="(result, index) in formData.results" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="formData.results[index]"
              type="text"
              required
              :class="[inputClass, 'flex-1']"
              placeholder="輸入成效"
            />
            <button
              v-if="formData.results.length > 1"
              @click="removeResult(index)"
              type="button"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              移除
            </button>
          </div>
          <button
            @click="addResult"
            type="button"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            新增成效
          </button>
        </div>

        <!-- 標籤 -->
        <div>
          <label class="block mb-3 theme-text">標籤</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <span
              v-for="(tag, index) in formData.tags"
              :key="index"
              class="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm"
            >
              {{ tag }}
              <button
                @click="removeTag(index)"
                type="button"
                class="ml-2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="newTag"
              type="text"
              @keyup.enter="addTag"
              :class="[inputClass, 'flex-1']"
              placeholder="輸入標籤後按 Enter"
            />
            <button
              @click="addTag"
              type="button"
              class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              新增標籤
            </button>
          </div>
        </div>

        <!-- 狀態設定 -->
        <div class="flex items-center space-x-6">
          <label class="flex items-center">
            <input v-model="formData.isActive" type="checkbox" class="mr-2" />
            <span class="text-sm theme-text">啟用</span>
          </label>
          <label class="flex items-center">
            <input v-model="formData.isFeatured" type="checkbox" class="mr-2" />
            <span class="text-sm theme-text">精選</span>
          </label>
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
import { ref, watch, computed } from 'vue'
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
const newTag = ref('')

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

const formData = ref({
  title: '',
  description: '',
  projectType: '',
  solutions: [''],
  results: [''],
  images: [],
  author: '',
  publishDate: new Date().toISOString().split('T')[0],
  tags: [],
  isActive: false,
  isFeatured: false,
  featuredOrder: 0,
})

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    projectType: '',
    solutions: [''],
    results: [''],
    images: [],
    author: '',
    publishDate: new Date().toISOString().split('T')[0],
    tags: [],
    isActive: false,
    isFeatured: false,
    featuredOrder: 0,
  }
  newTag.value = ''
  clearErrors()
  formError.value = ''
  isSubmitting.value = false
  loading.value = false
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
        results: newCaseStudy.results?.length ? [...newCaseStudy.results] : [''],
        images: newCaseStudy.images || [],
        author: newCaseStudy.author || '',
        publishDate: newCaseStudy.publishDate
          ? newCaseStudy.publishDate.split('T')[0]
          : new Date().toISOString().split('T')[0],
        tags: newCaseStudy.tags || [],
        isActive: newCaseStudy.isActive || false,
        isFeatured: newCaseStudy.isFeatured || false,
        featuredOrder: newCaseStudy.featuredOrder || 0,
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
  }
}

const addResult = () => {
  formData.value.results.push('')
}

const removeResult = (index) => {
  if (formData.value.results.length > 1) {
    formData.value.results.splice(index, 1)
  }
}

const addTag = () => {
  if (newTag.value.trim() && !formData.value.tags.includes(newTag.value.trim())) {
    formData.value.tags.push(newTag.value.trim())
    newTag.value = ''
  }
}

const removeTag = (index) => {
  formData.value.tags.splice(index, 1)
}

const closeModal = () => {
  emit('update:modelValue', false)
  resetForm()
}

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

  // 驗證解決方案和成效
  if (formData.value.solutions.every((s) => !s.trim())) {
    setError('solutions', '請至少填寫一個解決方案')
    isValid = false
  }

  if (formData.value.results.every((r) => !r.trim())) {
    setError('results', '請至少填寫一個成效')
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
    // 過濾空的解決方案和成效
    const filteredSolutions = formData.value.solutions.filter((s) => s.trim())
    const filteredResults = formData.value.results.filter((r) => r.trim())

    const submitData = {
      ...formData.value,
      solutions: filteredSolutions,
      results: filteredResults,
    }

    console.log('提交案例數據:', submitData)
    console.log('用戶 token:', userStore.token ? '存在' : '不存在')
    console.log('用戶角色:', userStore.role)

    if (isEdit.value) {
      await apiAuth.put(`/api/case-studies/${props.caseStudy._id}`, submitData)
      notify.notifySuccess('案例更新成功')
    } else {
      await apiAuth.post('/api/case-studies', submitData)
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
