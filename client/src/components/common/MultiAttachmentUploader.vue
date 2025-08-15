<template>
  <div class="multi-attachment-uploader">
    <!-- Image Previews -->
    <div
      v-if="attachmentType === 'image' && manager.previews.value.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3"
    >
      <div
        v-for="preview in manager.previews.value"
        :key="preview.tempId"
        class="relative group aspect-square"
      >
        <img
          :src="preview.isNew ? preview.blobUrl : preview.url"
          :alt="preview.fileName || '圖片預覽'"
          class="w-full h-full object-cover rounded-md border"
          :class="themeConditionalClass('border-gray-700', 'border-gray-300')"
        />
        <button
          type="button"
          @click="manager.removePreview(preview)"
          class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 text-xs opacity-80 group-hover:opacity-100 transition-opacity"
          title="移除圖片"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Video Previews -->
    <div
      v-if="attachmentType === 'video' && manager.previews.value.length > 0"
      class="space-y-2 mb-3"
    >
      <div
        v-for="preview in manager.previews.value"
        :key="preview.tempId"
        class="flex flex-col p-2 border rounded-md text-sm"
        :class="
          themeConditionalClass('border-gray-700 bg-gray-800/30', 'border-gray-300 bg-gray-100')
        "
      >
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center min-w-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5 mr-2 flex-shrink-0"
              :class="themeConditionalClass('text-purple-400', 'text-purple-600')"
            >
              <path
                d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.379.22.53l3 3a.75.75 0 001.28-.53V4.75z"
              />
            </svg>
            <span class="truncate theme-text-subtle" :title="preview.fileName">{{
              preview.fileName
            }}</span>
          </div>
          <button
            type="button"
            @click="manager.removePreview(preview)"
            class="text-red-500 hover:text-red-700 flex-shrink-0"
            title="移除影片"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div v-if="preview.isNew && preview.blobUrl" class="mt-2 w-full">
          <video
            controls
            :src="preview.blobUrl"
            class="max-w-full h-auto rounded border"
            :class="themeConditionalClass('border-gray-700', 'border-gray-300')"
          ></video>
        </div>
        <p
          v-else-if="!preview.isNew && preview.url"
          class="mt-1 text-xs theme-text-accent truncate"
        >
          已儲存: {{ preview.url }}
        </p>
      </div>
    </div>

    <!-- Document Previews -->
    <div
      v-if="attachmentType === 'document' && manager.previews.value.length > 0"
      class="space-y-2 mb-3"
    >
      <div
        v-for="preview in manager.previews.value"
        :key="preview.tempId"
        class="flex items-center justify-between p-2 border rounded-md text-sm"
        :class="
          themeConditionalClass('border-gray-700 bg-gray-800/30', 'border-gray-300 bg-gray-100')
        "
      >
        <div class="flex items-center min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-2 flex-shrink-0"
            :class="themeConditionalClass('text-blue-400', 'text-blue-500')"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="truncate theme-text-subtle" :title="preview.fileName">{{
            preview.fileName
          }}</span>
        </div>
        <button
          type="button"
          @click="manager.removePreview(preview)"
          class="text-red-500 hover:text-red-700 flex-shrink-0"
          title="移除文件"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Upload Button -->
    <button
      type="button"
      @click="manager.triggerInput"
      :class="[
        inputBaseClass,
        'w-full text-sm border-dashed hover:border-blue-500 py-4 transition-colors',
        themeConditionalClass(
          'hover:border-blue-400 dark:hover:border-blue-500',
          'hover:border-blue-600 dark:hover:border-blue-500',
        ),
        manager.previews.value.length > 0
          ? themeConditionalClass('border-green-600 dark:border-green-500', 'border-green-500')
          : themeConditionalClass('border-gray-600 dark:border-gray-500', 'border-gray-400'),
      ]"
    >
      {{
        manager.previews.value.length > 0
          ? `已選擇 ${manager.previews.value.length} ${getAttachmentTypeLabel(
              attachmentType,
              true,
            )}，點此添加更多`
          : `點擊選擇${getAttachmentTypeLabel(attachmentType, false)}`
      }}
    </button>

    <!-- Hidden File Input -->
    <input
      type="file"
      :ref="manager.inputRef"
      multiple
      :accept="manager.accept"
      @change="manager.handleUpload"
      class="hidden"
    />
  </div>
</template>

<script setup>
defineProps({
  manager: {
    type: Object,
    required: true,
  },
  attachmentType: {
    type: String, // 'image', 'video', 'document'
    required: true,
  },
  themeConditionalClass: {
    type: Function,
    required: true,
  },
  inputBaseClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const getAttachmentTypeLabel = (type, plural = false) => {
  switch (type) {
    case 'image':
      return plural ? '張圖片' : '圖片'
    case 'video':
      return plural ? '部影片' : '影片'
    case 'document':
      return plural ? '個文件' : '文件'
    default:
      return plural ? '個檔案' : '檔案'
  }
}
</script>
