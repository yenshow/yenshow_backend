<template>
  <div
    class="p-4 video-block-editor"
    :class="conditionalClass('border-gray-700 bg-gray-800/5', 'border-gray-300 bg-gray-50/30')"
  >
    <div class="flex justify-between items-center mb-2">
      <p class="text-sm font-semibold theme-text">影片區塊 (URL 或 上傳)</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div class="space-y-3">
      <!-- Video Source: URL or Upload -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
        >
          影片來源
        </label>

        <!-- URL Input -->
        <input
          type="url"
          placeholder="貼上影片 URL (例如 YouTube, Vimeo)"
          :value="hasExternalHttpUrl ? blockData.videoEmbedUrl : ''"
          @input="handleUrlInput($event.target.value)"
          :disabled="isLocalFileSelected || isMarkedForNewUpload"
          :class="[
            inputClasses,
            'text-sm w-full mb-1',
            isLocalFileSelected || isMarkedForNewUpload
              ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
              : '',
          ]"
        />

        <!-- File Upload Area -->
        <div
          v-if="!hasExternalHttpUrl"
          class="mt-1 flex flex-col items-center justify-center px-6 py-3 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
          :class="conditionalClass('border-gray-600', 'border-gray-300')"
          @click="triggerVideoFileInput"
        >
          <input
            type="file"
            accept="video/*"
            ref="videoInputRef"
            class="hidden"
            @change="handleVideoFileChange"
          />
          <div class="space-y-1 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="mx-auto h-10 w-10"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
            >
              <path
                d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.379.22.53l3 3a.75.75 0 001.28-.53V4.75z"
              />
            </svg>
            <div
              class="flex text-sm justify-center"
              :class="conditionalClass('text-gray-500', 'text-gray-400')"
            >
              <p class="pl-1">
                {{ currentVideoFileName || '點擊或拖曳以上傳影片' }}
              </p>
            </div>
            <p
              v-if="!currentVideoFileName"
              class="text-xs"
              :class="conditionalClass('text-gray-600', 'text-gray-500')"
            >
              MP4, WEBM, MOV 等
            </p>
          </div>
        </div>
        <button
          v-if="
            isLocalFileSelected ||
            (blockData.videoEmbedUrl && blockData.videoEmbedUrl.startsWith('/storage/'))
          "
          type="button"
          @click="removeVideoFile"
          class="mt-2 text-xs text-red-500 hover:text-red-700"
        >
          移除目前影片檔案
        </button>
        <p
          v-if="hasExternalHttpUrl"
          class="text-xs mt-1 px-1 py-1 rounded-md"
          :class="conditionalClass('bg-sky-700/40 text-sky-200', 'bg-sky-100 text-sky-700')"
        >
          目前使用外部影片連結。
          <button
            type="button"
            @click="clearExternalUrl"
            class="ml-2 font-semibold hover:underline"
          >
            清除連結以啟用上傳
          </button>
        </p>
      </div>

      <!-- Video Preview -->
      <div v-if="previewSrc" class="mt-3">
        <p
          class="text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
        >
          影片預覽:
        </p>
        <div
          v-if="isEmbedLink(previewSrc)"
          class="p-1 border rounded aspect-video"
          :class="conditionalClass('border-gray-600', 'border-gray-300')"
        >
          <iframe
            width="100%"
            height="100%"
            :src="previewSrc"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="影片預覽"
          ></iframe>
        </div>
        <div
          v-else-if="previewSrc.startsWith('blob:') || previewSrc.startsWith('/storage/')"
          class="p-1 border rounded aspect-video"
          :class="conditionalClass('border-gray-600', 'border-gray-300')"
        >
          <video controls width="100%" height="100%" :src="previewSrc" title="影片預覽"></video>
        </div>
        <p
          v-if="currentVideoFileName && currentVideoFileName.toLowerCase().endsWith('.wmv')"
          class="text-xs mt-1 px-1"
          :class="conditionalClass('text-orange-400', 'text-orange-500')"
        >
          提示：WMV 檔案可能無法在此瀏覽器中預覽。建議使用 MP4 等通用格式以獲得最佳體驗。
        </p>
      </div>
      <p
        v-else-if="
          blockData.videoEmbedUrl &&
          !previewSrc &&
          !isLocalFileSelected &&
          !blockData.videoEmbedUrl.startsWith('/storage/')
        "
        class="mt-2 text-xs px-3 py-1.5 rounded"
        :class="
          conditionalClass('text-yellow-400 bg-yellow-700/30', 'text-yellow-600 bg-yellow-200/50')
        "
      >
        無法預覽此影片URL，請確保它是有效的嵌入連結。
      </p>

      <!-- Video Caption -->
      <div>
        <label
          class="block text-xs font-medium mb-1"
          :class="conditionalClass('text-gray-400', 'text-gray-600')"
          >影片說明 (Caption) - {{ currentEditingLanguage }}</label
        >
        <input
          type="text"
          :placeholder="`影片說明 (${currentEditingLanguage})`"
          :value="blockData.videoCaption[currentEditingLanguage]"
          @input="updateLangField('videoCaption', currentEditingLanguage, $event.target.value)"
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
const videoInputRef = ref(null)

// Computed properties for clarity
const isLocalFileSelected = computed(() => !!props.blockData._newVideoFile)
const isMarkedForNewUpload = computed(
  () => props.blockData.videoEmbedUrl === '__NEW_CONTENT_VIDEO__',
)
const hasExternalHttpUrl = computed(
  () => props.blockData.videoEmbedUrl && props.blockData.videoEmbedUrl.startsWith('http'),
)

const currentVideoFileName = computed(() => {
  if (props.blockData._newVideoFile) return props.blockData._newVideoFile.name
  if (
    props.blockData.videoEmbedUrl &&
    props.blockData.videoEmbedUrl.startsWith('/storage/') &&
    !hasExternalHttpUrl.value
  ) {
    return getFileNameFromPath(props.blockData.videoEmbedUrl)
  }
  return null
})

const previewSrc = computed(() => {
  if (props.blockData._previewVideoUrl) return props.blockData._previewVideoUrl // Local blob preview from parent
  if (props.blockData.videoEmbedUrl && props.blockData.videoEmbedUrl !== '__NEW_CONTENT_VIDEO__') {
    if (props.blockData.videoEmbedUrl.startsWith('http')) {
      return getEmbeddableUrl(props.blockData.videoEmbedUrl)
    }
    // Assumes it's a direct /storage/ path from server or a blob URL passed if parent didn't clean up (less ideal)
    return props.blockData.videoEmbedUrl
  }
  return null
})

watch(
  () => props.blockData,
  (newData) => {
    if (newData._previewVideoUrl) {
      // from parent (NewsModal)
      // localVideoPreviewUrl.value = newData._previewVideoUrl
    } else if (newData.videoEmbedUrl && newData.videoEmbedUrl.startsWith('blob:')) {
      // This case should ideally not happen if parent clears _previewVideoUrl properly
      // localVideoPreviewUrl.value = newData.videoEmbedUrl
    } else if (!newData.videoEmbedUrl && !newData._newVideoFile) {
      if (
        props.blockData._previewVideoUrl &&
        props.blockData._previewVideoUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(props.blockData._previewVideoUrl)
      }
      // localVideoPreviewUrl.value = null
    }
    // If blockData.videoEmbedUrl is a server path and there's no local file/preview, ensure local preview is null
    if (
      newData.videoEmbedUrl &&
      !newData.videoEmbedUrl.startsWith('blob:') &&
      !newData._newVideoFile
    ) {
      if (
        props.blockData._previewVideoUrl &&
        props.blockData._previewVideoUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(props.blockData._previewVideoUrl)
      }
      // localVideoPreviewUrl.value = null
    }
  },
  { immediate: true, deep: true },
)

const triggerVideoFileInput = () => {
  videoInputRef.value?.click()
}

const handleUrlInput = (value) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    emitUpdate({
      videoEmbedUrl: null,
      _newVideoFile: null,
      _previewVideoUrl: null,
    })
    return
  }

  // Attempt to convert to an embeddable URL immediately
  const embeddableUrl = getEmbeddableUrl(trimmedValue)
  const finalUrl = embeddableUrl || trimmedValue // Use converted URL if successful, otherwise keep original for user to correct

  emitUpdate({
    videoEmbedUrl: finalUrl,
    _newVideoFile: null,
    _previewVideoUrl: null,
  })
}

const handleVideoFileChange = (event) => {
  const file = event.target.files[0]
  let newBlockData = {}
  if (file && file.type.startsWith('video/')) {
    const newPreviewUrl = URL.createObjectURL(file)
    newBlockData = {
      videoEmbedUrl: '__NEW_CONTENT_VIDEO__', // Mark for new upload
      _newVideoFile: file,
      _previewVideoUrl: newPreviewUrl,
      // videoCaption: { ...props.blockData.videoCaption }, // Caption is separate
    }
  } else {
    // If file selection is cancelled or invalid file type, revert to previous state or clear
    // If it was marked for upload, clear it entirely
    if (props.blockData.videoEmbedUrl === '__NEW_CONTENT_VIDEO__') {
      newBlockData = { videoEmbedUrl: null, _newVideoFile: null, _previewVideoUrl: null }
    }
    // If there was an existing server URL, it remains untouched unless explicitly cleared by URL input
  }
  emitUpdate(newBlockData)
  if (videoInputRef.value) videoInputRef.value.value = '' // Reset file input
}

const removeVideoFile = () => {
  // Removes a locally selected file OR marks server file for deletion
  if (props.blockData._previewVideoUrl && props.blockData._previewVideoUrl.startsWith('blob:')) {
    URL.revokeObjectURL(props.blockData._previewVideoUrl)
  }
  emitUpdate({
    videoEmbedUrl: null, // This will signal to backend to delete if it was a server path
    _newVideoFile: null,
    _previewVideoUrl: null,
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

const isEmbedLink = (url) => {
  if (!url) return false
  return (
    url.startsWith('https://www.youtube.com/embed/') ||
    url.startsWith('https://player.vimeo.com/video/')
  )
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

// Renamed function to avoid conflict with computed prop
const getEmbeddableUrl = (url) => {
  if (!url) return null

  // YouTube: Grabs ID from youtu.be, youtube.com/watch, youtube.com/embed, and shorts
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  const youtubeMatch = url.match(youtubeRegex)
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }

  // Vimeo: Grabs ID from vimeo.com
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/
  const vimeoMatch = url.match(vimeoRegex)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  // If it's already an embed link, return it as is.
  if (isEmbedLink(url)) {
    return url
  }

  return null // Return null if no valid embeddable URL can be created
}

const clearExternalUrl = () => {
  emitUpdate({
    videoEmbedUrl: null,
    _newVideoFile: null,
    _previewVideoUrl: null,
  })
}

onBeforeUnmount(() => {
  if (props.blockData._previewVideoUrl && props.blockData._previewVideoUrl.startsWith('blob:')) {
    URL.revokeObjectURL(props.blockData._previewVideoUrl)
  }
})
</script>
