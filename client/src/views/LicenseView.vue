<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">授權管理</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">管理授權申請、審核和狀態</p>
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
        v-if="loadingLicenses"
        key="loading"
        container-class="py-12"
      />
      <div v-else key="content" :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">授權管理</h2>
        <button
          @click="showCreateLicenseModal = true"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增授權
        </button>
      </div>
      <!-- 授權管理列表 -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">客戶名稱</th>
              <th class="text-left py-3 px-4 theme-text">Serial Number</th>
              <th class="text-left py-3 px-4 theme-text">License Key</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">申請人 / 時間</th>
              <th class="text-left py-3 px-4 theme-text">審核人 / 時間</th>
              <th class="text-left py-3 px-4 theme-text">備註</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="license in pagedLicenses"
              :key="license._id || license.id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ license.customerName || '-' }}</td>
              <td class="py-3 px-4 theme-text font-mono">{{ license.serialNumber || '-' }}</td>
              <td class="py-3 px-4 theme-text font-mono text-sm">
                {{ license.licenseKey || '-' }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="
                    license.status === 'pending'
                      ? conditionalClass(
                          'bg-yellow-500/20 text-yellow-300',
                          'bg-yellow-100 text-yellow-700',
                        )
                      : license.status === 'available'
                        ? conditionalClass(
                            'bg-blue-500/20 text-blue-300',
                            'bg-blue-100 text-blue-700',
                          )
                        : license.status === 'active'
                          ? conditionalClass(
                              'bg-green-500/20 text-green-300',
                              'bg-green-100 text-green-700',
                            )
                          : conditionalClass(
                              'bg-red-500/20 text-red-300',
                              'bg-red-100 text-red-700',
                            )
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ getStatusText(license.status) }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text text-sm">
                <div>{{ license.applicant || '-' }}</div>
                <div class="text-xs opacity-70">
                  {{ license.appliedAt ? formatDate(license.appliedAt) : '-' }}
                </div>
              </td>
              <td class="py-3 px-4 theme-text text-sm">
                <div>{{ license.reviewer || '-' }}</div>
                <div class="text-xs opacity-70">
                  {{ license.reviewedAt ? formatDate(license.reviewedAt) : '-' }}
                </div>
              </td>
              <td class="py-3 px-4 theme-text text-sm">{{ license.notes || '-' }}</td>
              <td class="py-3 px-4">
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-if="license.status === 'pending' && isAdmin"
                    @click="handleReviewLicense(license)"
                    :disabled="reviewingLicense === (license._id || license.id)"
                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="reviewingLicense === (license._id || license.id)"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    審核
                  </button>
                  <button
                    @click="handleEditLicense(license)"
                    :disabled="!canEditLicense(license)"
                    class="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteLicense(license)"
                    :disabled="deletingLicense === (license._id || license.id)"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingLicense === (license._id || license.id)"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="licenses.length === 0">
              <td
                colspan="8"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有授權記錄
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分頁控制 -->
        <div v-if="licensePagination.totalPages > 1" class="py-4 flex justify-center gap-2">
          <button
            @click="changeLicensePage(licensePagination.currentPage - 1)"
            :disabled="licensePagination.currentPage === 1"
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
            {{ licensePagination.currentPage }} / {{ licensePagination.totalPages }}
          </span>
          <button
            @click="changeLicensePage(licensePagination.currentPage + 1)"
            :disabled="licensePagination.currentPage === licensePagination.totalPages"
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
      </div>
    </Transition>

    <!-- 新增授權 Modal -->
    <div
      v-if="showCreateLicenseModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showCreateLicenseModal = false"
    >
      <div :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm w-full max-w-md']" @click.stop>
        <h3 class="text-xl font-semibold theme-text mb-4">新增授權</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text mb-2">客戶名稱 *</label>
            <input
              v-model="newLicense.customerName"
              type="text"
              placeholder="請輸入客戶名稱"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">申請人 *</label>
            <input
              v-model="newLicense.applicant"
              type="text"
              placeholder="請輸入申請人"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
            <p class="text-xs mt-1" :class="conditionalClass('text-gray-400', 'text-slate-500')">
              預設為當前登入用戶：{{ userStore.account }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">備註</label>
            <textarea
              v-model="newLicense.notes"
              rows="3"
              placeholder="選填"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            @click="handleCreateLicense"
            :disabled="creatingLicense || !newLicense.customerName || !newLicense.applicant"
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <span
              v-if="creatingLicense"
              class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
            ></span>
            建立
          </button>
          <button
            @click="showCreateLicenseModal = false"
            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 編輯授權 Modal -->
    <div
      v-if="showEditLicenseModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showEditLicenseModal = false"
    >
      <div :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm w-full max-w-md']" @click.stop>
        <h3 class="text-xl font-semibold theme-text mb-4">編輯授權</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text mb-2">客戶名稱</label>
            <input
              :value="editingLicense?.customerName"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">Serial Number</label>
            <input
              :value="editingLicense?.serialNumber || '-'"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50 font-mono"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">License Key</label>
            <input
              :value="editingLicense?.licenseKey || '-'"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50 font-mono text-sm"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">狀態</label>
            <!-- 如果狀態為「使用中」，只允許 admin 改為「已停用」 -->
            <select
              v-if="editingLicense?.status === 'active'"
              v-model="editingLicense.status"
              :disabled="!isAdmin"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            >
              <option value="active" class="text-black/70">使用中</option>
              <option value="inactive" class="text-black/70">已停用</option>
            </select>
            <!-- 其他狀態顯示為完整下拉選單 -->
            <select
              v-else
              v-model="editingLicense.status"
              :disabled="!canEditStatus(editingLicense)"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            >
              <option
                value="pending"
                :disabled="!canSetStatusToPending(editingLicense)"
                class="text-black/70"
              >
                審核中
              </option>
              <option value="available" class="text-black/70">可啟用</option>
              <option value="inactive" class="text-black/70">已停用</option>
            </select>
            <p
              v-if="!canEditStatus(editingLicense) && editingLicense?.status !== 'active'"
              class="text-xs mt-1"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              提示：staff 無法將已審查的授權修改為「審核中」
            </p>
            <p
              v-if="editingLicense?.status === 'active' && !isAdmin"
              class="text-xs mt-1"
              :class="conditionalClass('text-blue-400', 'text-blue-600')"
            >
              提示：「使用中」狀態只能由管理員改為「已停用」以收回權限
            </p>
            <p
              v-if="editingLicense?.status === 'active' && isAdmin"
              class="text-xs mt-1"
              :class="conditionalClass('text-blue-400', 'text-blue-600')"
            >
              提示：可以將「使用中」狀態改為「已停用」以收回權限
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">備註</label>
            <textarea
              v-model="editingLicense.notes"
              rows="3"
              placeholder="選填"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            @click="handleUpdateLicense"
            :disabled="updatingLicense"
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <span
              v-if="updatingLicense"
              class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
            ></span>
            更新
          </button>
          <button
            @click="showEditLicenseModal = false"
            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useNotifications } from '@/composables/notificationCenter'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePageInitialization } from '@/composables/usePageInitialization'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

// 用戶權限
const isAdmin = computed(() => userStore.isAdmin)
const isStaff = computed(() => userStore.isStaff)

// 使用統一的頁面初始化管理
const { loading: loadingLicenses, initialize } = usePageInitialization()

// 本地狀態
const error = ref('')

// 授權管理狀態 - 使用 store
const licenses = computed(() => {
  const storeLicenses = userStore.licenses
  return Array.isArray(storeLicenses) ? storeLicenses : []
})

const showCreateLicenseModal = ref(false)
const showEditLicenseModal = ref(false)
const newLicense = ref({ customerName: '', applicant: '', notes: '' })
const reviewingLicense = ref(false)
const editingLicense = ref(null)
const creatingLicense = ref(false)
const updatingLicense = ref(false)
const deletingLicense = ref(null)

// 授權分頁
const licensePagination = ref({
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,
})

const pagedLicenses = computed(() => {
  const start = (licensePagination.value.currentPage - 1) * licensePagination.value.itemsPerPage
  const end = start + licensePagination.value.itemsPerPage
  return licenses.value.slice(start, end)
})

watch(
  [() => licenses.value.length, () => licensePagination.value.itemsPerPage],
  ([items]) => {
    const total = items
    licensePagination.value.totalPages = Math.max(
      Math.ceil(total / licensePagination.value.itemsPerPage),
      1,
    )
    if (licensePagination.value.currentPage > licensePagination.value.totalPages) {
      licensePagination.value.currentPage = licensePagination.value.totalPages
    }
    if (licensePagination.value.currentPage < 1) {
      licensePagination.value.currentPage = 1
    }
  },
  { immediate: true },
)

// 權限控制函數
const canEditLicense = (license) => {
  // admin 可以編輯所有授權
  if (isAdmin.value) return true

  // staff 只能編輯 pending 狀態的授權
  if (isStaff.value) {
    return license.status === 'pending'
  }

  return false
}

const canEditStatus = (license) => {
  if (!license) return false

  // admin 可以編輯所有狀態
  if (isAdmin.value) return true

  // staff 不能改變狀態（只能編輯備註）
  if (isStaff.value) {
    return false
  }

  return false
}

const canSetStatusToPending = (license) => {
  if (!license) return false

  // admin 可以將任何狀態改為 pending
  if (isAdmin.value) return true

  // staff 不能將已審查的授權改為 pending
  if (isStaff.value) {
    // 如果當前狀態不是 pending，則不能改為 pending
    return license.status === 'pending'
  }

  return false
}

// 初始化載入
onMounted(async () => {
  await initialize(async () => {
    await fetchLicenses()
  })
})

// 當打開新增授權 Modal 時，自動填入當前用戶名稱
watch(showCreateLicenseModal, (isOpen) => {
  if (isOpen) {
    // 自動填入當前登入用戶的名稱
    newLicense.value.applicant = userStore.account || ''
  }
})

// 授權管理功能
const fetchLicenses = async () => {
  try {
    error.value = ''
    await userStore.getAllLicenses()
  } catch (err) {
    console.error('載入授權列表失敗：', err)
    const errorMsg =
      err?.response?.data?.message || err?.message || '載入授權列表失敗，請重新整理頁面'
    error.value = errorMsg
    notify.notifyError(errorMsg)
    // 確保 licenses 不會是 undefined
    if (!Array.isArray(userStore.licenses)) {
      userStore.licenses = []
    }
  }
}

const handleCreateLicense = async () => {
  if (!newLicense.value.customerName) {
    notify.notifyWarning('請輸入客戶名稱')
    return
  }

  if (!newLicense.value.applicant) {
    notify.notifyWarning('請輸入申請人')
    return
  }

  try {
    creatingLicense.value = true
    await userStore.createLicense({
      customerName: newLicense.value.customerName,
      applicant: newLicense.value.applicant,
      notes: newLicense.value.notes || null,
    })
    showCreateLicenseModal.value = false
    newLicense.value = { customerName: '', applicant: '', notes: '' }
    // 確保列表已更新
    await fetchLicenses()
  } catch (err) {
    console.error('建立授權失敗:', err)
    const errorMsg = err.response?.data?.message || '建立授權失敗，請稍後再試'
    notify.notifyError(errorMsg)
  } finally {
    creatingLicense.value = false
  }
}

const handleReviewLicense = async (license) => {
  if (
    !confirm(
      `確定要審核授權 "${license.customerName}" 嗎？審核後將自動生成 Serial Number 和 License Key。`,
    )
  ) {
    return
  }

  try {
    reviewingLicense.value = license._id || license.id
    const licenseId = license._id || license.id
    await userStore.reviewLicense(licenseId)
    notify.notifySuccess('授權審核成功')
    // 確保列表已更新
    await fetchLicenses()
  } catch (err) {
    console.error('審核授權失敗:', err)
    const errorMsg = err.response?.data?.message || '審核授權失敗，請稍後再試'
    notify.notifyError(errorMsg)
  } finally {
    reviewingLicense.value = false
  }
}

const handleEditLicense = (license) => {
  // 檢查權限
  if (!canEditLicense(license)) {
    if (isStaff.value && license.status !== 'pending') {
      notify.notifyWarning('staff 只能編輯「審核中」狀態的授權')
    }
    return
  }

  // 保存原始狀態，用於檢查是否嘗試將已審查的改為 pending
  editingLicense.value = { ...license, _originalStatus: license.status }
  showEditLicenseModal.value = true
}

const handleUpdateLicense = async () => {
  if (!editingLicense.value) return

  const originalStatus = editingLicense.value._originalStatus || editingLicense.value.status

  // 檢查是否嘗試將非「使用中」狀態改為「使用中」（應該由系統自動設定）
  if (originalStatus !== 'active' && editingLicense.value.status === 'active') {
    notify.notifyWarning('「使用中」狀態由系統自動設定，無法手動設置')
    editingLicense.value.status = originalStatus
    return
  }

  // 檢查權限：staff 不能將已審查的授權改為 pending
  if (isStaff.value) {
    // staff 不能改變狀態
    if (editingLicense.value.status !== originalStatus) {
      notify.notifyWarning('staff 無法修改授權狀態，只能編輯備註')
      // 恢復原始狀態
      editingLicense.value.status = originalStatus
      return
    }
  }

  // 如果將「使用中」改為「已停用」，確認操作
  if (originalStatus === 'active' && editingLicense.value.status === 'inactive') {
    if (!confirm('確定要將此授權改為「已停用」以收回權限嗎？')) {
      editingLicense.value.status = originalStatus
      return
    }
  }

  try {
    updatingLicense.value = true
    const licenseId = editingLicense.value._id || editingLicense.value.id

    const updateData = {
      notes: editingLicense.value.notes || null,
    }

    // 只有 admin 可以更新狀態
    if (isAdmin.value) {
      updateData.status = editingLicense.value.status
    } else if (isStaff.value) {
      // staff 只能更新備註，不更新狀態
      // 狀態保持不變（已在上面檢查過）
    }

    await userStore.updateLicense(licenseId, updateData)
    showEditLicenseModal.value = false
    editingLicense.value = null
    await fetchLicenses()

    if (originalStatus === 'active' && updateData.status === 'inactive') {
      notify.notifySuccess('授權已停用，權限已收回')
    }
  } catch (err) {
    console.error('更新授權失敗:', err)
    const errorMsg = err.response?.data?.message || '更新授權失敗，請稍後再試'
    notify.notifyError(errorMsg)
  } finally {
    updatingLicense.value = false
  }
}

const handleDeleteLicense = async (license) => {
  if (
    !confirm(
      `確定要刪除授權 "${license.serialNumber || license.customerName}" 嗎？此操作不可恢復！`,
    )
  ) {
    return
  }

  try {
    const licenseId = license._id || license.id
    deletingLicense.value = licenseId
    await userStore.deleteLicense(licenseId)
    await fetchLicenses()
  } catch (err) {
    console.error('刪除授權失敗:', err)
    const errorMsg = err.response?.data?.message || '刪除授權失敗，請稍後再試'
    notify.notifyError(errorMsg)
  } finally {
    deletingLicense.value = null
  }
}

const changeLicensePage = (page) => {
  if (
    page < 1 ||
    page > licensePagination.value.totalPages ||
    page === licensePagination.value.currentPage
  )
    return
  licensePagination.value.currentPage = page
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '審核中',
    available: '可啟用',
    active: '使用中',
    inactive: '已停用',
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}

th {
  font-weight: 500;
  color: #94a3b8;
}

button {
  white-space: nowrap;
}
</style>
