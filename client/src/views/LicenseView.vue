<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">授權管理</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">
        管理 BA 系統授權申請、部署樣貌與配額
      </p>
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
      <LoadingSpinner v-if="loadingLicenses" key="loading" container-class="py-12" />
      <div v-else key="content" :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']">
        <!-- 頂部操作列 -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold theme-text">BA System 授權</h2>
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
            <thead
              :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')"
            >
              <tr>
                <th class="text-left py-3 px-4 theme-text">客戶名稱</th>
                <th class="text-left py-3 px-4 theme-text">方案</th>
                <th class="text-left py-3 px-4 theme-text">Serial Number</th>
                <th class="text-left py-3 px-4 theme-text">License Key</th>
                <th class="text-left py-3 px-4 theme-text">狀態</th>
                <th class="text-left py-3 px-4 theme-text">申請人</th>
                <th class="text-left py-3 px-4 theme-text">審核人</th>
                <th class="text-left py-3 px-4 theme-text">備註</th>
                <th class="text-left py-3 px-4 theme-text">操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="license in pagedLicenses" :key="licenseRowId(license)">
                <!-- 主 LK 列 -->
                <tr
                  :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
                >
                  <td class="py-3 px-4 theme-text">{{ license.customerName || '-' }}</td>
                  <td class="py-3 px-4 relative group">
                    <span
                      class="px-2 py-1 rounded-full text-xs leading-none"
                      :class="
                        license.deploymentProfile === 'construction'
                          ? conditionalClass(
                              'bg-emerald-500/20 text-emerald-300',
                              'bg-emerald-100 text-emerald-700',
                            )
                          : conditionalClass(
                              'bg-sky-500/20 text-sky-300',
                              'bg-sky-100 text-sky-700',
                            )
                      "
                    >
                      {{ license.deploymentProfile === 'construction' ? '工地管理' : '中央監控' }}
                    </span>

                    <div
                      class="pointer-events-none absolute top-full z-20 hidden rounded-lg border w-max px-3 py-2 text-sm shadow-lg group-hover:block"
                      :class="
                        conditionalClass(
                          'border-white/10 bg-[#0f172a] text-slate-100',
                          'border-slate-200 bg-white text-slate-700',
                        )
                      "
                    >
                      <div class="break-words">
                        {{ getFeatureTooltipText(license.features) }}
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 theme-text font-mono">{{ license.serialNumber || '-' }}</td>
                  <td class="py-3 px-4 theme-text font-mono text-sm">
                    {{ license.licenseKey || '-' }}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      :class="getStatusClass(license.status)"
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
                        :disabled="reviewingLicense === licenseRowId(license)"
                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span
                          v-if="reviewingLicense === licenseRowId(license)"
                          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                        ></span>
                        審核
                      </button>
                      <button
                        v-if="license.licenseKey && !license.parentLicenseKey && isAdmin"
                        @click="handleOpenExtendModal(license)"
                        class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                      >
                        追加授權
                      </button>
                      <button
                        @click="handleEditLicense(license)"
                        :disabled="!canEditLicense(license)"
                        class="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                      >
                        編輯
                      </button>
                      <button
                        v-if="license.status === 'active' && isAdmin && !license.parentLicenseKey"
                        @click="handleUnbindLicense(license)"
                        :disabled="unbindingLicense === licenseRowId(license)"
                        class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span
                          v-if="unbindingLicense === licenseRowId(license)"
                          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                        ></span>
                        解除綁定
                      </button>
                      <button
                        @click="handleDeleteLicense(license)"
                        :disabled="deletingLicense === licenseRowId(license)"
                        class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span
                          v-if="deletingLicense === licenseRowId(license)"
                          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                        ></span>
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- 副 LK 列（展開在主 LK 下方） -->
                <tr
                  v-for="(ext, extIdx) in license.extensions || []"
                  :key="licenseRowId(ext)"
                  :class="
                    conditionalClass(
                      'border-b border-white/5 bg-white/[0.02]',
                      'border-b border-slate-100 bg-slate-50/50',
                    )
                  "
                >
                  <td class="py-3 px-4 pl-8 theme-text">
                    <span class="text-purple-200 mr-2 font-medium">
                      {{
                        extIdx === (license.extensions?.length || 0) - 1
                          ? `└ 副 LK ${extIdx + 1}`
                          : `├ 副 LK ${extIdx + 1}`
                      }}
                    </span>
                  </td>
                  <td class="py-3 px-4 relative group">
                    <span class="text-xs opacity-70 theme-text leading-none">-</span>

                    <div
                      class="pointer-events-none absolute top-full z-20 hidden rounded-lg border w-max px-3 py-2 text-sm shadow-lg group-hover:block"
                      :class="
                        conditionalClass(
                          'border-white/10 bg-[#0f172a] text-slate-100',
                          'border-slate-200 bg-white text-slate-700',
                        )
                      "
                    >
                      <div class="break-words">
                        {{ getFeatureTooltipText(ext.features) }}
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 theme-text font-mono">
                    {{ ext.serialNumber || '-' }}
                  </td>
                  <td class="py-3 px-4 theme-text font-mono text-sm">
                    {{ ext.licenseKey || '-' }}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      :class="getStatusClass(ext.status)"
                      class="px-2 py-1 rounded-full text-sm"
                    >
                      {{ getStatusText(ext.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 theme-text text-sm">
                    <div>{{ ext.applicant || '-' }}</div>
                    <div class="text-xs opacity-70">
                      {{ ext.appliedAt ? formatDate(ext.appliedAt) : '-' }}
                    </div>
                  </td>
                  <td class="py-3 px-4 theme-text text-sm">
                    <div>{{ ext.reviewer || '-' }}</div>
                    <div class="text-xs opacity-70">
                      {{ ext.reviewedAt ? formatDate(ext.reviewedAt) : '-' }}
                    </div>
                  </td>
                  <td class="py-3 px-4 theme-text text-sm">{{ ext.notes || '-' }}</td>
                  <td class="py-3 px-4">
                    <div class="flex gap-2 flex-wrap">
                      <button
                        v-if="ext.status === 'pending' && isAdmin"
                        @click="handleReviewLicense(ext)"
                        :disabled="reviewingLicense === licenseRowId(ext)"
                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span
                          v-if="reviewingLicense === licenseRowId(ext)"
                          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                        ></span>
                        審核
                      </button>
                      <button
                        @click="handleDeleteLicense(ext)"
                        :disabled="deletingLicense === licenseRowId(ext)"
                        class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="licenses.length === 0">
                <td
                  colspan="10"
                  class="text-center py-6"
                  :class="conditionalClass('text-gray-400', 'text-slate-500')"
                >
                  目前沒有授權記錄
                </td>
              </tr>
            </tbody>
          </table>
          <!-- 分頁控制 -->
          <div
            v-if="licensePagination.totalPages > 1"
            class="py-4 flex justify-center gap-2 border-t"
            :class="conditionalClass('border-white/10', 'border-slate-200')"
          >
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

    <CreateLicenseModal
      :open="showCreateLicenseModal"
      :submitting="creatingLicense"
      :card-class="cardClass"
      :conditional-class="conditionalClass"
      :ba-features="BA_FEATURES"
      :get-allowed-feature-keys-by-profile="getAllowedFeatureKeysByProfile"
      :get-feature-label="getFeatureLabel"
      :default-applicant="userStore.account"
      @close="showCreateLicenseModal = false"
      @submit="handleCreateSubmit"
    />

    <ExtendLicenseModal
      :open="showExtendModal"
      :submitting="extendingLicense"
      :card-class="cardClass"
      :conditional-class="conditionalClass"
      :target="extendTarget"
      :ba-features="BA_FEATURES"
      :existing-features="existingFeatures"
      :get-allowed-feature-keys-by-profile="getAllowedFeatureKeysByProfile"
      :get-feature-label="getFeatureLabel"
      :default-applicant="userStore.account"
      @close="showExtendModal = false"
      @submit="handleExtendSubmit"
    />

    <EditLicenseModal
      :open="showEditLicenseModal"
      :submitting="updatingLicense"
      :card-class="cardClass"
      :conditional-class="conditionalClass"
      :license="editingLicense"
      :is-admin="isAdmin"
      :get-feature-label="getFeatureLabel"
      @close="showEditLicenseModal = false"
      @submit="handleEditSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useNotifications } from '@/composables/notificationCenter'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePageInitialization } from '@/composables/usePageInitialization'
import CreateLicenseModal from '@/components/license/CreateLicenseModal.vue'
import ExtendLicenseModal from '@/components/license/ExtendLicenseModal.vue'
import EditLicenseModal from '@/components/license/EditLicenseModal.vue'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

const isAdmin = computed(() => userStore.isAdmin)
const isStaff = computed(() => userStore.isStaff)

const { loading: loadingLicenses, initialize } = usePageInitialization()

const error = ref('')

const BA_FEATURES = [
  { value: 'people_counting', label: '人流統計' },
  { value: 'lighting', label: '照明系統' },
  { value: 'drainage', label: '排水系統' },
  { value: 'fire', label: '消防系統' },
  { value: 'emergency_rescue', label: '緊急求救' },
  { value: 'environment', label: '環境品質' },
  { value: 'surveillance', label: '影像監控' },
  { value: 'vehicle_access', label: '車輛進出' },
]

const getFeatureLabel = (featureValue) => {
  const feat = BA_FEATURES.find((f) => f.value === featureValue)
  return feat ? feat.label : featureValue
}

const getFeatureTooltipText = (features) => {
  const safeFeatures = Array.isArray(features) ? features : []
  if (safeFeatures.length === 0) return '無'
  return safeFeatures.map((f) => getFeatureLabel(f)).join('、')
}

const licenseRowId = (row) => row?._id || row?.id

const getAllowedFeatureKeysByProfile = (deploymentProfile) => {
  if (deploymentProfile === 'construction') {
    return ['people_counting', 'environment', 'surveillance', 'vehicle_access']
  }
  return [
    'people_counting',
    'lighting',
    'drainage',
    'fire',
    'emergency_rescue',
    'environment',
    'surveillance',
    'vehicle_access',
  ]
}

const licenses = computed(() => {
  const storeLicenses = userStore.licenses
  return Array.isArray(storeLicenses) ? storeLicenses : []
})

const showCreateLicenseModal = ref(false)
const showEditLicenseModal = ref(false)
const showExtendModal = ref(false)
const reviewingLicense = ref(null)
const editingLicense = ref(null)
const creatingLicense = ref(false)
const updatingLicense = ref(false)
const deletingLicense = ref(null)
const unbindingLicense = ref(null)
const extendingLicense = ref(false)
const extendTarget = ref(null)
const handleReviewLicense = async (license) => {
  const isSubLicense = Boolean(license.parentLicenseKey)
  const confirmMessage = isSubLicense
    ? `確定要審核副授權「${license.customerName}」的追加授權嗎？審核後將自動產生 License Key（副授權無 Serial Number）。`
    : `確定要審核授權「${license.customerName}」嗎？審核後將自動產生 Serial Number 與 License Key。`

  if (!confirm(confirmMessage)) return

  try {
    const id = licenseRowId(license)
    reviewingLicense.value = id
    await userStore.reviewLicense(id)
    await fetchLicenses()
  } catch (err) {
    console.error('審核授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '審核授權失敗，請稍後再試')
  } finally {
    reviewingLicense.value = null
  }
}

// 分頁
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
    licensePagination.value.totalPages = Math.max(
      Math.ceil(items / licensePagination.value.itemsPerPage),
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

// 追加授權 Modal 相關
const existingFeatures = computed(() => {
  if (!extendTarget.value) return []
  const main = extendTarget.value.features || []
  const exts = (extendTarget.value.extensions || []).flatMap((e) => e.features || [])
  return [...new Set([...main, ...exts])]
})

// 權限控制
const canEditLicense = (license) => {
  if (isAdmin.value) return true
  if (isStaff.value) return license.status === 'pending'
  return false
}

// 狀態樣式
const getStatusClass = (status) => {
  const classMap = {
    pending: conditionalClass('bg-yellow-500/20 text-yellow-300', 'bg-yellow-100 text-yellow-700'),
    available: conditionalClass('bg-blue-500/20 text-blue-300', 'bg-blue-100 text-blue-700'),
    active: conditionalClass('bg-green-500/20 text-green-300', 'bg-green-100 text-green-700'),
    inactive: conditionalClass('bg-slate-500/20 text-slate-300', 'bg-slate-200 text-slate-700'),
  }
  return classMap[status] || ''
}

// 初始化
onMounted(async () => {
  await initialize(async () => {
    await fetchLicenses()
  })
})

const handleCreateSubmit = async (result) => {
  if (result?.error) {
    notify.notifyWarning(result.error)
    return
  }
  try {
    creatingLicense.value = true
    await userStore.createLicense({
      product: 'BA-system',
      deploymentProfile: result.deploymentProfile,
      customerName: result.customerName,
      applicant: result.applicant,
      features: result.features,
      notes: result.notes || null,
      quotas: result.quotas || null,
    })
    showCreateLicenseModal.value = false
    await fetchLicenses()
  } catch (err) {
    console.error('建立授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '建立授權失敗，請稍後再試')
  } finally {
    creatingLicense.value = false
  }
}

// 載入授權列表
const fetchLicenses = async () => {
  try {
    error.value = ''
    await userStore.getAllLicenses({ product: 'BA-system' })
  } catch (err) {
    console.error('載入授權列表失敗：', err)
    const errorMsg =
      err?.response?.data?.message || err?.message || '載入授權列表失敗，請重新整理頁面'
    error.value = errorMsg
    notify.notifyError(errorMsg)
    if (!Array.isArray(userStore.licenses)) {
      userStore.licenses = []
    }
  }
}

const handleUnbindLicense = async (license) => {
  const extensionCount = (license.extensions || []).length
  const extMsg =
    extensionCount > 0 ? `\n\n該授權有 ${extensionCount} 組副 LK 也將被重置為「可啟用」` : ''

  if (
    !confirm(
      `確定要解除授權 "${license.customerName}" 的設備綁定嗎？解除後此授權可在新設備上重新啟用。${extMsg}`,
    )
  ) {
    return
  }

  try {
    const id = licenseRowId(license)
    unbindingLicense.value = id
    await userStore.unbindLicense(id)
    await fetchLicenses()
  } catch (err) {
    console.error('解除綁定失敗:', err)
    notify.notifyError(err.response?.data?.message || '解除綁定失敗，請稍後再試')
  } finally {
    unbindingLicense.value = null
  }
}

const handleOpenExtendModal = (license) => {
  extendTarget.value = license
  showExtendModal.value = true
}

const handleExtendSubmit = async (result) => {
  if (result?.error) {
    notify.notifyWarning(result.error)
    return
  }
  if (!extendTarget.value) return
  try {
    extendingLicense.value = true
    await userStore.extendLicense(licenseRowId(extendTarget.value), {
      features: result.features,
      applicant: result.applicant,
      notes: result.notes || null,
      quotas: result.quotas || null,
    })
    showExtendModal.value = false
    extendTarget.value = null
    await fetchLicenses()
  } catch (err) {
    console.error('追加授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '追加授權失敗，請稍後再試')
  } finally {
    extendingLicense.value = false
  }
}

const handleEditLicense = (license) => {
  if (!canEditLicense(license)) {
    if (isStaff.value && license.status !== 'pending') {
      notify.notifyWarning('staff 只能編輯「審核中」狀態的授權')
    }
    return
  }
  editingLicense.value = {
    ...license,
    deploymentProfile: license.deploymentProfile || 'central',
    features: [...(license.features || [])],
    _originalStatus: license.status,
    _originalFeatures: [...(license.features || [])],
  }
  showEditLicenseModal.value = true
}

const handleEditSubmit = async (result) => {
  if (result?.error) {
    notify.notifyWarning(result.error)
    return
  }
  try {
    updatingLicense.value = true
    const { id, notes } = result
    const notesPayload = notes ?? null

    if (isAdmin.value && result.status !== undefined && result.previousStatus !== undefined) {
      const { status, previousStatus } = result
      const statusChanged = status !== previousStatus

      if (statusChanged) {
        await userStore.updateLicense(id, { notes: notesPayload, status })
      } else {
        await userStore.updateLicense(id, { notes: notesPayload })
      }
    } else {
      await userStore.updateLicense(id, { notes: notesPayload })
    }

    showEditLicenseModal.value = false
    editingLicense.value = null
    await fetchLicenses()
  } catch (err) {
    console.error('更新授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '更新授權失敗，請稍後再試')
  } finally {
    updatingLicense.value = false
  }
}

const handleDeleteLicense = async (license) => {
  const isExtension = !!license.parentLicenseKey
  const label = isExtension ? '副 LK' : '授權'
  const extCount = (license.extensions || []).length
  const cascadeNote =
    !isExtension && extCount > 0 ? `\n\n將一併永久刪除其下 ${extCount} 組副授權。` : ''
  if (
    !confirm(
      `確定要刪除${label}「${license.serialNumber || license.customerName}」嗎？此操作不可恢復！${cascadeNote}`,
    )
  ) {
    return
  }

  try {
    const licenseId = licenseRowId(license)
    deletingLicense.value = licenseId
    await userStore.deleteLicense(licenseId)
    await fetchLicenses()
  } catch (err) {
    console.error('刪除授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '刪除授權失敗，請稍後再試')
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
