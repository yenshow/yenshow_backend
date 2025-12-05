<template>
  <div class="container mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4 theme-text">管理員控制台</h1>
      <p :class="conditionalClass('text-gray-400', 'text-slate-500')">
        管理用戶帳號、權限和系統設置
      </p>
    </div>

    <!-- Tab 切換按鈕 -->
    <div
      class="flex mb-6 border-b"
      :class="conditionalClass('border-gray-700', 'border-slate-200')"
    >
      <button
        @click="activeTab = 'all'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'all'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        所有用戶
      </button>
      <button
        @click="activeTab = 'clients'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'clients'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        客戶管理
      </button>
      <button
        @click="activeTab = 'staff'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'staff'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        員工管理
      </button>
      <button
        @click="activeTab = 'licenses'"
        :class="[
          'py-2 px-4 transition-colors',
          activeTab === 'licenses'
            ? conditionalClass(
                'border-b-2 border-blue-500 text-blue-400',
                'border-b-2 border-blue-600 text-blue-600',
              )
            : conditionalClass('text-gray-400', 'text-slate-500'),
        ]"
      >
        授權管理
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

    <!-- 載入中提示 -->
    <div
      v-if="loading && activeTab !== 'licenses'"
      class="flex flex-col items-center justify-center py-12"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 mb-4"
        :class="conditionalClass('border-white', 'border-blue-600')"
      ></div>
      <p :class="conditionalClass('text-gray-300', 'text-slate-500')">正在載入用戶資料...</p>
    </div>

    <div
      v-if="loadingLicenses && activeTab === 'licenses'"
      class="flex flex-col items-center justify-center py-12"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 mb-4"
        :class="conditionalClass('border-white', 'border-blue-600')"
      ></div>
      <p :class="conditionalClass('text-gray-300', 'text-slate-500')">正在載入授權資料...</p>
    </div>

    <!-- 用戶管理區塊 -->
    <div
      v-else-if="activeTab !== 'licenses'"
      :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']"
    >
      <!-- 頂部操作列 -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold theme-text">
          {{
            activeTab === 'all'
              ? '用戶管理'
              : activeTab === 'clients'
                ? '客戶管理'
                : activeTab === 'staff'
                  ? '員工管理'
                  : '授權管理'
          }}
        </h2>
        <button
          v-if="activeTab !== 'licenses'"
          @click="showCreateUserModal = true"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增{{ activeTab === 'clients' ? '客戶' : activeTab === 'staff' ? '員工' : '用戶' }}
        </button>
        <button
          v-if="activeTab === 'licenses'"
          @click="showCreateLicenseModal = true"
          class="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          新增授權
        </button>
      </div>
      <!-- 所有用戶列表 -->
      <div v-if="activeTab === 'all'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">身分</th>
              <th class="text-left py-3 px-4 theme-text">信箱</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in pagedUsers"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ user.account }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.role === 'admin'
                      ? conditionalClass(
                          'bg-purple-700/30 text-purple-200',
                          'bg-purple-200 text-purple-800',
                        )
                      : user.role === 'staff'
                        ? conditionalClass(
                            'bg-yellow-700/30 text-yellow-200',
                            'bg-yellow-200 text-yellow-800',
                          )
                        : conditionalClass(
                            'bg-green-500/20 text-green-300',
                            'bg-green-100 text-green-700',
                          )
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.role === 'admin' ? '管理員' : user.role === 'staff' ? '員工' : '客戶' }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text">{{ user.email }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleEditUser(user)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td
                colspan="5"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有符合條件的用戶
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分頁控制 -->
        <div v-if="pagination.totalPages > 1" class="py-4 flex justify-center gap-2">
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

      <!-- 客戶列表 -->
      <div v-else-if="activeTab === 'clients'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">公司名稱</th>
              <th class="text-left py-3 px-4 theme-text">聯絡人</th>
              <th class="text-left py-3 px-4 theme-text">電話</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in pagedUsers"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">{{ user.account }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.companyName || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.contactPerson || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.clientInfo?.phone || '-' }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleEditUser(user)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td
                colspan="6"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有符合條件的用戶
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分頁控制 -->
        <div v-if="pagination.totalPages > 1" class="py-4 flex justify-center gap-2">
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

      <!-- 員工列表 -->
      <div v-else-if="activeTab === 'staff'" class="overflow-x-auto">
        <table class="w-full">
          <thead :class="conditionalClass('border-b border-white/10', 'border-b border-slate-200')">
            <tr>
              <th class="text-left py-3 px-4 theme-text">帳號</th>
              <th class="text-left py-3 px-4 theme-text">身分</th>
              <th class="text-left py-3 px-4 theme-text">部門</th>
              <th class="text-left py-3 px-4 theme-text">職位</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in pagedUsers"
              :key="user._id"
              :class="conditionalClass('border-b border-white/5', 'border-b border-slate-100')"
            >
              <td class="py-3 px-4 theme-text">
                {{ user.account }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.role === 'admin'
                      ? conditionalClass(
                          'bg-purple-700/30 text-purple-200',
                          'bg-purple-200 text-purple-800',
                        )
                      : user.role === 'staff'
                        ? conditionalClass(
                            'bg-yellow-700/30 text-yellow-200',
                            'bg-yellow-200 text-yellow-800',
                          )
                        : conditionalClass(
                            'bg-green-500/20 text-green-300',
                            'bg-green-100 text-green-700',
                          )
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.role === 'admin' ? '管理員' : user.role === 'staff' ? '員工' : '客戶' }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text">{{ user.staffInfo?.department || '-' }}</td>
              <td class="py-3 px-4 theme-text">{{ user.staffInfo?.position || '-' }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    user.isActive
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ user.isActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleEditUser(user)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
                  >
                    編輯
                  </button>
                  <button
                    v-if="user.role !== 'admin'"
                    @click="handleDeleteUser(user)"
                    :disabled="deletingUser === user._id"
                    class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
                  >
                    <span
                      v-if="deletingUser === user._id"
                      class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
                    ></span>
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td
                colspan="6"
                class="text-center py-6"
                :class="conditionalClass('text-gray-400', 'text-slate-500')"
              >
                目前沒有符合條件的用戶
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分頁控制 -->
        <div v-if="pagination.totalPages > 1" class="py-4 flex justify-center gap-2">
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
    </div>

    <!-- 授權管理區塊 -->
    <div
      v-else-if="activeTab === 'licenses' && !loadingLicenses"
      :class="[cardClass, 'rounded-xl p-6 backdrop-blur-sm']"
    >
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
              <th class="text-left py-3 px-4 theme-text">Serial Number</th>
              <th class="text-left py-3 px-4 theme-text">License Key</th>
              <th class="text-left py-3 px-4 theme-text">狀態</th>
              <th class="text-left py-3 px-4 theme-text">使用時間</th>
              <th class="text-left py-3 px-4 theme-text">建立時間</th>
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
              <td class="py-3 px-4 theme-text font-mono">{{ license.serialNumber }}</td>
              <td class="py-3 px-4 theme-text font-mono text-sm">{{ license.licenseKey }}</td>
              <td class="py-3 px-4">
                <span
                  :class="
                    license.status === 'active'
                      ? conditionalClass(
                          'bg-green-500/20 text-green-300',
                          'bg-green-100 text-green-700',
                        )
                      : conditionalClass('bg-red-500/20 text-red-300', 'bg-red-100 text-red-700')
                  "
                  class="px-2 py-1 rounded-full text-sm"
                >
                  {{ license.status === 'active' ? '啟用中' : '未啟用' }}
                </span>
              </td>
              <td class="py-3 px-4 theme-text text-sm">
                {{ license.usedAt ? formatDate(license.usedAt) : '-' }}
              </td>
              <td class="py-3 px-4 theme-text text-sm">{{ formatDate(license.createdAt) }}</td>
              <td class="py-3 px-4 theme-text text-sm">{{ license.notes || '-' }}</td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="handleEditLicense(license)"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
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
                colspan="7"
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

    <!-- 新增用戶 Modal，根據activeTab設置預設角色 -->
    <CreateUserModal
      v-model:show="showCreateUserModal"
      :default-role="defaultRoleByTab"
      :is-editing="isEditing"
      :edit-user-data="editingUser"
      @user-created="handleUserUpdate"
      @update:show="handleModalClose"
    />

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
            <label class="block text-sm font-medium theme-text mb-2">Serial Number *</label>
            <input
              v-model="newLicense.serialNumber"
              type="text"
              placeholder="例如: SN-001"
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
            :disabled="creatingLicense || !newLicense.serialNumber"
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
            <label class="block text-sm font-medium theme-text mb-2">Serial Number</label>
            <input
              :value="editingLicense?.serialNumber"
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
            <label class="block text-sm font-medium theme-text mb-2">License Key</label>
            <input
              :value="editingLicense?.licenseKey"
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
            <select
              v-model="editingLicense.status"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            >
              <option value="inactive">未啟用</option>
              <option value="active">啟用中</option>
            </select>
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
import CreateUserModal from '@/components/CreateUserModal.vue'
import { useNotifications } from '@/composables/notificationCenter'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, conditionalClass } = useThemeClass()

// 本地狀態
const loading = computed(() => userStore.loading)
const storeUsers = computed(() => userStore.users || [])
const error = ref('')
const showCreateUserModal = ref(false)
const activeTab = ref('all')

// 授權管理狀態 - 使用 store
const licenses = computed(() => {
  const storeLicenses = userStore.licenses
  return Array.isArray(storeLicenses) ? storeLicenses : []
})
const loadingLicenses = computed(() => userStore.loadingLicenses)
const showCreateLicenseModal = ref(false)
const showEditLicenseModal = ref(false)
const newLicense = ref({ serialNumber: '', notes: '' })
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

watch(activeTab, (newTab) => {
  pagination.value.currentPage = 1
  if (newTab === 'licenses') {
    fetchLicenses()
  }
})

// 操作狀態追蹤
const deletingUser = ref(null)
const editingUser = ref(null)
const isEditing = ref(false)

// 分頁狀態
const pagination = ref({
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,
})

const tabRoleFilter = (user) => {
  if (activeTab.value === 'clients') {
    return user.role === 'client'
  }
  if (activeTab.value === 'staff') {
    return user.role === 'staff' || user.role === 'admin'
  }
  return true
}

const filteredUsers = computed(() => {
  return [...storeUsers.value]
    .filter((user) => tabRoleFilter(user))
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })
})

const pagedUsers = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage
  const end = start + pagination.value.itemsPerPage
  return filteredUsers.value.slice(start, end)
})

watch(
  [filteredUsers, () => pagination.value.itemsPerPage],
  ([items]) => {
    const total = items.length
    pagination.value.totalPages = Math.max(Math.ceil(total / pagination.value.itemsPerPage), 1)
    if (pagination.value.currentPage > pagination.value.totalPages) {
      pagination.value.currentPage = pagination.value.totalPages
    }
    if (pagination.value.currentPage < 1) {
      pagination.value.currentPage = 1
    }
  },
  { immediate: true },
)

watch(activeTab, () => {
  pagination.value.currentPage = 1
})

const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.currentPage)
    return
  pagination.value.currentPage = page
}

const defaultRoleByTab = computed(() => {
  if (activeTab.value === 'staff') return 'staff'
  if (activeTab.value === 'clients') return 'client'
  return 'client'
})

// 初始化載入
onMounted(async () => {
  await fetchUsers()
})

const fetchUsers = async () => {
  error.value = ''
  try {
    await userStore.getAllUsers()
  } catch (err) {
    console.error('載入用戶列表失敗：', err)
    error.value = typeof err === 'string' ? err : '載入用戶列表失敗，請重新整理頁面'
    notify.notifyError(error.value)
  }
}

const handleEditUser = async (user) => {
  if (user.role === 'admin') {
    notify.notifyWarning('無法編輯管理員帳號')
    return
  }

  editingUser.value = user
  isEditing.value = true
  showCreateUserModal.value = true
}

const handleModalClose = (show) => {
  if (!show) {
    editingUser.value = null
    isEditing.value = false
  }
}

const handleDeleteUser = async (user) => {
  if (user.role === 'admin') {
    notify.notifyWarning('不能刪除管理員帳號')
    return
  }

  if (!confirm(`確定要刪除用戶 "${user.account}" 嗎？此操作不可恢復！`)) {
    return
  }

  try {
    deletingUser.value = user._id
    await userStore.deleteUser(user._id)
    notify.notifySuccess(`成功刪除用戶 ${user.account}`)
  } catch (error) {
    console.error('刪除用戶失敗:', error)
    notify.notifyError(typeof error === 'string' ? error : '刪除用戶失敗，請稍後再試')
  } finally {
    deletingUser.value = null
  }
}

const handleUserUpdate = async () => {
  await fetchUsers()
}

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
  if (!newLicense.value.serialNumber) {
    notify.notifyWarning('請輸入 Serial Number')
    return
  }

  try {
    creatingLicense.value = true
    await userStore.createLicense({
      serialNumber: newLicense.value.serialNumber,
      notes: newLicense.value.notes || null,
    })
    showCreateLicenseModal.value = false
    newLicense.value = { serialNumber: '', notes: '' }
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

const handleEditLicense = (license) => {
  editingLicense.value = { ...license }
  showEditLicenseModal.value = true
}

const handleUpdateLicense = async () => {
  if (!editingLicense.value) return

  try {
    updatingLicense.value = true
    const licenseId = editingLicense.value._id || editingLicense.value.id
    await userStore.updateLicense(licenseId, {
      status: editingLicense.value.status,
      notes: editingLicense.value.notes || null,
    })
    showEditLicenseModal.value = false
    editingLicense.value = null
  } catch (err) {
    console.error('更新授權失敗:', err)
    const errorMsg = err.response?.data?.message || '更新授權失敗，請稍後再試'
    notify.notifyError(errorMsg)
  } finally {
    updatingLicense.value = false
  }
}

const handleDeleteLicense = async (license) => {
  if (!confirm(`確定要刪除授權 "${license.serialNumber}" 嗎？此操作不可恢復！`)) {
    return
  }

  try {
    const licenseId = license._id || license.id
    deletingLicense.value = licenseId
    await userStore.deleteLicense(licenseId)
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

.select-all {
  user-select: all;
}
</style>
