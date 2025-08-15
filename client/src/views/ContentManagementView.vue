<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">內容管理</h1>
    </div>

    <!-- Tab 切換按鈕 -->
    <div
      class="flex mb-6 border-b"
      :class="conditionalClass('border-gray-700', 'border-slate-200')"
    >
      <button
        @click="setActiveTab('news')"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'news'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        最新消息
      </button>
      <button
        @click="setActiveTab('faq')"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'faq'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        常見問題
      </button>
    </div>

    <!-- 錯誤提示 -->
    <div
      v-if="error"
      class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6"
    >
      {{ error }}
      <button @click="error = ''" class="float-right text-red-100 hover:text-white">&times;</button>
    </div>

    <!-- 載入中提示（延遲顯示，減少閃爍） -->
    <div v-if="showLoading" class="flex flex-col items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 mb-4"
        :class="conditionalClass('border-white', 'border-blue-600')"
      ></div>
      <p :class="conditionalClass('text-gray-300', 'text-slate-500')">正在載入資料...</p>
    </div>

    <!-- 內容管理區塊 -->
    <div v-else :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">
          {{ activeTab === 'news' ? '消息列表' : '問題列表' }}
        </h2>
        <button
          @click="handleAddItem"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增{{ activeTab === 'news' ? '消息' : '問題' }}
        </button>
      </div>

      <!-- 最新消息列表 -->
      <div
        v-if="activeTab === 'news'"
        :class="[
          'min-h-[580px]',
          { 'overflow-x-auto': !isCategoryDropdownOpen && !isSortDropdownOpen },
        ]"
      >
        <table class="w-full text-center">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">標題 (TW)</th>
              <th class="py-3 px-4 lg:px-6 relative" ref="categoryDropdownRef">
                <button
                  @click="toggleCategoryDropdown"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                  :class="
                    conditionalClass(
                      'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                      'border-2 border-slate-300 bg-white hover:bg-slate-50',
                    )
                  "
                  :disabled="newsCategories.length === 0"
                >
                  <span>{{ selectedNewsCategoryLabel }}</span>
                  <svg
                    v-if="newsCategories.length > 0"
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': isCategoryDropdownOpen }"
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
                  v-if="isCategoryDropdownOpen"
                  :class="[
                    cardClass,
                    'absolute left-1/2 -translate-x-1/2 z-20 mt-2 min-w-[160px] rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                  ]"
                >
                  <div
                    :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                    class="backdrop-blur-sm rounded-lg"
                  >
                    <button
                      @click="selectNewsCategory(null)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>全部分類</span>
                      <span v-if="!selectedNewsCategory" class="text-blue-400">✓</span>
                    </button>
                    <button
                      v-for="category in newsCategories"
                      :key="category"
                      @click="selectNewsCategory(category)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>{{ category }}</span>
                      <span v-if="selectedNewsCategory === category" class="text-blue-400">✓</span>
                    </button>
                  </div>
                </div>
              </th>
              <th class="py-3 px-4 lg:px-6 relative" ref="sortDropdownRef">
                <button
                  @click="toggleSortDropdown"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                  :class="
                    conditionalClass(
                      'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                      'border-2 border-slate-300 bg-white hover:bg-slate-50',
                    )
                  "
                >
                  <span>{{ currentSortLabel }}</span>
                  <svg
                    class="w-4 h-4 transition-transform"
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
                  :class="[
                    cardClass,
                    'absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                  ]"
                >
                  <div
                    :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                    class="backdrop-blur-sm rounded-lg"
                  >
                    <button
                      v-for="option in sortOptions"
                      :key="option.label"
                      @click="setSort(option.value)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>{{ option.label }}</span>
                      <span
                        v-if="
                          currentSort.field === option.value.field &&
                          currentSort.order === option.value.order
                        "
                        class="text-blue-400"
                        >✓</span
                      >
                    </button>
                  </div>
                </div>
              </th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">作者</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">封面圖</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">圖片</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">影片</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">狀態</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in pagedItems"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 lg:px-6 theme-text max-w-[450px] truncate">
                {{ item.title?.TW || '-' }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">{{ item.category || '-' }}</td>
              <td class="py-3 px-4 lg:px-6 theme-text">
                {{
                  formatDate(currentSort.field === 'createdAt' ? item.createdAt : item.publishDate)
                }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">{{ item.author || '-' }}</td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'封面圖: ' + (item.coverImageUrl ? '✓' : '✗')"
                :class="item.coverImageUrl ? 'text-green-500' : 'text-red-500'"
              >
                {{ item.coverImageUrl ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'圖片: ' + (hasContentImages(item.content) ? '✓' : '✗')"
                :class="hasContentImages(item.content) ? 'text-green-500' : 'text-red-500'"
              >
                {{ hasContentImages(item.content) ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'影片: ' + (hasContentVideos(item.content) ? '✓' : '✗')"
                :class="hasContentVideos(item.content) ? 'text-green-500' : 'text-red-500'"
              >
                {{ hasContentVideos(item.content) ? '✓' : '✗' }}
              </td>
              <td class="py-3 px-4 lg:px-6">
                <span
                  :class="statusDisplayClass(item.status, item.isActive, 'news')"
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ getStatusLabel(item.status, item.isActive, 'news') }}
                </span>
              </td>
              <td class="py-3 px-4 lg:px-6">
                <div class="flex gap-2 justify-center">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteItem(item)"
                    :disabled="deletingItem === item._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingItem === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!newsStore.items || newsStore.items.length === 0">
              <td
                colspan="9"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有任何最新消息
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 常見問題列表 -->
      <div
        v-else-if="activeTab === 'faq'"
        :class="[
          'min-h-[580px]',
          { 'overflow-x-auto': !isFaqCategoryDropdownOpen && !isSortDropdownOpen },
        ]"
      >
        <table class="w-full text-center">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">問題 (TW)</th>
              <th class="py-3 px-4 lg:px-6 relative" ref="faqCategoryDropdownRef">
                <button
                  @click="toggleFaqCategoryDropdown"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                  :class="
                    conditionalClass(
                      'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                      'border-2 border-slate-300 bg-white hover:bg-slate-50',
                    )
                  "
                  :disabled="faqCategories.length === 0"
                >
                  <span>{{ selectedFaqCategoryLabel }}</span>
                  <svg
                    v-if="faqCategories.length > 0"
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': isFaqCategoryDropdownOpen }"
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
                  v-if="isFaqCategoryDropdownOpen"
                  :class="[
                    cardClass,
                    'absolute left-1/2 -translate-x-1/2 z-20 mt-2 min-w-[160px] rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                  ]"
                >
                  <div
                    :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                    class="backdrop-blur-sm rounded-lg"
                  >
                    <button
                      @click="selectFaqCategory(null)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>全部分類</span>
                      <span v-if="!selectedFaqCategory" class="text-blue-400">✓</span>
                    </button>
                    <button
                      v-for="category in faqCategories"
                      :key="category"
                      @click="selectFaqCategory(category)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>{{ category }}</span>
                      <span v-if="selectedFaqCategory === category" class="text-blue-400">✓</span>
                    </button>
                  </div>
                </div>
              </th>
              <th class="py-3 px-4 lg:px-6 relative" ref="sortDropdownRef">
                <button
                  @click="toggleSortDropdown"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                  :class="
                    conditionalClass(
                      'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                      'border-2 border-slate-300 bg-white hover:bg-slate-50',
                    )
                  "
                >
                  <span>{{ currentSortLabel }}</span>
                  <svg
                    class="w-4 h-4 transition-transform"
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
                  :class="[
                    cardClass,
                    'absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                  ]"
                >
                  <div
                    :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                    class="backdrop-blur-sm rounded-lg"
                  >
                    <button
                      v-for="option in sortOptions"
                      :key="option.label"
                      @click="setSort(option.value)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>{{ option.label }}</span>
                      <span
                        v-if="
                          currentSort.field === option.value.field &&
                          currentSort.order === option.value.order
                        "
                        class="text-blue-400"
                        >✓</span
                      >
                    </button>
                  </div>
                </div>
              </th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">作者</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">圖片</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">文件</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">影片</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">狀態</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in pagedItems"
              :key="item._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 lg:px-6 theme-text max-w-[450px] truncate">
                {{ item.question?.TW || '-' }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">
                {{
                  typeof item.category === 'object' && item.category
                    ? item.category.main || '-'
                    : item.category || '-'
                }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">
                {{
                  formatDate(
                    currentSort.field === 'createdAt'
                      ? item.createdAt
                      : item.publishDate || item.createdAt,
                  )
                }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">{{ item.author || '-' }}</td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'圖片: ' + (item.imageUrl && item.imageUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.imageUrl && item.imageUrl.length > 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ item.imageUrl && item.imageUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'文件: ' + (item.documentUrl && item.documentUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.documentUrl && item.documentUrl.length > 0
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              >
                {{ item.documentUrl && item.documentUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'影片: ' + (item.videoUrl && item.videoUrl.length > 0 ? '✓' : '✗')"
                :class="
                  item.videoUrl && item.videoUrl.length > 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ item.videoUrl && item.videoUrl.length > 0 ? '✓' : '✗' }}
              </td>
              <td class="py-3 px-4 lg:px-6">
                <span
                  :class="statusDisplayClass(null, item.isActive, 'faq')"
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ getStatusLabel(null, item.isActive, 'faq') }}
                </span>
              </td>
              <td class="py-3 px-4 lg:px-6">
                <div class="flex gap-2 justify-center">
                  <button
                    @click="handleEditItem(item)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteItem(item)"
                    :disabled="deletingItem === item._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingItem === item._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!faqStore.items || faqStore.items.length === 0">
              <td
                colspan="9"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有任何常見問題
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 共用的分頁控制 -->
      <div
        v-if="pagination.totalPages > 1"
        class="py-4 flex justify-center gap-2 border-t"
        :class="conditionalClass('border-white/10', 'border-slate-200')"
      >
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
    </div>

    <!-- 動態 Modal -->
    <NewsModal
      v-if="activeTab === 'news'"
      v-model:show="showModal"
      :news-item="editingItem"
      @saved="handleNewsUpdate"
    />
    <FaqModal
      v-if="activeTab === 'faq'"
      v-model:show="showModal"
      :faq-item="editingItem"
      :all-faqs="faqStore.items"
      @saved="handleFaqUpdate"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useNewsStore } from '@/stores/newsStore'
import { useFaqStore } from '@/stores/faqStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useNotifications } from '@/composables/notificationCenter'
import NewsModal from '@/components/news/NewsModal.vue'
import FaqModal from '@/components/FaqModal.vue'

const newsStore = useNewsStore()
const faqStore = useFaqStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

// 本地狀態
const loading = ref(false)
const showLoading = ref(false)
let loadingTimer = null
const error = ref('')
const activeTab = ref('news') // 'news' or 'faq'
const showModal = ref(false)
const editingItem = ref(null) // 正在編輯的項目 (News 或 Faq)

// 分類篩選相關狀態
const categoryDropdownRef = ref(null)
const isCategoryDropdownOpen = ref(false)
const selectedNewsCategory = ref(null) // null 代表全部分類

// FAQ 分類篩選相關狀態
const faqCategoryDropdownRef = ref(null)
const isFaqCategoryDropdownOpen = ref(false)
const selectedFaqCategory = ref(null)

// 排序相關狀態
const sortDropdownRef = ref(null)
const isSortDropdownOpen = ref(false)
const sortOptions = ref([
  { label: '最新發布', value: { field: 'publishDate', order: 'desc' } },
  { label: '最早發布', value: { field: 'publishDate', order: 'asc' } },
  { label: '最新建立', value: { field: 'createdAt', order: 'desc' } },
  { label: '最早建立', value: { field: 'createdAt', order: 'asc' } },
])
const currentSort = ref(sortOptions.value[0].value)

const currentSortLabel = computed(() => {
  const option = sortOptions.value.find(
    (opt) =>
      opt.value.field === currentSort.value.field && opt.value.order === currentSort.value.order,
  )
  return option ? option.label : '排序'
})

// 操作狀態追蹤
const deletingItem = ref(null) // 正在刪除的項目 ID

// 分頁狀態
const pagination = ref({
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,
})

// 分類下拉：從後端取全量分類，避免因當前頁面資料而縮水
const allNewsCategories = ref([])
const newsCategories = computed(() => allNewsCategories.value)

// 計算分類下拉選單的按鈕標籤
const selectedNewsCategoryLabel = computed(() => {
  return selectedNewsCategory.value || '全部分類'
})

// FAQ 分類：從後端取全量分類，避免下拉選項隨列表改變
const allFaqCategories = ref([])
const faqCategories = computed(() => allFaqCategories.value)

// 計算 FAQ 分類下拉選單的按鈕標籤
const selectedFaqCategoryLabel = computed(() => {
  return selectedFaqCategory.value || '分類'
})

// 根據 activeTab 和篩選條件決定列表資料
const filteredItems = computed(() => {
  // News：由後端處理分類與排序，前端直接使用
  if (activeTab.value === 'news') {
    return newsStore.items || []
  }

  // FAQ：也改由後端處理分類與排序
  return faqStore.items || []
})

// 依據 activeTab 決定分頁資料來源
const pagedItems = computed(() => {
  const list = filteredItems.value
  if (activeTab.value === 'news') {
    // 後端已分頁，直接使用
    return list
  }
  if (activeTab.value === 'faq') {
    // FAQ 由後端分頁，直接使用
    return list
  }
  const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage
  const end = start + pagination.value.itemsPerPage
  return list.slice(start, end)
})

// 監聽資料或 activeTab 變化時，重設分頁
watch(
  [filteredItems, activeTab],
  () => {
    const total = filteredItems.value.length
    pagination.value.totalPages = Math.ceil(total / pagination.value.itemsPerPage) || 1
    if (pagination.value.currentPage > pagination.value.totalPages) {
      pagination.value.currentPage = pagination.value.totalPages || 1
    }
    if (pagination.value.currentPage < 1) {
      pagination.value.currentPage = 1
    }
  },
  { immediate: true, deep: true },
)

// 切換分頁
const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.currentPage)
    return
  pagination.value.currentPage = page
  if (activeTab.value === 'news') {
    // 後端分頁
    fetchData()
  } else if (activeTab.value === 'faq') {
    fetchData()
  }
}

// 根據 activeTab 獲取對應的 store
const currentStore = () => {
  return activeTab.value === 'news' ? newsStore : faqStore
}

// 設置活動標籤並加載數據
const setActiveTab = async (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  // 切換 tab 時重置篩選
  selectedNewsCategory.value = null
  isCategoryDropdownOpen.value = false
  selectedFaqCategory.value = null
  isFaqCategoryDropdownOpen.value = false
  await fetchData()
}

// 分類下拉選單操作
const toggleCategoryDropdown = () => {
  isCategoryDropdownOpen.value = !isCategoryDropdownOpen.value
}

const selectNewsCategory = (category) => {
  selectedNewsCategory.value = category
  isCategoryDropdownOpen.value = false
  pagination.value.currentPage = 1 // 篩選後回到第一頁
  if (activeTab.value === 'news') {
    fetchData()
  }
}

// FAQ 分類下拉選單操作
const toggleFaqCategoryDropdown = () => {
  isFaqCategoryDropdownOpen.value = !isFaqCategoryDropdownOpen.value
}

const selectFaqCategory = (category) => {
  selectedFaqCategory.value = category
  isFaqCategoryDropdownOpen.value = false
  pagination.value.currentPage = 1 // 篩選後回到第一頁
  if (activeTab.value === 'faq') {
    fetchData()
  }
}

// 排序下拉選單操作
const toggleSortDropdown = () => {
  isSortDropdownOpen.value = !isSortDropdownOpen.value
}

const setSort = (sortValue) => {
  currentSort.value = sortValue
  isSortDropdownOpen.value = false
  pagination.value.currentPage = 1 // 排序後回到第一頁
  if (activeTab.value === 'news') {
    fetchData()
  } else if (activeTab.value === 'faq') {
    fetchData()
  }
}

// 初始化載入
onMounted(async () => {
  await fetchData()
  // 初次加載全量分類（避免下拉選項隨列表改變）
  try {
    const { useApi } = await import('@/composables/axios')
    const { entityApi } = useApi()
    const api = entityApi('news', { responseKey: 'news' })
    allNewsCategories.value = await api.getCategories()
    const faqApi = entityApi('faqs', { responseKey: 'faqs' })
    allFaqCategories.value = await faqApi.getCategories()
  } catch (e) {
    console.warn('載入分類清單失敗', e?.message || e)
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (loadingTimer) {
    clearTimeout(loadingTimer)
    loadingTimer = null
  }
})

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (categoryDropdownRef.value && !categoryDropdownRef.value.contains(event.target)) {
    isCategoryDropdownOpen.value = false
  }
  if (faqCategoryDropdownRef.value && !faqCategoryDropdownRef.value.contains(event.target)) {
    isFaqCategoryDropdownOpen.value = false
  }
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(event.target)) {
    isSortDropdownOpen.value = false
  }
}

// 獲取數據
const fetchData = async () => {
  loading.value = true
  error.value = ''
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '最新消息' : '常見問題'

  try {
    if (activeTab.value === 'news') {
      const params = {
        page: pagination.value.currentPage,
        limit: pagination.value.itemsPerPage,
        ...(selectedNewsCategory.value ? { category: selectedNewsCategory.value } : {}),
        sort: currentSort.value.field,
        sortDirection: currentSort.value.order,
      }
      await store.fetchAll(params)
      // 同步後端分頁資訊到 UI 狀態
      const p = store.pagination || {}
      pagination.value.currentPage = p.page || 1
      pagination.value.itemsPerPage = p.limit || pagination.value.itemsPerPage
      pagination.value.totalPages = p.pages || 1
    } else {
      // FAQ
      const params = {
        page: pagination.value.currentPage,
        limit: pagination.value.itemsPerPage,
        ...(selectedFaqCategory.value ? { category: selectedFaqCategory.value } : {}),
        sort: currentSort.value.field,
        sortDirection: currentSort.value.order,
      }
      await store.fetchAll(params)
      const p = store.pagination || {}
      pagination.value.currentPage = p.page || 1
      pagination.value.itemsPerPage = p.limit || pagination.value.itemsPerPage
      pagination.value.totalPages = p.pages || 1
    }
    if (!store.items || store.items.length === 0) {
      notify.notifyInfo(`目前沒有任何${entityName}`)
    }
  } catch (err) {
    console.error(`載入${entityName}失敗：`, err)
    const message = err.message || `載入${entityName}失敗，請重新整理頁面`
    error.value = message
    notify.notifyError(message)
  } finally {
    loading.value = false
  }
}

// 延遲顯示 loading，避免短請求造成閃爍
watch(loading, (val) => {
  if (val) {
    if (loadingTimer) clearTimeout(loadingTimer)
    loadingTimer = setTimeout(() => {
      showLoading.value = true
    }, 200) // 200ms 後仍在載入才顯示
  } else {
    if (loadingTimer) {
      clearTimeout(loadingTimer)
      loadingTimer = null
    }
    showLoading.value = false
  }
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString() // 使用本地化日期格式
  } catch {
    return dateString // 如果轉換失敗，返回原始字串
  }
}

// Helper function to get status label
const getStatusLabel = (statusKey, isActive, type) => {
  if (type === 'faq' || type === 'news') {
    return isActive ? '已發布' : '待審查'
  }
  // Fallback or other types (if any)
  const statusMap = {
    pendingReview: '待審核',
    published: '已發布',
    rejected: '已拒絕',
  }
  return statusMap[statusKey] || statusKey
}

// Helper function for status display class
const statusDisplayClass = (status, isActive, type) => {
  if (type === 'faq' || type === 'news') {
    return isActive
      ? conditionalClass('bg-green-500/30 text-green-300', 'bg-green-100 text-green-700')
      : conditionalClass('bg-yellow-500/30 text-yellow-300', 'bg-yellow-100 text-yellow-700')
  }
  switch (status) {
    case 'published':
      return conditionalClass('bg-green-500/30 text-green-300', 'bg-green-100 text-green-700')
    case 'pendingReview':
      return conditionalClass('bg-yellow-500/30 text-yellow-300', 'bg-yellow-100 text-yellow-700')
    case 'rejected':
      return conditionalClass('bg-red-500/30 text-red-300', 'bg-red-100 text-red-700')
    default:
      return conditionalClass('bg-gray-600/30 text-gray-400', 'bg-gray-200 text-gray-500')
  }
}

// 處理新增項目
const handleAddItem = () => {
  editingItem.value = null // 清空編輯項目表示新增
  showModal.value = true
}

// 處理編輯項目
const handleEditItem = (item) => {
  editingItem.value = { ...item } // 傳遞副本
  showModal.value = true
}

// 處理刪除項目
const handleDeleteItem = async (item) => {
  const store = currentStore()
  const entityName = activeTab.value === 'news' ? '消息' : '問題'
  const identifier = activeTab.value === 'news' ? item.title?.TW : item.question?.TW

  if (!confirm(`確定要刪除${entityName} "${identifier || item._id}" 嗎？此操作不可恢復！`)) {
    return
  }

  deletingItem.value = item._id
  try {
    await store.delete(item._id)
    notify.notifySuccess(`成功刪除${entityName}`)

    // 本地刪除
    if (activeTab.value === 'faq') {
      const index = faqStore.items.findIndex((i) => i._id === item._id)
      if (index !== -1) {
        faqStore.items.splice(index, 1)
      }
    } else {
      const index = newsStore.items.findIndex((i) => i._id === item._id)
      if (index !== -1) {
        newsStore.items.splice(index, 1)
      }
    }
  } catch (err) {
    const message = err.message || `刪除${entityName}失敗，請稍後再試`
    notify.notifyError(message)
  } finally {
    deletingItem.value = null
  }
}

// 新增：處理 News 更新
const handleNewsUpdate = (payload) => {
  const { news, isNew } = payload
  if (isNew) {
    newsStore.items.unshift(news)
  } else {
    const index = newsStore.items.findIndex((item) => item._id === news._id)
    if (index !== -1) {
      newsStore.items.splice(index, 1, news)
    }
  }
  showModal.value = false
  notify.notifySuccess(`消息已成功${isNew ? '新增' : '更新'}`)
}

// 新增：處理 FAQ 更新
const handleFaqUpdate = (payload) => {
  const { faq, isNew } = payload
  if (isNew) {
    faqStore.items.unshift(faq) // 將新項目加到列表開頭
  } else {
    const index = faqStore.items.findIndex((item) => item._id === faq._id)
    if (index !== -1) {
      faqStore.items.splice(index, 1, faq)
    }
  }
  showModal.value = false
  notify.notifySuccess(`問題已成功${isNew ? '新增' : '更新'}`)
}

// 檢查 News content 是否包含圖片
const hasContentImages = (content) => {
  if (!content || !Array.isArray(content)) return false
  return content.some((block) => block.itemType === 'image' && block.imageUrl)
}

// 檢查 News content 是否包含影片
const hasContentVideos = (content) => {
  if (!content || !Array.isArray(content)) return false
  return content.some((block) => block.itemType === 'videoEmbed' && block.videoEmbedUrl)
}
</script>

<style scoped>
/* 可以添加特定於此視圖的樣式 */
table {
  border-collapse: separate;
  border-spacing: 0;
}

th {
  font-weight: 500;
}

button {
  white-space: nowrap;
}
</style>
