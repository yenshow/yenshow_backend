<template>
  <div
    class="p-4 image-block-editor"
    :class="conditionalClass('border-gray-700 bg-gray-800/5', 'border-gray-300 bg-gray-50/30')"
  >
    <div class="flex justify-between items-center mb-2">
      <p class="text-sm font-semibold theme-text">圖片區塊</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div class="space-y-3">
      <!-- Image Upload -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
        >
          圖片檔案
        </label>
        <div
          class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
          :class="
            conditionalClass(
              'border-gray-600 hover:border-blue-500',
              'border-gray-300 hover:border-blue-400',
            )
          "
          @click="fileInputRef?.click()"
        >
          <input
            type="file"
            accept="image/*"
            :ref="(el) => (fileInputRef = el)"
            class="hidden"
            @change="handleImageFileChange"
          />
          <div class="space-y-1 text-center">
            <svg
              v-if="!hasImage"
              class="mx-auto h-12 w-12"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <img
              v-if="hasImage"
              :src="localPreviewUrl || props.blockData.imageUrl"
              alt="圖片預覽"
              class="mx-auto max-h-32 rounded mb-2 object-contain"
              :class="conditionalClass('bg-gray-700/50', 'bg-gray-200/50')"
            />
            <div
              class="flex text-sm justify-center"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
            >
              <p class="pl-1">
                {{ localFile ? localFile.name : hasImage ? '當前圖片' : '點擊或拖曳以上傳圖片' }}
              </p>
            </div>
            <p
              v-if="!hasImage"
              class="text-xs"
              :class="conditionalClass('text-gray-600', 'text-gray-500')"
            >
              PNG, JPG, GIF, WEBP
            </p>
            <button
              v-if="hasImage"
              type="button"
              @click.stop="removeImageFile"
              class="mt-2 text-xs text-red-500 hover:text-red-700"
            >
              移除圖片
            </button>
          </div>
        </div>
      </div>

      <!-- Alt Text -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >替代文字 (Alt Text) - {{ currentEditingLanguage }}</label
        >
        <input
          type="text"
          :placeholder="`替代文字 (${currentEditingLanguage})`"
          :value="props.blockData.imageAltText[currentEditingLanguage]"
          @input="updateLangField('imageAltText', currentEditingLanguage, $event.target.value)"
          :class="[inputClasses, 'text-sm']"
        />
      </div>

      <!-- Caption -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >圖片說明 (Caption) - {{ currentEditingLanguage }}</label
        >
        <input
          type="text"
          :placeholder="`圖片說明 (${currentEditingLanguage})`"
          :value="props.blockData.imageCaption[currentEditingLanguage]"
          @input="updateLangField('imageCaption', currentEditingLanguage, $event.target.value)"
          :class="[inputClasses, 'text-sm']"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'

const props = defineProps({
  blockData: {
    type: Object,
    required: true,
  },
  blockIndex: {
    type: Number,
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
const localFile = ref(null)
const localPreviewUrl = ref(null)
const fileInputRef = ref(null)

const hasImage = computed(() => {
  return !!(
    localPreviewUrl.value ||
    (props.blockData.imageUrl && props.blockData.imageUrl !== '__NEW_CONTENT_IMAGE__')
  )
})

watch(
  () => props.blockData,
  (newBlockData) => {
    if (newBlockData) {
      if (
        newBlockData.imageUrl &&
        newBlockData.imageUrl !== '__NEW_CONTENT_IMAGE__' &&
        !newBlockData.imageUrl.startsWith('blob:')
      ) {
        localPreviewUrl.value = newBlockData.imageUrl
      } else if (!newBlockData.imageUrl && !newBlockData._newFile) {
        localPreviewUrl.value = null
      }
      localFile.value = newBlockData._newFile || null
      if (
        newBlockData._previewUrl &&
        newBlockData._previewUrl.startsWith('blob:') &&
        !localPreviewUrl.value
      ) {
        localPreviewUrl.value = newBlockData._previewUrl
      }
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.initialLanguage,
  (newVal) => {
    if (newVal) currentEditingLanguage.value = newVal
  },
)

const handleImageFileChange = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    localFile.value = file
    if (localPreviewUrl.value && localPreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl.value)
    }
    localPreviewUrl.value = URL.createObjectURL(file)

    emitUpdate({
      imageUrl: '__NEW_CONTENT_IMAGE__',
      _newFile: file,
      _previewUrl: localPreviewUrl.value,
    })
  } else {
    if (props.blockData.imageUrl === '__NEW_CONTENT_IMAGE__') {
      emitUpdate({ imageUrl: null, _newFile: null, _previewUrl: null })
    }
    localFile.value = null
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const removeImageFile = () => {
  if (localPreviewUrl.value && localPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(localPreviewUrl.value)
  }
  localPreviewUrl.value = null
  localFile.value = null
  emitUpdate({ imageUrl: null, _newFile: null, _previewUrl: null })
}

const updateLangField = (field, lang, value) => {
  const updatedLangs = { ...props.blockData[field], [lang]: value }
  emitUpdate({ [field]: updatedLangs })
}

const emitUpdate = (newDataChanges) => {
  const updatedBlockData = {
    ...props.blockData,
    ...newDataChanges,
  }
  emit('update:blockData', updatedBlockData)
}
</script>
