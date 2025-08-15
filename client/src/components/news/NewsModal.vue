<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      :class="[
        cardClass,
        'w-full max-w-3xl rounded-[10px] shadow-lg p-[24px] max-h-[90vh] overflow-y-auto relative',
      ]"
    >
      <div class="flex justify-between items-center mb-[12px] lg:mb-[24px]">
        <h2 class="text-[16px] lg:text-[24px] font-bold theme-text">
          {{ isEditing ? '編輯新聞' : '新增新聞' }}
        </h2>
        <button
          @click="closeModal"
          class="p-1 rounded-full hover:bg-opacity-20"
          :class="conditionalClass('hover:bg-gray-500', 'hover:bg-gray-300')"
          title="關閉"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6 theme-text"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 加載指示器 -->
      <div
        v-if="loading"
        class="text-center py-8 flex-grow flex flex-col justify-center items-center"
      >
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-4"
          :class="conditionalClass('border-white', 'border-blue-600')"
        ></div>
        <p class="mt-4 text-lg" :class="conditionalClass('text-gray-300', 'text-slate-600')">
          正在載入資料...
        </p>
      </div>

      <!-- 表單內容 -->
      <form
        v-else
        @submit.prevent="submitForm"
        class="flex flex-col flex-grow space-y-[12px] lg:space-y-[24px] overflow-hidden"
      >
        <!-- 頁籤導航 -->
        <div class="border-b" :class="conditionalClass('border-gray-700', 'border-gray-200')">
          <nav class="flex space-x-8" aria-label="Tabs">
            <button
              v-for="tab in tabs.filter((t) => t.name !== 'seo')"
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

        <!-- 錯誤提示 (置於頁籤內容之上) -->
        <div
          v-if="formError"
          :class="[
            conditionalClass(
              'bg-red-500/20 border border-red-500 text-red-200',
              'bg-red-100 border border-red-400 text-red-700',
            ),
            'px-4 py-3 rounded-md relative mb-4',
          ]"
          role="alert"
        >
          {{ formError }}
        </div>

        <!-- 頁籤內容 (可滾動區域) -->
        <div class="space-y-[12px] lg:space-y-[24px] overflow-y-auto flex-grow">
          <!-- 基本資料 Tab -->
          <div v-show="currentTab === 'general'">
            <h3 class="text-lg mb-3 theme-text">基本資料</h3>
            <!-- 標題 -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-3">
                <label class="block theme-text">標題 *</label>
                <language-switcher v-model="titleLang" />
              </div>
              <input
                v-show="titleLang === 'TW'"
                v-model="form.title.TW"
                type="text"
                placeholder="請輸入TW標題"
                :class="[inputClass, validationErrors.title_TW ? 'border-red-500' : '']"
              />
              <input
                v-show="titleLang === 'EN'"
                v-model="form.title.EN"
                type="text"
                placeholder="Enter EN Title (Required for URL)"
                :class="[inputClass, validationErrors.title_EN ? 'border-red-500' : '']"
              />
              <div class="h-5 mt-1">
                <p v-if="validationErrors.title_TW" class="text-red-500 text-sm">
                  {{ validationErrors.title_TW }}
                </p>
                <p v-else-if="validationErrors.title_EN" class="text-red-500 text-sm">
                  {{ validationErrors.title_EN }}
                </p>
              </div>
            </div>

            <!-- 作者 -->
            <div class="grid grid-cols-2 gap-3">
              <div class="mb-6">
                <label class="block theme-text mb-3">作者 *</label>
                <input
                  v-model="form.author"
                  type="text"
                  placeholder="請輸入作者姓名"
                  :class="[inputClass, validationErrors.author ? 'border-red-500' : '']"
                />
                <p v-if="validationErrors.author" class="text-red-500 text-sm mt-1">
                  {{ validationErrors.author }}
                </p>
              </div>

              <!-- isActive (取代 Status) - 根據角色顯示 -->
              <div v-if="isAdmin" class="mb-6">
                <label for="newsIsActiveSelect" class="block theme-text mb-3">發布狀態</label>
                <select id="newsIsActiveSelect" v-model="form.isActive" :class="[inputClass]">
                  <option :value="false" class="text-black/70">待審查</option>
                  <option :value="true" class="text-black/70">已發布</option>
                </select>
              </div>
              <div v-else-if="isEditing" class="mb-6">
                <label class="block theme-text mb-1">目前狀態</label>
                <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">
                  {{ form.isActive ? '已發布' : '待審查' }}
                </p>
                <p
                  v-if="!form.isActive"
                  class="text-sm mt-1"
                  :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
                >
                  您的提交將由管理員審核。
                </p>
              </div>
              <div v-else-if="!isEditing && !isAdmin" class="mb-6">
                <label class="block theme-text mb-1">狀態</label>
                <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">待審查</p>
                <p
                  class="text-sm mt-1"
                  :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
                >
                  提交後，內容將進入審核流程。
                </p>
              </div>
            </div>

            <!-- 分類 -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label for="category" class="block theme-text mb-3">分類 *</label>
                <select
                  id="category"
                  v-model="form.category"
                  :class="[inputClass, validationErrors.category ? 'border-red-500' : '']"
                >
                  <option disabled value="" class="text-black/70">請選擇分類</option>
                  <option value="智慧方案" class="text-black/70">智慧方案</option>
                  <option value="產品介紹" class="text-black/70">產品介紹</option>
                  <option value="品牌新聞" class="text-black/70">品牌新聞</option>
                </select>
                <p v-if="validationErrors.category" class="text-red-500 text-sm mt-1">
                  {{ validationErrors.category }}
                </p>
              </div>

              <!-- 發布日期 -->
              <div>
                <label for="publishDate" class="block theme-text mb-3">發布日期 *</label>
                <input
                  type="date"
                  id="publishDate"
                  v-model="form.publishDate"
                  class="pe-3"
                  :class="inputClass"
                />
              </div>
            </div>

            <!-- 摘要 -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-3">
                <label class="block theme-text">摘要 *</label>
                <language-switcher v-model="summaryMetaLang" />
              </div>
              <textarea
                v-show="summaryMetaLang === 'TW'"
                v-model="form.summary.TW"
                rows="3"
                placeholder="請輸入摘要"
                :class="inputClass"
              ></textarea>
              <textarea
                v-show="summaryMetaLang === 'EN'"
                v-model="form.summary.EN"
                rows="3"
                placeholder="Enter Summary"
                :class="inputClass"
              ></textarea>
            </div>

            <!-- 主要圖片 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">封面圖片 *</label>
              <div
                class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                @click="triggerImageInput"
              >
                <div class="space-y-1 text-center">
                  <svg
                    v-if="!imagePreview && !form.coverImageUrl"
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
                  <img
                    v-if="imagePreview || form.coverImageUrl"
                    :src="imagePreview || form.coverImageUrl"
                    alt="圖片預覽"
                    class="mx-auto max-h-40 rounded mb-2"
                  />
                  <div
                    class="flex text-sm"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">
                      {{
                        imageFile
                          ? imageFile.name
                          : form.coverImageUrl
                            ? '當前圖片'
                            : '點擊或拖曳以上傳圖片'
                      }}
                    </p>
                  </div>
                  <p
                    v-if="!imageFile && !form.coverImageUrl"
                    class="text-xs"
                    :class="conditionalClass('text-gray-600', 'text-gray-500')"
                  >
                    PNG, JPG, GIF, WEBP up to 10MB
                  </p>
                  <button
                    v-if="imagePreview || form.coverImageUrl"
                    type="button"
                    @click.stop="removeImage"
                    class="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    移除圖片
                  </button>
                </div>
                <input
                  ref="imageInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageUpload"
                />
              </div>
            </div>
          </div>

          <!-- 內容 Tab -->
          <div v-show="currentTab === 'content'">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg theme-text">主要內容 *</h3>
              <!-- Add Block Dropdown/Button -->
              <div class="relative">
                <button
                  type="button"
                  @click="showAddBlockMenu = !showAddBlockMenu"
                  class="px-4 py-2 text-sm rounded-md flex items-center"
                  :class="
                    conditionalClass(
                      'bg-indigo-600 hover:bg-indigo-700 text-white',
                      'bg-indigo-500 hover:bg-indigo-600 text-white',
                    )
                  "
                >
                  新增區塊
                </button>
                <!-- Add Block Menu -->
                <div
                  v-if="showAddBlockMenu"
                  class="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10"
                  :class="
                    conditionalClass(
                      'bg-gray-700 ring-1 ring-black ring-opacity-5',
                      'bg-white ring-1 ring-black ring-opacity-5',
                    )
                  "
                >
                  <a
                    href="#"
                    @click.prevent="addBlock('richText')"
                    class="block px-4 py-2 text-sm theme-text hover:bg-opacity-10"
                    :class="conditionalClass('hover:bg-gray-600', 'hover:bg-gray-100')"
                    >富文本 (Rich Text)</a
                  >
                  <a
                    href="#"
                    @click.prevent="addBlock('image')"
                    class="block px-4 py-2 text-sm theme-text hover:bg-opacity-10"
                    :class="conditionalClass('hover:bg-gray-600', 'hover:bg-gray-100')"
                    >圖片 (Image)</a
                  >
                  <a
                    href="#"
                    @click.prevent="addBlock('videoEmbed')"
                    class="block px-4 py-2 text-sm theme-text hover:bg-opacity-10"
                    :class="conditionalClass('hover:bg-gray-600', 'hover:bg-gray-100')"
                    >嵌入影片 (Video)</a
                  >
                </div>
              </div>
            </div>

            <!-- Validation Error for Content (e.g., if no blocks are added) -->
            <p v-if="validationErrors.content" class="text-red-500 text-sm -mt-3 mb-3">
              {{ validationErrors.content }}
            </p>

            <!-- Content Blocks List -->
            <div class="space-y-6">
              <div
                v-for="(block, index) in form.contentBlocks"
                :key="block._tempId || block._id"
                class="p-4 border rounded-lg group relative"
                :class="[
                  conditionalClass(
                    'border-gray-700 bg-gray-800/30',
                    'border-gray-300 bg-gray-50/50',
                  ),
                  validationErrors[`content_${index}`] ? 'border-red-500' : '',
                ]"
              >
                <!-- Block Controls (Move, Delete) -->
                <div
                  class="absolute z-20 top-1/2 right-0 transform -translate-y-1/2 flex flex-col items-center space-y-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  <!-- Move Up Button -->
                  <button
                    type="button"
                    @click="moveBlock(index, -1)"
                    :disabled="index === 0"
                    class="p-1.5 rounded-md shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    :class="
                      conditionalClass(
                        'bg-gray-700 text-gray-300 hover:bg-gray-600',
                        'bg-white text-gray-500 hover:bg-gray-100 border border-gray-300',
                      )
                    "
                    title="上移"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 17a.75.75 0 01-.75-.75V5.612L5.03 9.83a.75.75 0 01-1.06-1.06l5.5-5.5a.75.75 0 011.06 0l5.5 5.5a.75.75 0 11-1.06 1.06L10.75 5.612V16.25A.75.75 0 0110 17z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <!-- Move Down Button -->
                  <button
                    type="button"
                    @click="moveBlock(index, 1)"
                    :disabled="index === form.contentBlocks.length - 1"
                    class="p-1.5 rounded-md shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    :class="
                      conditionalClass(
                        'bg-gray-700 text-gray-300 hover:bg-gray-600',
                        'bg-white text-gray-500 hover:bg-gray-100 border border-gray-300',
                      )
                    "
                    title="下移"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 3a.75.75 0 01.75.75v10.638l4.22-4.22a.75.75 0 111.06 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-5.5-5.5a.75.75 0 111.06-1.06l4.22 4.22V3.75A.75.75 0 0110 3z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <!-- Delete Button -->
                  <button
                    type="button"
                    @click="deleteBlock(index)"
                    class="p-1.5 rounded-md shadow-sm flex items-center justify-center"
                    :class="
                      conditionalClass(
                        'bg-gray-700 text-red-400 hover:bg-gray-600 hover:text-red-300',
                        'bg-white text-red-500 hover:bg-red-100 border border-gray-300',
                      )
                    "
                    title="刪除區塊"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                  </button>
                </div>

                <!-- Dynamic Block Component -->
                <component
                  :is="getBlockComponent(block.itemType)"
                  :blockData="block"
                  :modelValue="block.itemType === 'richText' ? block.richTextData : {}"
                  :initialLanguage="block._currentLang || 'TW'"
                  :blockIndex="index"
                  @update:modelValue="handleBlockRichTextUpdate(index, $event)"
                  @update:blockData="handleBlockDataUpdate(index, $event)"
                />
                <p v-if="validationErrors[`content_${index}`]" class="text-red-500 text-xs mt-1">
                  {{ validationErrors[`content_${index}`] }}
                </p>
              </div>
              <!-- Fallback if no blocks -->
              <div
                v-if="form.contentBlocks.length === 0"
                class="text-center py-10 border border-dashed rounded-lg"
                :class="
                  conditionalClass('text-gray-500 border-gray-600', 'text-gray-400 border-gray-300')
                "
              >
                點擊 "新增區塊" 開始添加內容。
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作按鈕 -->
        <div
          class="pt-4 mt-auto border-t"
          :class="conditionalClass('border-gray-700', 'border-gray-200')"
        >
          <div class="flex justify-end gap-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="
                conditionalClass(
                  'bg-gray-600 hover:bg-gray-500 text-gray-100 focus:ring-gray-500',
                  'bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400',
                )
              "
              @click="closeModal"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              :disabled="isProcessing"
            >
              <span v-if="isProcessing">
                <svg
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
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
              <span v-else>{{ isEditing ? '更新新聞' : '新增新聞' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useNewsStore } from '@/stores/newsStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { v4 as uuidv4 } from 'uuid'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'
import { useUserStore } from '@/stores/userStore'

// Dynamically import block editor components
const RichTextBlockEditor = defineAsyncComponent(
  () => import('@/components/news/RichTextBlockEditor.vue'),
)
const ImageBlockEditor = defineAsyncComponent(
  () => import('@/components/news/ImageBlockEditor.vue'),
)
const VideoBlockEditor = defineAsyncComponent(
  () => import('@/components/news/VideoBlockEditor.vue'),
)

const props = defineProps({
  show: { type: Boolean, default: false },
  newsItem: { type: Object, default: null },
})

const emit = defineEmits(['update:show', 'saved'])

const newsStore = useNewsStore()
const userStore = useUserStore()
const { cardClass, inputClass: themeInputClass, conditionalClass } = useThemeClass()
const {
  errors: validationErrors,
  clearErrors: clearValidationErrors,
  setError: setValidationError,
} = useFormValidation()

const isAdmin = computed(() => userStore.isAdmin)

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

// --- Component State ---
const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.newsItem?._id)

const currentTab = ref('general')
const tabs = [
  { name: 'general', label: '基本資料' },
  { name: 'content', label: '主要內容' },
]

// Language switchers
const titleLang = ref('TW')
const summaryMetaLang = ref('TW')

// Image handling (Cover Image)
const imageInputRef = ref(null)
const imageFile = ref(null)
const imagePreview = ref(null)

// Add Block Menu State
const showAddBlockMenu = ref(false)

// --- Form Data ---
const initialFormState = () => ({
  _id: null,
  title: { TW: '', EN: '' },
  summary: { TW: '', EN: '' },
  contentBlocks: [],
  author: '',
  category: '',
  coverImageUrl: null,
  publishDate: formatDateForInput(new Date()),
  isActive: false,
})
const form = ref(initialFormState())

// --- Block Component Mapping ---
const getBlockComponent = (itemType) => {
  switch (itemType) {
    case 'richText':
      return RichTextBlockEditor
    case 'image':
      return ImageBlockEditor
    case 'videoEmbed':
      return VideoBlockEditor
    default:
      return null // Or a default placeholder component
  }
}

// --- Block Data Update Handlers ---
const handleBlockRichTextUpdate = (index, newRichTextData) => {
  if (form.value.contentBlocks[index] && form.value.contentBlocks[index].itemType === 'richText') {
    form.value.contentBlocks[index].richTextData = newRichTextData
  }
}

const handleBlockDataUpdate = (index, newBlockData) => {
  if (form.value.contentBlocks[index]) {
    const oldBlock = form.value.contentBlocks[index]
    form.value.contentBlocks[index] = {
      ...oldBlock,
      ...newBlockData,
    }
  }
}

// --- Block Management Functions (some might be partially moved to child components later) ---
const addBlock = (itemType) => {
  const newBlock = {
    _tempId: uuidv4(),
    itemType: itemType,
    sortOrder: form.value.contentBlocks.length,
    _currentLang: 'TW',
  }

  switch (itemType) {
    case 'richText':
      newBlock.richTextData = {
        TW: { type: 'doc', content: [{ type: 'paragraph' }] },
        EN: { type: 'doc', content: [{ type: 'paragraph' }] },
      }
      break
    case 'image':
      newBlock.imageUrl = ''
      newBlock.imageAltText = { TW: '', EN: '' }
      newBlock.imageCaption = { TW: '', EN: '' }
      newBlock._newFile = null
      newBlock._previewUrl = null
      newBlock._fileInputRef = null
      break
    case 'videoEmbed':
      newBlock.videoEmbedUrl = ''
      newBlock.videoCaption = { TW: '', EN: '' }
      newBlock._newVideoFile = null
      newBlock._previewVideoUrl = null
      break
  }

  form.value.contentBlocks.push(newBlock)
  showAddBlockMenu.value = false
}

const deleteBlock = (index) => {
  if (confirm('確定要刪除這個內容區塊嗎？')) {
    const block = form.value.contentBlocks[index]
    if (block.itemType === 'image' && block._previewUrl && block._previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(block._previewUrl)
    }
    if (
      block.itemType === 'videoEmbed' &&
      block._previewVideoUrl &&
      block._previewVideoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(block._previewVideoUrl)
    }
    form.value.contentBlocks.splice(index, 1)
    form.value.contentBlocks.forEach((b, i) => (b.sortOrder = i))
  }
}

const moveBlock = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= form.value.contentBlocks.length) return

  const itemToMove = form.value.contentBlocks.splice(index, 1)[0]
  form.value.contentBlocks.splice(newIndex, 0, itemToMove)
  form.value.contentBlocks.forEach((block, i) => (block.sortOrder = i))
}

const isTiptapContentEmpty = (content) => {
  if (!content || !content.content) {
    return true
  }
  if (content.content.length === 0) {
    return true
  }
  if (
    content.content.length === 1 &&
    content.content[0].type === 'paragraph' &&
    !content.content[0].content
  ) {
    return true
  }
  return false
}

// --- Form Validation ---
const validateForm = () => {
  clearValidationErrors()
  let isValid = true

  if (!form.value.title.TW?.trim()) {
    setValidationError('title_TW', 'TW標題為必填')
    isValid = false
  }
  if (!form.value.title.EN?.trim()) {
    setValidationError('title_EN', 'EN 標題為必填，用於產生語意化路由')
    isValid = false
  }
  if (!form.value.author?.trim()) {
    setValidationError('author', '作者為必填')
    isValid = false
  }
  if (!form.value.category) {
    setValidationError('category', '分類為必填')
    isValid = false
  }

  if (form.value.contentBlocks.length === 0) {
    setValidationError('content', '主要內容至少需要一個區塊')
    isValid = false
  } else {
    form.value.contentBlocks.forEach((block, index) => {
      if (block.itemType === 'richText') {
        const isTwEmpty = isTiptapContentEmpty(block.richTextData.TW)
        const isEnEmpty = isTiptapContentEmpty(block.richTextData.EN)
        if (isTwEmpty && isEnEmpty) {
          setValidationError(`content_${index}`, '富文本區塊內容不能為空')
          isValid = false
        }
      }
      if (block.itemType === 'image') {
        if (block.imageUrl === '__NEW_CONTENT_IMAGE__' && !block._newFile) {
          console.warn(`Block ${index} marked for new image but no file attached.`)
        } else if (!block.imageUrl && !block._newFile && !block._id) {
          setValidationError(`content_${index}`, '圖片為必填')
          isValid = false
        }
      }
      if (block.itemType === 'videoEmbed') {
        if (block.videoEmbedUrl === '__NEW_CONTENT_VIDEO__' && !block._newVideoFile) {
          console.warn(`Block ${index} marked for new video but no file attached.`)
        } else if (!block.videoEmbedUrl && !block._newVideoFile && !block._id) {
          setValidationError(`content_${index}`, '影片來源 (URL或檔案) 為必填')
          isValid = false
        }
      }
    })
  }

  if (!isValid && !formError.value) {
    const firstErrorKey = Object.keys(validationErrors.value)[0]
    if (firstErrorKey) {
      // Auto-switch to the tab with the first error
      if (firstErrorKey.startsWith('content')) {
        currentTab.value = 'content'
      } else {
        currentTab.value = 'general'
      }

      // Auto-switch language tab for title
      if (firstErrorKey === 'title_EN') {
        titleLang.value = 'EN'
      } else if (firstErrorKey === 'title_TW') {
        titleLang.value = 'TW'
      }

      // Auto-switch language tab for summary
      if (firstErrorKey === 'summary_EN') {
        summaryMetaLang.value = 'EN'
      } else if (firstErrorKey === 'summary_TW') {
        summaryMetaLang.value = 'TW'
      }
    }
    formError.value = validationErrors.value[firstErrorKey] || '請檢查表單中標記的必填欄位或內容。'
  } else if (isValid) {
    formError.value = ''
  }
  return isValid
}

// --- Image Handling (Cover Image) ---
const triggerImageInput = () => imageInputRef.value?.click()

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    imageFile.value = file
    if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview.value)
    }
    imagePreview.value = URL.createObjectURL(file)
    form.value.coverImageUrl = '__NEW_COVER__'
  } else {
    if (form.value.coverImageUrl === '__NEW_COVER__') {
      form.value.coverImageUrl = props.newsItem?.coverImageUrl || null
    }
    imageFile.value = null
    if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview.value)
    }
    imagePreview.value = props.newsItem?.coverImageUrl || null
  }
  if (imageInputRef.value) imageInputRef.value.value = ''
}

const removeImage = () => {
  if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imageFile.value = null
  imagePreview.value = null
  form.value.coverImageUrl = null
}

// --- Form Submission ---
const submitForm = async () => {
  formError.value = ''
  if (!validateForm()) return

  isProcessing.value = true

  const contentImageFiles = []
  const contentVideoFiles = []

  form.value.contentBlocks.forEach((block) => {
    if (
      block.itemType === 'image' &&
      block._newFile &&
      block.imageUrl === '__NEW_CONTENT_IMAGE__'
    ) {
      contentImageFiles.push(block._newFile)
    } else if (
      block.itemType === 'videoEmbed' &&
      block._newVideoFile &&
      block.videoEmbedUrl === '__NEW_CONTENT_VIDEO__'
    ) {
      contentVideoFiles.push(block._newVideoFile)
    }
  })

  const finalContentBlocks = form.value.contentBlocks.map((block) => {
    const cleanBlock = { ...block }

    delete cleanBlock._tempId
    delete cleanBlock._currentLang
    delete cleanBlock._previewUrl
    delete cleanBlock._fileInputRef
    delete cleanBlock._newFile
    delete cleanBlock._newVideoFile
    delete cleanBlock._previewVideoUrl

    if (block.itemType === 'richText') {
      cleanBlock.richTextData = {
        TW: block.richTextData?.TW || { type: 'doc', content: [] },
        EN: block.richTextData?.EN || { type: 'doc', content: [] },
      }
      delete cleanBlock.imageUrl
      delete cleanBlock.imageAltText
      delete cleanBlock.imageCaption
      delete cleanBlock.videoEmbedUrl
      delete cleanBlock.videoCaption
    } else if (block.itemType === 'image') {
      if (block.imageUrl === '__NEW_CONTENT_IMAGE__' && !block._newFile) {
        cleanBlock.imageUrl = null // Explicitly nullify if marked new but no file.
      }
      delete cleanBlock.richTextData
      delete cleanBlock.videoEmbedUrl
      delete cleanBlock.videoCaption
    } else if (block.itemType === 'videoEmbed') {
      if (block.videoEmbedUrl === '__NEW_CONTENT_VIDEO__' && !block._newVideoFile) {
        cleanBlock.videoEmbedUrl = null
      }
      delete cleanBlock.richTextData
      delete cleanBlock.imageUrl
      delete cleanBlock.imageAltText
      delete cleanBlock.imageCaption
    }
    return cleanBlock
  })

  const useFormData =
    !!imageFile.value || contentImageFiles.length > 0 || contentVideoFiles.length > 0
  let submissionPayload

  const newsDataPayload = {
    title: form.value.title,
    summary: form.value.summary,
    content: finalContentBlocks,
    author: form.value.author,
    category: form.value.category,
    coverImageUrl: form.value.coverImageUrl,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    isActive: form.value.isActive,
  }
  if (isEditing.value && form.value._id) {
    newsDataPayload._id = form.value._id
  }

  if (useFormData) {
    submissionPayload = new FormData()
    submissionPayload.append('newsDataPayload', JSON.stringify(newsDataPayload))

    if (imageFile.value) {
      submissionPayload.append('coverImage', imageFile.value)
    }

    if (contentImageFiles.length > 0) {
      contentImageFiles.forEach((file) => {
        submissionPayload.append('contentImages', file)
      })
    }
    if (contentVideoFiles.length > 0) {
      contentVideoFiles.forEach((file) => {
        submissionPayload.append('contentVideos', file)
      })
    }
  } else {
    submissionPayload = newsDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await newsStore.update(form.value._id, submissionPayload)
    } else {
      result = await newsStore.create(submissionPayload)
    }

    if (newsStore.error) {
      const errMsg =
        newsStore.error.response?.data?.message || newsStore.error.message || '操作失敗'
      throw new Error(errMsg)
    }

    emit('saved', {
      news: result || { _id: form.value._id, ...newsDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    console.error('新聞操作失敗:', error)
    formError.value = error.message || '發生未知錯誤，請稍後再試。'
  } finally {
    isProcessing.value = false
  }
}

// --- Modal Control & Form Reset ---
const closeModal = () => {
  if (isProcessing.value) return
  if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  form.value.contentBlocks.forEach((block) => {
    if (block.itemType === 'image' && block._previewUrl && block._previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(block._previewUrl)
    }
    if (
      block.itemType === 'videoEmbed' &&
      block._previewVideoUrl &&
      block._previewVideoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(block._previewVideoUrl)
      block._previewVideoUrl = null
    }
  })
  emit('update:show', false)
}

const resetAndInitializeForm = async () => {
  loading.value = true
  formError.value = ''
  clearValidationErrors()
  isProcessing.value = false

  if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  form.value.contentBlocks.forEach((block) => {
    if (block.itemType === 'image' && block._previewUrl && block._previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(block._previewUrl)
    }
    if (
      block.itemType === 'videoEmbed' &&
      block._previewVideoUrl &&
      block._previewVideoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(block._previewVideoUrl)
    }
  })

  form.value = initialFormState()
  imageFile.value = null
  imagePreview.value = null

  titleLang.value = 'TW'
  summaryMetaLang.value = 'TW'
  currentTab.value = 'general'
  showAddBlockMenu.value = false

  if (props.newsItem?._id) {
    const item = props.newsItem
    form.value._id = item._id
    form.value.title = { TW: item.title?.TW || '', EN: item.title?.EN || '' }
    form.value.summary = { TW: item.summary?.TW || '', EN: item.summary?.EN || '' }
    form.value.author = item.author || ''
    form.value.category = item.category || ''
    form.value.coverImageUrl = item.coverImageUrl || null
    form.value.publishDate = formatDateForInput(item.publishDate)
    form.value.isActive = item.isActive || false

    if (form.value.coverImageUrl) {
      imagePreview.value = form.value.coverImageUrl
    }

    if (!form.value.title.TW && form.value.title.EN) titleLang.value = 'EN'
    if (!form.value.summary.TW && form.value.summary.EN) {
      summaryMetaLang.value = 'EN'
    }

    if (Array.isArray(item.content)) {
      form.value.contentBlocks = item.content.map((block) => {
        const newClientBlock = {
          ...block,
          _id: block._id || uuidv4(),
          _tempId: uuidv4(),
          _currentLang: 'TW',
        }
        if (block.itemType === 'image') {
          newClientBlock._newFile = null
          newClientBlock._previewUrl = block.imageUrl || null
          newClientBlock._fileInputRef = null
        } else if (block.itemType === 'richText') {
          newClientBlock.richTextData = {
            TW: block.richTextData?.TW || { type: 'doc', content: [{ type: 'paragraph' }] },
            EN: block.richTextData?.EN || { type: 'doc', content: [{ type: 'paragraph' }] },
          }
        } else if (block.itemType === 'videoEmbed') {
          newClientBlock._newVideoFile = null
          newClientBlock._previewVideoUrl =
            block.videoEmbedUrl &&
            (block.videoEmbedUrl.startsWith('blob:') || block.videoEmbedUrl.startsWith('/storage'))
              ? block.videoEmbedUrl
              : null
        }
        return newClientBlock
      })
    } else {
      form.value.contentBlocks = []
    }
  }
  loading.value = false
}

// --- Date Formatting ---
function formatDateForInput(dateStringOrDate) {
  if (!dateStringOrDate) return ''
  try {
    const date = new Date(dateStringOrDate)
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2)
    const day = ('0' + date.getDate()).slice(-2)
    return `${year}-${month}-${day}`
  } catch (e) {
    console.error('Error formatting date:', e)
    return ''
  }
}

// --- Watchers & Lifecycle ---
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      resetAndInitializeForm()
    } else {
      if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview.value)
        imagePreview.value = null
      }
      if (form.value && form.value.contentBlocks) {
        form.value.contentBlocks.forEach((block) => {
          if (
            block.itemType === 'image' &&
            block._previewUrl &&
            block._previewUrl.startsWith('blob:')
          ) {
            URL.revokeObjectURL(block._previewUrl)
            block._previewUrl = null
          }
          if (
            block.itemType === 'videoEmbed' &&
            block._previewVideoUrl &&
            block._previewVideoUrl.startsWith('blob:')
          ) {
            URL.revokeObjectURL(block._previewVideoUrl)
            block._previewVideoUrl = null
          }
        })
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (imagePreview.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  form.value.contentBlocks.forEach((block) => {
    if (block.itemType === 'image' && block._previewUrl && block._previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(block._previewUrl)
    }
    if (
      block.itemType === 'videoEmbed' &&
      block._previewVideoUrl &&
      block._previewVideoUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(block._previewVideoUrl)
    }
  })
})
</script>

<style>
/* Basic styling for tabs and toolbar, can be enhanced with Tailwind components */
.tiptap-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid; /* Gets color from conditionalClass */
  gap: 0.5rem; /* Spacing between buttons */
}
.toolbar-button {
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.toolbar-button:hover:not(.is-active) {
  background-color: rgba(128, 128, 128, 0.1);
}
.toolbar-button.is-active {
  background-color: #3b82f6; /* blue-500 */
  color: white;
}
html.dark .toolbar-button.is-active {
  background-color: #60a5fa; /* blue-400 */
  color: #1f2937;
}
.toolbar-button.remark-button.is-active {
  background-color: #a855f7; /* purple-500 */
}
html.dark .toolbar-button.remark-button.is-active {
  background-color: #c084fc;
}
.toolbar-color-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
}
.toolbar-divider {
  width: 1px;
  height: 1.25rem; /* 20px */
  background-color: #ccc;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}
html.dark .toolbar-divider {
  background-color: #555;
}

.tiptap-editor-wrapper .prose {
  max-width: none; /* Override prose max-width if needed */
  padding: 0.5rem;
}

/* Ensure editor content respects theme text color */
.tiptap-editor-wrapper .prose,
.tiptap-editor-wrapper .prose p,
.tiptap-editor-wrapper .prose h1,
.tiptap-editor-wrapper .prose h2,
.tiptap-editor-wrapper .prose h3,
.tiptap-editor-wrapper .prose h4,
.tiptap-editor-wrapper .prose h5,
.tiptap-editor-wrapper .prose h6,
.tiptap-editor-wrapper .prose strong,
.tiptap-editor-wrapper .prose em {
  color: inherit; /* Inherit from parent for theme-text to work */
}

.tiptap-editor-wrapper .prose [data-purpose='remark'] {
  font-size: 0.9em;
  opacity: 0.85;
  border-left: 3px solid;
  padding-left: 0.75em;
  margin-top: 0.8em;
  margin-bottom: 0.8em;
}
/* Conditional remark border color */
html:not(.dark) .tiptap-editor-wrapper .prose [data-purpose='remark'] {
  border-left-color: #a855f7; /* purple-500 for light mode */
}
html.dark .tiptap-editor-wrapper .prose [data-purpose='remark'] {
  border-left-color: #c084fc; /* purple-400 for dark mode */
}
</style>
