<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- 背景遮罩 -->
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

    <!-- Modal 內容 -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div :class="[cardClass, 'relative rounded-xl max-w-3xl w-full p-6']">
        <!-- 標題 -->
        <h3 class="text-xl font-semibold mb-6 theme-text">
          {{ isEditing ? '編輯用戶' : '新增用戶' }}
        </h3>

        <!-- 表單 -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 基本資料區塊 -->
          <div class="space-y-4">
            <h4 class="text-md font-medium theme-text">基本資料</h4>
            <div class="grid grid-cols-2 gap-4">
              <!-- 角色選擇 -->
              <div>
                <label for="role" class="block text-sm font-medium mb-2 theme-text"
                  >用戶角色 *</label
                >
                <select
                  id="role"
                  v-model="formData.role"
                  :disabled="roleReadonly"
                  :class="[
                    inputClass,
                    'w-full px-4 h-[40px] rounded-lg focus:outline-none focus:border-blue-500',
                    roleReadonly ? 'opacity-60 cursor-not-allowed' : '',
                  ]"
                >
                  <option
                    v-for="roleOption in availableRoles"
                    :key="roleOption"
                    :value="roleOption"
                    class="text-black/70"
                  >
                    {{ ROLE_LABELS[roleOption] || roleOption }}
                  </option>
                </select>
              </div>

              <!-- 電子郵件 -->
              <div>
                <label for="email" class="block text-sm font-medium mb-2 theme-text"
                  >電子郵件</label
                >
                <input
                  type="email"
                  id="email"
                  v-model="formData.email"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入電子郵件"
                />
              </div>

              <!-- 帳號 -->
              <div>
                <label for="account" class="block text-sm font-medium mb-2 theme-text"
                  >帳號 *</label
                >
                <input
                  type="text"
                  id="account"
                  v-model="formData.account"
                  required
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入帳號（4-20個字元）"
                />
              </div>

              <!-- 密碼 -->
              <div>
                <PasswordInput
                  id="userPassword"
                  v-model="formData.password"
                  :label="isEditing ? '新密碼' : '密碼'"
                  :placeholder="
                    isEditing ? '留空表示不變更（4-20 字元）' : '請輸入密碼（4-20 字元）'
                  "
                  :required="!isEditing"
                />
              </div>
            </div>
          </div>

          <!-- 客戶專屬資料 (當角色是客戶時顯示) -->
          <div v-if="formData.role === 'client'" class="space-y-4">
            <h4 class="text-md font-medium theme-text">客戶資料</h4>
            <div class="grid grid-cols-2 gap-4">
              <!-- 公司名稱 -->
              <div>
                <label for="companyName" class="block text-sm font-medium mb-2 theme-text"
                  >公司名稱</label
                >
                <input
                  type="text"
                  id="companyName"
                  v-model="formData.clientInfo.companyName"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入公司名稱"
                />
              </div>

              <!-- 地址 -->
              <div>
                <label for="address" class="block text-sm font-medium mb-2 theme-text">地址</label>
                <input
                  type="text"
                  id="address"
                  v-model="formData.clientInfo.address"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入聯絡地址"
                />
              </div>

              <!-- 聯絡人 -->
              <div>
                <label for="contactPerson" class="block text-sm font-medium mb-2 theme-text"
                  >聯絡人</label
                >
                <input
                  type="text"
                  id="contactPerson"
                  v-model="formData.clientInfo.contactPerson"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入聯絡人姓名"
                />
              </div>

              <!-- 電話 -->
              <div>
                <label for="phone" class="block text-sm font-medium mb-2 theme-text">電話</label>
                <input
                  type="text"
                  id="phone"
                  v-model="formData.clientInfo.phone"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入聯絡電話"
                />
              </div>
            </div>
          </div>

          <!-- 員工專屬資料 (當角色是員工或管理員時顯示) -->
          <div v-if="formData.role === 'staff' || formData.role === 'admin'" class="space-y-4">
            <h4 class="text-md font-medium theme-text">員工資料</h4>
            <div class="grid grid-cols-2 gap-4">
              <!-- 部門 -->
              <div>
                <label for="department" class="block text-sm font-medium mb-2 theme-text"
                  >部門</label
                >
                <input
                  type="text"
                  id="department"
                  v-model="formData.staffInfo.department"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入部門"
                />
              </div>

              <!-- 職位 -->
              <div>
                <label for="position" class="block text-sm font-medium mb-2 theme-text">職位</label>
                <input
                  type="text"
                  id="position"
                  v-model="formData.staffInfo.position"
                  :class="[
                    inputClass,
                    'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                  placeholder="請輸入職位"
                />
              </div>
            </div>
          </div>

          <!-- 帳號狀態 -->
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              v-model="formData.isActive"
              class="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <label for="isActive" class="theme-text">啟用</label>
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>

          <!-- 按鈕組 -->
          <div class="flex justify-end gap-4 mt-6">
            <button
              type="button"
              @click="close"
              :class="
                conditionalClass(
                  'text-white/70 hover:text-white',
                  'text-slate-500 hover:text-slate-700',
                )
              "
              class="px-4 py-2 transition"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition flex items-center gap-2 text-white"
            >
              <span
                v-if="loading"
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
              />
              {{ loading ? '處理中...' : isEditing ? '確認更新' : '確認新增' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import validator from 'validator'
import { useThemeClass } from '@/composables/useThemeClass'
import { ROLE_LABELS } from '@/constants/userLabels'
import PasswordInput from '@/components/common/PasswordInput.vue'
import { useNotifications } from '@/composables/notificationCenter'

// 獲取主題相關工具
const { cardClass, inputClass, conditionalClass } = useThemeClass()

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  defaultRole: {
    type: String,
    default: 'client',
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  editUserData: {
    type: Object,
    default: () => ({}),
  },
  availableRoles: {
    type: Array,
    default: () => ['client', 'staff', 'admin'],
  },
  roleReadonly: {
    type: Boolean,
    default: false,
  },
})

// 使用 toRefs 來解構 props
const { show, defaultRole, isEditing } = toRefs(props)

const emit = defineEmits(['update:show', 'user-created'])
const userStore = useUserStore()
const notify = useNotifications()

const formData = reactive({
  account: '',
  email: '',
  password: '',
  role: 'client',
  isActive: true,
  clientInfo: {
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
  },
  staffInfo: {
    department: '',
    position: '',
  },
})

// 監聽 defaultRole 變化，更新表單角色
watch(
  defaultRole,
  (newRole) => {
    if (newRole) {
      formData.role = newRole
    }
  },
  { immediate: true },
)

const loading = ref(false)
const error = ref('')

// 監聽角色變更，以適當初始化對應資料
watch(
  () => formData.role,
  (newRole) => {
    if (newRole === 'client') {
      // 確保客戶資料結構正確
      formData.clientInfo = formData.clientInfo || {
        companyName: '',
        contactPerson: '',
        phone: '',
        address: '',
      }
    } else if (newRole === 'staff' || newRole === 'admin') {
      // 確保員工資料結構正確
      formData.staffInfo = formData.staffInfo || {
        department: '',
        position: '',
      }
    }
  },
)

const validateForm = () => {
  // 必填欄位檢查
  if (!formData.account) {
    error.value = '帳號為必填欄位'
    return false
  }

  // 帳號長度檢查
  if (formData.account.length < 2 || formData.account.length > 20) {
    error.value = '帳號長度必須在 2-20 個字元之間'
    return false
  }

  // Email 格式檢查（如果有填寫的話）
  if (formData.email && !validator.isEmail(formData.email)) {
    error.value = '無效的 email 格式'
    return false
  }

  if (!isEditing.value) {
    if (!formData.password || formData.password.length < 4 || formData.password.length > 20) {
      error.value = '密碼長度必須在 4-20 個字元之間'
      return false
    }
  } else if (formData.password && (formData.password.length < 4 || formData.password.length > 20)) {
    error.value = '密碼長度必須在 4-20 個字元之間'
    return false
  }

  return true
}

const resetForm = () => {
  formData.account = ''
  formData.email = ''
  formData.password = ''
  formData.role = 'client'
  formData.isActive = true
  formData.clientInfo = {
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
  }
  formData.staffInfo = {
    department: '',
    position: '',
  }
  error.value = ''
}

const close = () => {
  emit('update:show', false)
  resetForm()
}

const handleSubmit = async () => {
  error.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    // 組織提交數據
    const userData = {
      account: formData.account,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive,
    }

    if (!isEditing.value) {
      userData.password = formData.password
    }

    // 根據角色添加對應的資訊
    if (formData.role === 'client') {
      userData.clientInfo = formData.clientInfo
    } else if (formData.role === 'staff' || formData.role === 'admin') {
      userData.staffInfo = formData.staffInfo
    }

    let result
    if (props.isEditing) {
      result = await userStore.updateUser(props.editUserData._id, userData)

      if (result?.success && formData.password) {
        const resetResult = await userStore.resetUserPassword(
          props.editUserData._id,
          formData.password,
        )
        if (!resetResult?.success) {
          throw new Error(resetResult?.message || '資料已更新，但密碼變更失敗')
        }
        notify.notifySuccess('用戶資料與密碼已更新')
      } else if (result?.success) {
        notify.notifySuccess(result.message || '更新用戶成功')
      }
    } else {
      result = await userStore.createUser(userData)
    }

    if (result?.success) {
      emit('user-created', result.data || {})
      close()
    } else {
      throw new Error(result?.message || `${props.isEditing ? '更新' : '創建'}用戶失敗`)
    }
  } catch (err) {
    console.error(`${props.isEditing ? '更新' : '創建'}用戶失敗:`, err)
    error.value = err.message || `${props.isEditing ? '更新' : '創建'}用戶失敗`
  } finally {
    loading.value = false
  }
}

const initializeForm = () => {
  if (props.isEditing && props.editUserData) {
    formData.account = props.editUserData.account || ''
    formData.email = props.editUserData.email || ''
    formData.password = ''
    formData.role = props.editUserData.role || 'client'
    formData.isActive = props.editUserData.isActive ?? true
    formData.clientInfo = props.editUserData.clientInfo ? { ...props.editUserData.clientInfo } : {}
    formData.staffInfo = props.editUserData.staffInfo ? { ...props.editUserData.staffInfo } : {}
  } else {
    resetForm()
  }
}

// 監聽 show 變化，初始化表單
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      initializeForm()
    }
  },
)

watch(
  () => props.availableRoles,
  (roles) => {
    if (roles?.length && !roles.includes(formData.role)) {
      formData.role = roles[0]
    }
  },
  { immediate: true },
)
</script>
