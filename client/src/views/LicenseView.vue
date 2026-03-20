<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">授權管理</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">
        管理 BA 系統授權申請、審核和狀態
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
                <th class="text-left py-3 px-4 theme-text">授權模組</th>
                <th class="text-left py-3 px-4 theme-text">Serial Number</th>
                <th class="text-left py-3 px-4 theme-text">License Key</th>
                <th class="text-left py-3 px-4 theme-text">狀態</th>
                <th class="text-left py-3 px-4 theme-text">設備指紋</th>
                <th class="text-left py-3 px-4 theme-text">申請人 / 時間</th>
                <th class="text-left py-3 px-4 theme-text">審核人 / 時間</th>
                <th class="text-left py-3 px-4 theme-text">備註</th>
                <th class="text-left py-3 px-4 theme-text">操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="license in pagedLicenses" :key="license._id || license.id">
                <!-- 主 LK 列 -->
                <tr
                  :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
                >
                  <td class="py-3 px-4 theme-text">{{ license.customerName || '-' }}</td>
                  <td class="py-3 px-4">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="feat in license.features || []"
                        :key="feat"
                        class="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300"
                      >
                        {{ getFeatureLabel(feat) }}
                      </span>
                      <span v-if="!license.features?.length" class="text-xs opacity-50 theme-text"
                        >-</span
                      >
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
                  <td class="py-3 px-4 theme-text text-xs font-mono max-w-32 truncate" :title="license.deviceFingerprint">
                    {{ license.deviceFingerprint || '-' }}
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
                        v-if="license.status === 'active' && isAdmin && !license.parentLicenseKey"
                        @click="handleUnbindLicense(license)"
                        :disabled="unbindingLicense === (license._id || license.id)"
                        class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span
                          v-if="unbindingLicense === (license._id || license.id)"
                          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                        ></span>
                        解除綁定
                      </button>
                      <button
                        v-if="license.licenseKey && !license.parentLicenseKey && isAdmin"
                        @click="handleOpenExtendModal(license)"
                        class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                      >
                        追加功能
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
                <!-- 副 LK 列（展開在主 LK 下方） -->
                <tr
                  v-for="ext in license.extensions || []"
                  :key="ext._id || ext.id"
                  :class="conditionalClass('border-b border-white/5 bg-white/[0.02]', 'border-b border-slate-100 bg-slate-50/50')"
                >
                  <td class="py-2 px-4 pl-8 theme-text text-sm opacity-70">
                    <span class="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 mr-1">副 LK</span>
                  </td>
                  <td class="py-2 px-4">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="feat in ext.features || []"
                        :key="feat"
                        class="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300"
                      >
                        {{ getFeatureLabel(feat) }}
                      </span>
                    </div>
                  </td>
                  <td class="py-2 px-4 theme-text font-mono text-sm opacity-70">{{ ext.serialNumber || '-' }}</td>
                  <td class="py-2 px-4 theme-text font-mono text-xs opacity-70">{{ ext.licenseKey || '-' }}</td>
                  <td class="py-2 px-4">
                    <span
                      :class="getStatusClass(ext.status)"
                      class="px-2 py-1 rounded-full text-xs"
                    >
                      {{ getStatusText(ext.status) }}
                    </span>
                  </td>
                  <td class="py-2 px-4 theme-text text-xs opacity-50">-</td>
                  <td class="py-2 px-4 theme-text text-xs opacity-70">
                    {{ ext.appliedAt ? formatDate(ext.appliedAt) : '-' }}
                  </td>
                  <td class="py-2 px-4 theme-text text-xs opacity-70">
                    {{ ext.reviewedAt ? formatDate(ext.reviewedAt) : '-' }}
                  </td>
                  <td class="py-2 px-4 theme-text text-xs opacity-70">{{ ext.notes || '-' }}</td>
                  <td class="py-2 px-4">
                    <button
                      @click="handleDeleteLicense(ext)"
                      :disabled="deletingLicense === (ext._id || ext.id)"
                      class="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs transition cursor-pointer"
                    >
                      刪除
                    </button>
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
            <label class="block text-sm font-medium theme-text mb-2">授權功能模組 *</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="feat in BA_FEATURES"
                :key="feat.value"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition"
                :class="[
                  newLicense.features.includes(feat.value)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white'),
                ]"
              >
                <input
                  type="checkbox"
                  :value="feat.value"
                  v-model="newLicense.features"
                  class="accent-indigo-500"
                />
                <span class="text-sm theme-text">{{ feat.label }}</span>
              </label>
            </div>
            <p class="text-xs mt-1" :class="conditionalClass('text-gray-400', 'text-slate-500')">
              請選擇此授權包含的功能模組
            </p>
          </div>
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
            :disabled="
              creatingLicense ||
              !newLicense.customerName ||
              !newLicense.applicant ||
              newLicense.features.length === 0
            "
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

    <!-- 追加功能 Modal -->
    <div
      v-if="showExtendModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showExtendModal = false"
    >
      <div :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm w-full max-w-md']" @click.stop>
        <h3 class="text-xl font-semibold theme-text mb-4">追加功能（產生副 LK）</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text mb-2">主授權</label>
            <div class="text-sm theme-text opacity-70">
              <p>{{ extendTarget?.customerName }}</p>
              <p class="font-mono text-xs mt-1">{{ extendTarget?.licenseKey }}</p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">目前已有的功能</label>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="feat in existingFeatures"
                :key="feat"
                class="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300"
              >
                {{ getFeatureLabel(feat) }}
              </span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">追加的功能模組 *</label>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="feat in availableExtendFeatures"
                :key="feat.value"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition"
                :class="[
                  extendFeatures.includes(feat.value)
                    ? 'border-purple-500 bg-purple-500/10'
                    : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white'),
                ]"
              >
                <input
                  type="checkbox"
                  :value="feat.value"
                  v-model="extendFeatures"
                  class="accent-purple-500"
                />
                <span class="text-sm theme-text">{{ feat.label }}</span>
              </label>
            </div>
            <p
              v-if="availableExtendFeatures.length === 0"
              class="text-xs mt-1"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              所有功能模組已啟用，無法追加
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium theme-text mb-2">備註</label>
            <textarea
              v-model="extendNotes"
              rows="2"
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
            @click="handleExtendLicense"
            :disabled="extendingLicense || extendFeatures.length === 0"
            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <span
              v-if="extendingLicense"
              class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
            ></span>
            建立副 LK
          </button>
          <button
            @click="showExtendModal = false"
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
      <div
        :class="[
          cardClass,
          'rounded-xl p-6 backdrop-blur-sm w-full max-w-md max-h-[90vh] overflow-y-auto',
        ]"
        @click.stop
      >
        <h3 class="text-xl font-semibold theme-text mb-4">編輯授權</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text mb-2">
              授權功能模組
              <span v-if="isAdmin" class="text-indigo-400 text-xs ml-1">(可編輯)</span>
            </label>
            <!-- Admin 可編輯 features -->
            <div v-if="isAdmin" class="grid grid-cols-2 gap-2">
              <label
                v-for="feat in BA_FEATURES"
                :key="feat.value"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition"
                :class="[
                  editingLicense?.features?.includes(feat.value)
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white'),
                ]"
              >
                <input
                  type="checkbox"
                  :value="feat.value"
                  v-model="editingLicense.features"
                  class="accent-indigo-500"
                />
                <span class="text-sm theme-text">{{ feat.label }}</span>
              </label>
            </div>
            <!-- 非 Admin 只能查看 -->
            <div v-else class="flex flex-wrap gap-1">
              <span
                v-for="feat in editingLicense?.features || []"
                :key="feat"
                class="px-2 py-1 rounded text-xs bg-indigo-500/20 text-indigo-300"
              >
                {{ getFeatureLabel(feat) }}
              </span>
              <span v-if="!editingLicense?.features?.length" class="text-sm opacity-50 theme-text"
                >無</span
              >
            </div>
          </div>
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
            <div class="relative" ref="statusDropdownRef">
              <button
                type="button"
                @click="toggleStatusDropdown"
                class="flex items-center justify-between gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                :class="
                  conditionalClass(
                    'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                    'border-2 border-slate-300 bg-white hover:bg-slate-50',
                  )
                "
                :disabled="isStatusDropdownDisabled"
              >
                <span>{{ statusDropdownLabel }}</span>
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': isStatusDropdownOpen }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                v-if="isStatusDropdownOpen"
                :class="[
                  cardClass,
                  'absolute left-0 right-0 z-20 mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                ]"
              >
                <div
                  :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                  class="backdrop-blur-sm rounded-lg"
                >
                  <button
                    v-for="option in statusDropdownOptions"
                    :key="option.value"
                    type="button"
                    @click="selectStatus(option)"
                    class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                    :class="[
                      conditionalClass(
                        'hover:bg-white/10 text-white',
                        'hover:bg-slate-100 text-slate-700',
                      ),
                      option.disabled ? 'opacity-50 cursor-not-allowed' : '',
                    ]"
                    :disabled="option.disabled"
                  >
                    <span>{{ option.label }}</span>
                    <span v-if="editingLicense?.status === option.value" class="text-blue-400"
                      >✓</span
                    >
                  </button>
                </div>
              </div>
            </div>
            <p
              v-if="!canEditStatus(editingLicense) && editingLicense?.status !== 'active'"
              class="text-xs mt-1"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              提示：staff 無法修改授權狀態
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
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useNotifications } from '@/composables/notificationCenter'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePageInitialization } from '@/composables/usePageInitialization'

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
  { value: 'environment', label: '環境品質' },
  { value: 'surveillance', label: '影像監控' },
  { value: 'vehicle_access', label: '車輛進出' },
]

const getFeatureLabel = (featureValue) => {
  const feat = BA_FEATURES.find((f) => f.value === featureValue)
  return feat ? feat.label : featureValue
}

const licenses = computed(() => {
  const storeLicenses = userStore.licenses
  return Array.isArray(storeLicenses) ? storeLicenses : []
})

const showCreateLicenseModal = ref(false)
const showEditLicenseModal = ref(false)
const showExtendModal = ref(false)
const newLicense = ref({ customerName: '', applicant: '', features: [], notes: '' })
const reviewingLicense = ref(false)
const editingLicense = ref(null)
const creatingLicense = ref(false)
const updatingLicense = ref(false)
const deletingLicense = ref(null)
const unbindingLicense = ref(null)
const extendingLicense = ref(false)
const extendTarget = ref(null)
const extendFeatures = ref([])
const extendNotes = ref('')

const statusDropdownRef = ref(null)
const isStatusDropdownOpen = ref(false)

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

// 追加功能 Modal 相關
const existingFeatures = computed(() => {
  if (!extendTarget.value) return []
  const main = extendTarget.value.features || []
  const exts = (extendTarget.value.extensions || []).flatMap((e) => e.features || [])
  return [...new Set([...main, ...exts])]
})

const availableExtendFeatures = computed(() => {
  return BA_FEATURES.filter((f) => !existingFeatures.value.includes(f.value))
})

// 權限控制
const canEditLicense = (license) => {
  if (isAdmin.value) return true
  if (isStaff.value) return license.status === 'pending'
  return false
}

const canEditStatus = (license) => {
  if (!license) return false
  if (isAdmin.value) return true
  return false
}

const canSetStatusToPending = (license) => {
  if (!license) return false
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
  }
  return classMap[status] || ''
}

// 初始化
onMounted(async () => {
  await initialize(async () => {
    await fetchLicenses()
  })

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(showCreateLicenseModal, (isOpen) => {
  if (isOpen) {
    newLicense.value.applicant = userStore.account || ''
  }
})

watch(showEditLicenseModal, (isOpen) => {
  if (!isOpen) {
    isStatusDropdownOpen.value = false
  }
})

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

const handleCreateLicense = async () => {
  if (!newLicense.value.customerName) {
    notify.notifyWarning('請輸入客戶名稱')
    return
  }
  if (!newLicense.value.applicant) {
    notify.notifyWarning('請輸入申請人')
    return
  }
  if (newLicense.value.features.length === 0) {
    notify.notifyWarning('必須選擇至少一個功能模組')
    return
  }

  try {
    creatingLicense.value = true
    await userStore.createLicense({
      product: 'BA-system',
      customerName: newLicense.value.customerName,
      applicant: newLicense.value.applicant,
      features: newLicense.value.features,
      notes: newLicense.value.notes || null,
    })
    showCreateLicenseModal.value = false
    newLicense.value = { customerName: '', applicant: '', features: [], notes: '' }
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
    await userStore.reviewLicense(license._id || license.id)
    notify.notifySuccess('授權審核成功')
    await fetchLicenses()
  } catch (err) {
    console.error('審核授權失敗:', err)
    notify.notifyError(err.response?.data?.message || '審核授權失敗，請稍後再試')
  } finally {
    reviewingLicense.value = false
  }
}

const handleUnbindLicense = async (license) => {
  const extensionCount = (license.extensions || []).length
  const extMsg = extensionCount > 0
    ? `\n\n該授權有 ${extensionCount} 組副 LK 也將被重置為「可啟用」`
    : ''

  if (!confirm(`確定要解除授權 "${license.customerName}" 的設備綁定嗎？解除後此授權可在新設備上重新啟用。${extMsg}`)) {
    return
  }

  try {
    unbindingLicense.value = license._id || license.id
    await userStore.unbindLicense(license._id || license.id)
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
  extendFeatures.value = []
  extendNotes.value = ''
  showExtendModal.value = true
}

const handleExtendLicense = async () => {
  if (!extendTarget.value || extendFeatures.value.length === 0) return

  try {
    extendingLicense.value = true
    await userStore.extendLicense(extendTarget.value._id || extendTarget.value.id, {
      features: extendFeatures.value,
      notes: extendNotes.value || null,
    })
    showExtendModal.value = false
    extendTarget.value = null
    extendFeatures.value = []
    extendNotes.value = ''
    await fetchLicenses()
  } catch (err) {
    console.error('追加功能失敗:', err)
    notify.notifyError(err.response?.data?.message || '追加功能失敗，請稍後再試')
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
    features: [...(license.features || [])],
    _originalStatus: license.status,
    _originalFeatures: [...(license.features || [])],
  }
  isStatusDropdownOpen.value = false
  showEditLicenseModal.value = true
}

const handleUpdateLicense = async () => {
  if (!editingLicense.value) return

  const originalStatus = editingLicense.value._originalStatus || editingLicense.value.status

  if (originalStatus !== 'active' && editingLicense.value.status === 'active') {
    notify.notifyWarning('「使用中」狀態由系統自動設定，無法手動設置')
    editingLicense.value.status = originalStatus
    return
  }

  if (isStaff.value && editingLicense.value.status !== originalStatus) {
    notify.notifyWarning('staff 無法修改授權狀態，只能編輯備註')
    editingLicense.value.status = originalStatus
    return
  }

  if (editingLicense.value.features.length === 0) {
    notify.notifyWarning('必須保留至少一個功能模組')
    return
  }

  try {
    updatingLicense.value = true
    const licenseId = editingLicense.value._id || editingLicense.value.id
    const updateData = { notes: editingLicense.value.notes || null }

    if (isAdmin.value) {
      updateData.status = editingLicense.value.status
      updateData.features = editingLicense.value.features
    }

    await userStore.updateLicense(licenseId, updateData)
    showEditLicenseModal.value = false

    const featuresChanged =
      JSON.stringify([...editingLicense.value.features].sort()) !==
      JSON.stringify([...(editingLicense.value._originalFeatures || [])].sort())

    editingLicense.value = null
    await fetchLicenses()

    if (featuresChanged) {
      notify.notifySuccess('授權模組已更新。離線設備需透過副 LK 重新啟用。')
    }
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
  if (
    !confirm(
      `確定要刪除${label} "${license.serialNumber || license.customerName}" 嗎？此操作不可恢復！`,
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
  }
  return statusMap[status] || status
}

const isStatusDropdownDisabled = computed(() => {
  if (!editingLicense.value) return true

  const originalStatus = editingLicense.value._originalStatus || editingLicense.value.status
  if (originalStatus === 'active') return true

  return !canEditStatus(editingLicense.value)
})

const statusDropdownLabel = computed(() => {
  if (!editingLicense.value?.status) return '狀態'
  return getStatusText(editingLicense.value.status)
})

const statusDropdownOptions = computed(() => {
  if (!editingLicense.value) return []

  const originalStatus = editingLicense.value._originalStatus || editingLicense.value.status

  if (originalStatus === 'active') {
    return [
      { value: 'active', label: '使用中', disabled: true },
    ]
  }

  return [
    {
      value: 'pending',
      label: '審核中',
      disabled: !canSetStatusToPending(editingLicense.value),
    },
    { value: 'available', label: '可啟用', disabled: false },
  ]
})

const toggleStatusDropdown = () => {
  if (isStatusDropdownDisabled.value) return
  isStatusDropdownOpen.value = !isStatusDropdownOpen.value
}

const selectStatus = (option) => {
  if (!editingLicense.value) return
  if (option?.disabled) return

  editingLicense.value.status = option.value
  isStatusDropdownOpen.value = false
}

const handleClickOutside = (event) => {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(event.target)) {
    isStatusDropdownOpen.value = false
  }
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
