<template>
  <div
    class="p-4 document-block-editor"
    :class="conditionalClass('border-gray-700 bg-gray-800/5', 'border-gray-300 bg-gray-50/30')"
  >
    <div class="flex justify-between items-center mb-2">
      <p class="text-sm font-semibold theme-text">文件區塊</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div class="space-y-3">
      <!-- Document Upload -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
        >
          文件檔案
        </label>

        <!-- File Upload Area -->
        <div
          class="mt-1 flex flex-col items-center justify-center px-6 py-3 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
          :class="conditionalClass('border-gray-600', 'border-gray-300')"
          @click="triggerDocumentFileInput"
        >
          <input
            type="file"
            accept=".pdf"
            ref="documentInputRef"
            class="hidden"
            @change="handleDocumentFileChange"
          />
          <div class="space-y-1 text-center">
            <svg
              v-if="!hasDocument"
              class="mx-auto h-10 w-10"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div
              v-if="hasDocument"
              class="mx-auto w-16 h-16 flex items-center justify-center rounded mb-2"
              :class="conditionalClass('bg-gray-700/50', 'bg-gray-200/50')"
            >
              <svg
                class="w-8 h-8"
                :class="conditionalClass('text-gray-300', 'text-gray-600')"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
              </svg>
            </div>
            <div
              class="flex text-sm justify-center"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
            >
              <p class="pl-1">
                {{ currentDocumentFileName || '點擊或拖曳以上傳文件' }}
              </p>
            </div>
            <p
              v-if="!currentDocumentFileName"
              class="text-xs"
              :class="conditionalClass('text-gray-600', 'text-gray-500')"
            >
              PDF 格式
            </p>
          </div>
        </div>
        <button
          v-if="
            isLocalFileSelected ||
            (blockData.documentUrl && blockData.documentUrl.startsWith('/storage/'))
          "
          type="button"
          @click="removeDocumentFile"
          class="mt-2 text-xs text-red-500 hover:text-red-700"
        >
          移除目前文件
        </button>
      </div>

      <!-- Document Preview -->
      <div v-if="hasDocument && currentDocumentFileName" class="mt-3">
        <p
          class="text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
        >
          文件資訊:
        </p>
        <div
          class="p-3 border rounded"
          :class="conditionalClass('border-gray-600 bg-gray-700/20', 'border-gray-300 bg-gray-50')"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="w-5 h-5"
              :class="conditionalClass('text-red-400', 'text-red-500')"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
              />
            </svg>
            <div>
              <p class="text-sm font-medium theme-text">{{ currentDocumentFileName }}</p>
              <p class="text-xs" :class="conditionalClass('text-gray-400', 'text-gray-600')">
                PDF 文件
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Document Description -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >文件描述 - {{ currentEditingLanguage }}</label
        >
        <input
          type="text"
          :placeholder="`文件描述 (${currentEditingLanguage})`"
          :value="blockData.documentDescription[currentEditingLanguage]"
          @input="
            updateLangField('documentDescription', currentEditingLanguage, $event.target.value)
          "
          :class="[inputClasses, 'text-sm']"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'

const props = defineProps({
  blockData: {
    type: Object,
    required: true,
  },
  initialLanguage: {
    type: String,
    default: 'TW',
  },
})

const emit = defineEmits(['update:blockData'])
const { conditionalClass, inputClass: themeInputClass } = useThemeClass()

const inputClasses = computed(() => [
  themeInputClass.value,
  'w-full rounded-[8px] ps-[10px] py-[6px] text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
])

const currentEditingLanguage = ref(props.initialLanguage || 'TW')
const documentInputRef = ref(null)

// Computed properties for clarity
const isLocalFileSelected = computed(() => !!props.blockData._newDocumentFile)

const hasDocument = computed(() => {
  return props.blockData._newDocumentFile || props.blockData.documentUrl
})

const currentDocumentFileName = computed(() => {
  if (props.blockData._newDocumentFile) return props.blockData._newDocumentFile.name
  if (props.blockData.documentUrl && props.blockData.documentUrl.startsWith('/storage/')) {
    return getFileNameFromPath(props.blockData.documentUrl)
  }
  return null
})

watch(
  () => props.blockData,
  (newData) => {
    // Handle document data changes
    if (!newData.documentUrl && !newData._newDocumentFile) {
      // Document was removed
    }
  },
  { immediate: true, deep: true },
)

const triggerDocumentFileInput = () => {
  documentInputRef.value?.click()
}

const handleDocumentFileChange = (event) => {
  const file = event.target.files[0]
  let newBlockData = {}

  if (file && file.type === 'application/pdf') {
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超過 50MB')
      return
    }

    newBlockData = {
      documentUrl: '__NEW_CONTENT_DOCUMENT__', // Mark for new upload
      _newDocumentFile: file,
    }
  } else if (file) {
    alert('只允許上傳 PDF 文件')
    return
  } else {
    // If file selection is cancelled, revert to previous state or clear
    if (props.blockData.documentUrl === '__NEW_CONTENT_DOCUMENT__') {
      newBlockData = { documentUrl: null, _newDocumentFile: null }
    }
  }

  emitUpdate(newBlockData)
  if (documentInputRef.value) documentInputRef.value.value = '' // Reset file input
}

const removeDocumentFile = () => {
  // Removes a locally selected file OR marks server file for deletion
  emitUpdate({
    documentUrl: null, // This will signal to backend to delete if it was a server path
    _newDocumentFile: null,
  })
}

const getFileNameFromPath = (path) => {
  if (!path) return ''
  try {
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1))
  } catch {
    return path.substring(path.lastIndexOf('/') + 1)
  }
}

const updateLangField = (field, lang, value) => {
  const updatedLangs = { ...(props.blockData[field] || {}), [lang]: value }
  emitUpdate({ [field]: updatedLangs })
}

const emitUpdate = (newDataChanges) => {
  const updatedBlockData = {
    ...props.blockData,
    ...newDataChanges,
    _currentLang: currentEditingLanguage.value, // Ensure lang is passed up
  }
  emit('update:blockData', updatedBlockData)
}

onBeforeUnmount(() => {
  // Clean up any resources if needed
})
</script>
