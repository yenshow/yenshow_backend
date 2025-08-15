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
                  :class="[
                    inputClass,
                    'w-full px-4 h-[40px] rounded-lg focus:outline-none focus:border-blue-500',
                  ]"
                >
                  <option value="client">客戶</option>
                  <option value="staff">員工</option>
                  <option value="admin">管理員</option>
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
                <label for="password" class="block text-sm font-medium mb-2 theme-text"
                  >密碼 {{ isEditing ? '' : '*' }}</label
                >
                <div class="relative">
                  <input
                    id="password"
                    v-model="formData.password"
                    :required="!isEditing"
                    :type="showPassword ? 'text' : 'password'"
                    :class="[
                      inputClass,
                      'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500',
                    ]"
                    :placeholder="isEditing ? '留空表示不修改密碼' : '請輸入密碼（4-20個字元）'"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    :class="
                      conditionalClass(
                        'text-white/50 hover:text-white/90',
                        'text-slate-400 hover:text-slate-600',
                      )
                    "
                    class="absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1"
                  >
                    <svg
                      v-if="showPassword"
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fill-rule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clip-rule="evenodd"
                      />
                      <path
                        d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
                      />
                    </svg>
                  </button>
                </div>
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
            <label for="isActive" class="theme-text">
              {{ formData.isActive ? '啟用' : '停用' }}
            </label>
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
})

// 使用 toRefs 來解構 props
const { show, defaultRole, isEditing } = toRefs(props)

const emit = defineEmits(['update:show', 'user-created'])
const userStore = useUserStore()

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

// 密碼顯示控制
const showPassword = ref(false)

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

  // 密碼長度檢查（僅在新增模式或編輯模式有輸入密碼時檢查）
  if (
    !isEditing.value &&
    (!formData.password || formData.password.length < 4 || formData.password.length > 20)
  ) {
    error.value = '密碼長度必須在 4-20 個字元之間'
    return false
  }

  // 編輯模式下，如果輸入密碼，則檢查長度
  if (
    isEditing.value &&
    formData.password &&
    (formData.password.length < 4 || formData.password.length > 20)
  ) {
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

    // 只有在新增模式或編輯模式有輸入新密碼時，才加入密碼欄位
    if (!isEditing.value || (isEditing.value && formData.password)) {
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
      // 編輯模式：更新用戶
      result = await userStore.updateUser(props.editUserData._id, userData)
    } else {
      // 新增模式：創建用戶
      result = await userStore.createUser(userData)
    }

    if (result && result.success) {
      console.log(`${props.isEditing ? '更新' : '創建'}用戶成功:`, result.message)
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
</script>
