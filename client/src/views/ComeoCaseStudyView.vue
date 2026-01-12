<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">合作案例管理</h1>
    </div>

    <!-- 錯誤提示 -->
    <div
      v-if="error"
      class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6"
    >
      {{ error }}
      <button @click="error = ''" class="float-right text-red-100 hover:text-white">&times;</button>
    </div>

    <!-- 載入與內容切換過渡 -->
    <Transition name="fade" mode="out-in">
      <LoadingSpinner
        v-if="loading"
        key="loading"
        container-class="py-12"
      />
      <div v-else key="content" :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">案例列表</h2>
        <button
          @click="handleAddItem"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增案例
        </button>
      </div>

      <!-- 案例列表 -->
      <div
        :class="[
          'min-h-[580px]',
          { 'overflow-x-auto': !isProjectTypeDropdownOpen && !isSortDropdownOpen },
        ]"
      >
        <table class="w-full text-center">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">案例標題</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">公司名稱</th>
              <th class="py-3 px-4 relative" ref="projectTypeDropdownRef">
                <button
                  @click="toggleProjectTypeDropdown"
                  class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                  :class="
                    conditionalClass(
                      'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                      'border-2 border-slate-300 bg-white hover:bg-slate-50',
                    )
                  "
                  :disabled="projectTypes.length === 0"
                >
                  <span>{{ selectedProjectTypeLabel }}</span>
                  <svg
                    v-if="projectTypes.length > 0"
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
                    'absolute left-1/2 -translate-x-1/2 z-20 mt-2 min-w-[160px] rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                  ]"
                >
                  <div
                    :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                    class="backdrop-blur-sm rounded-lg"
                  >
                    <button
                      @click="selectProjectType(null)"
                      class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                      :class="
                        conditionalClass(
                          'hover:bg-white/10 text-white',
                          'hover:bg-slate-100 text-slate-700',
                        )
                      "
                    >
                      <span>所有類型</span>
                      <span v-if="!selectedProjectType" class="text-blue-400">✓</span>
                    </button>
                    <button
                      v-for="type in projectTypes"
                      :key="type"
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
                      <span v-if="selectedProjectType === type" class="text-blue-400">✓</span>
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
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">狀態</th>
              <th class="py-3 px-4 lg:px-6 theme-text opacity-50">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="caseStudy in caseStudies"
              :key="caseStudy._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 lg:px-6 theme-text max-w-[300px] truncate">
                {{ caseStudy.title }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text max-w-[250px] truncate">
                {{ caseStudy.companyName || '-' }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">{{ caseStudy.projectType || '-' }}</td>
              <td class="py-3 px-4 lg:px-6 theme-text">
                {{
                  formatDate(
                    currentSort.field === 'createdAt' ? caseStudy.createdAt : caseStudy.publishDate,
                  )
                }}
              </td>
              <td class="py-3 px-4 lg:px-6 theme-text">{{ caseStudy.author || '-' }}</td>
              <td
                class="py-3 px-4 lg:px-6"
                :title="'圖片數量: ' + (caseStudy.images?.length || 0)"
                :class="
                  caseStudy.images && caseStudy.images.length > 0
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              >
                {{ caseStudy.images && caseStudy.images.length > 0 ? '✓' : '✗' }}
              </td>
              <td class="py-3 px-4 lg:px-6">
                <div class="flex flex-col items-center gap-1">
                  <span
                    :class="statusDisplayClass(caseStudy.isActive)"
                    class="px-2 py-1 rounded-full text-sm whitespace-nowrap"
                  >
                    {{ caseStudy.isActive ? '已發布' : '未發布' }}
                  </span>
                </div>
              </td>
              <td class="py-3 px-4 lg:px-6">
                <div class="flex gap-2 justify-center">
                  <button
                    @click="handleEditItem(caseStudy)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteItem(caseStudy)"
                    :disabled="deletingItem === caseStudy._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingItem === caseStudy._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!caseStudies || caseStudies.length === 0">
              <td
                colspan="8"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有任何合作案例
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
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
    </Transition>

    <!-- 新增/編輯案例模態框 -->
    <CaseStudyModal
      v-if="showCreateModal || showEditModal"
      :model-value="showCreateModal || showEditModal"
      :case-study="selectedCaseStudy"
      @update:model-value="closeModal"
      @success="handleModalSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useSiteStore } from '@/stores/core/siteStore'
import { useCaseStudyStore } from '@/stores/caseStudyStore'
import CaseStudyModal from '@/components/comeo/CaseStudyModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePageInitialization } from '@/composables/usePageInitialization'

const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()
const siteStore = useSiteStore()
const caseStudyStore = useCaseStudyStore()

// 使用統一的頁面初始化管理
const { loading: initLoading, initialize } = usePageInitialization()

// 響應式資料
const error = ref('')
const caseStudies = computed(() => caseStudyStore.items)

// 結合 store 的 loading 狀態
const loading = computed(() => {
  return initLoading.value || caseStudyStore.isLoading
})
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedCaseStudy = ref(null)
const deletingItem = ref(null)

// 專案類型列表（靜態定義，避免額外請求）
const projectTypes = ref(['智慧建築', '系統整合', '安全監控'])

// 專案類型篩選
const projectTypeDropdownRef = ref(null)
const isProjectTypeDropdownOpen = ref(false)
const selectedProjectType = ref(null)

const selectedProjectTypeLabel = computed(() => {
  return selectedProjectType.value || '所有類型'
})

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

// 分頁
const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  itemsPerPage: 10,
})

// 載入案例列表
const loadCaseStudies = async () => {
  try {
    error.value = ''

    const params = {
      page: pagination.value.currentPage,
      limit: pagination.value.itemsPerPage,
      ...(selectedProjectType.value ? { projectType: selectedProjectType.value } : {}),
      sort: currentSort.value.field,
      sortDirection: currentSort.value.order,
    }

    await caseStudyStore.fetchAll(params)

    // 更新分頁資訊
    pagination.value.currentPage = caseStudyStore.pagination.current || 1
    pagination.value.totalPages = caseStudyStore.pagination.total || 1
  } catch (err) {
    console.error('載入案例失敗：', err)
    const message = err.message || '載入案例失敗，請重新整理頁面'
    error.value = message
    notify.notifyError(message)
  }
}

// 專案類型下拉選單操作
const toggleProjectTypeDropdown = () => {
  isProjectTypeDropdownOpen.value = !isProjectTypeDropdownOpen.value
}

const selectProjectType = (type) => {
  selectedProjectType.value = type
  isProjectTypeDropdownOpen.value = false
  pagination.value.currentPage = 1
  loadCaseStudies()
}

// 排序下拉選單操作
const toggleSortDropdown = () => {
  isSortDropdownOpen.value = !isSortDropdownOpen.value
}

const setSort = (sortValue) => {
  currentSort.value = sortValue
  isSortDropdownOpen.value = false
  pagination.value.currentPage = 1
  loadCaseStudies()
}

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (projectTypeDropdownRef.value && !projectTypeDropdownRef.value.contains(event.target)) {
    isProjectTypeDropdownOpen.value = false
  }
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(event.target)) {
    isSortDropdownOpen.value = false
  }
}

// 處理新增項目
const handleAddItem = () => {
  selectedCaseStudy.value = null
  showCreateModal.value = true
}

// 處理編輯項目
const handleEditItem = (caseStudy) => {
  selectedCaseStudy.value = { ...caseStudy }
  showEditModal.value = true
}

// 處理刪除項目
const handleDeleteItem = async (caseStudy) => {
  if (!confirm(`確定要刪除案例 "${caseStudy.title}" 嗎？此操作不可恢復！`)) {
    return
  }

  deletingItem.value = caseStudy._id
  try {
    await caseStudyStore.delete(caseStudy._id)
    notify.notifySuccess('案例刪除成功')

    // 如果當前頁沒有資料且不是第一頁，回到上一頁
    if (caseStudyStore.items.length === 0 && pagination.value.currentPage > 1) {
      pagination.value.currentPage--
      loadCaseStudies()
    }
  } catch (err) {
    const message = err.message || '刪除案例失敗，請稍後再試'
    notify.notifyError(message)
  } finally {
    deletingItem.value = null
  }
}

// 關閉模態框
const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  selectedCaseStudy.value = null
}

// 狀態顯示樣式
const statusDisplayClass = (isActive) => {
  return isActive
    ? conditionalClass('bg-green-500/30 text-green-300', 'bg-green-100 text-green-700')
    : conditionalClass('bg-red-500/30 text-red-300', 'bg-red-100 text-red-700')
}

// 模態框成功回調
const handleModalSuccess = () => {
  closeModal()
  loadCaseStudies()
}

// 切換頁面
const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.currentPage)
    return
  pagination.value.currentPage = page
  loadCaseStudies()
}

// 初始化
onMounted(async () => {
  // 確保設置為 comeo site
  siteStore.setSite('comeo')

  // 設定分頁
  pagination.value.currentPage = 1
  pagination.value.itemsPerPage = 10

  // 初始化關鍵資料
  await initialize(async () => {
    await loadCaseStudies()
  })

  document.addEventListener('click', handleClickOutside)
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

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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
