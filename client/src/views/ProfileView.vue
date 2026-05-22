<template>
  <div class="profile-page container mx-auto px-4 py-10 lg:py-12">
    <header class="mb-8 lg:mb-10 text-center">
      <h1 class="text-3xl lg:text-4xl font-bold mb-3 theme-text">個人設定</h1>
      <p class="text-lg lg:text-xl" :class="mutedTextClass">管理您的信箱與登入密碼</p>
    </header>

    <div
      v-if="isFirstLogin"
      class="mb-6 lg:mb-8 bg-amber-500/15 border border-amber-500/40 px-6 py-4 rounded-xl text-base"
      :class="conditionalClass('text-amber-100', 'text-amber-900 bg-amber-50 border-amber-200')"
    >
      首次登入請先變更密碼。您也可以先填寫電子郵件，以便接收系統通知。
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
      <section :class="[cardClass, 'rounded-2xl p-6 lg:p-8 backdrop-blur-sm flex flex-col']">
        <div class="mb-6">
          <h2 class="text-xl lg:text-2xl font-semibold theme-text">基本資料</h2>
          <p class="mt-2 text-sm lg:text-base" :class="mutedTextClass">
            電子郵件用於授權審核等系統通知
          </p>
        </div>

        <form class="flex flex-col flex-1 gap-5" @submit.prevent="handleUpdateProfile">
          <div>
            <label :class="fieldLabelClass" for="account">帳號</label>
            <input
              id="account"
              :value="account"
              type="text"
              readonly
              :class="[inputClass, fieldInputClass, fieldInputReadonlyClass]"
              aria-readonly="true"
            />
          </div>
          <div>
            <label :class="fieldLabelClass" for="role">身分</label>
            <input
              id="role"
              :value="roleLabel"
              type="text"
              readonly
              :class="[inputClass, fieldInputClass, fieldInputReadonlyClass]"
              aria-readonly="true"
            />
          </div>
          <div>
            <label :class="fieldLabelClass" for="email">電子郵件</label>
            <input
              id="email"
              v-model="profileEmail"
              type="email"
              autocomplete="email"
              :class="[inputClass, fieldInputClass]"
              placeholder="name@example.com（選填）"
            />
          </div>

          <p v-if="profileError" class="error-box">{{ profileError }}</p>

          <button
            type="submit"
            class="mt-auto w-full bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
            :disabled="profileLoading"
          >
            <span
              v-if="profileLoading"
              class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
            />
            {{ profileLoading ? '儲存中...' : '儲存信箱' }}
          </button>
        </form>
      </section>

      <section :class="[cardClass, 'rounded-2xl p-6 lg:p-8 backdrop-blur-sm flex flex-col']">
        <div class="mb-6">
          <h2 class="text-xl lg:text-2xl font-semibold theme-text">修改密碼</h2>
          <p class="mt-2 text-sm lg:text-base" :class="mutedTextClass">
            為了帳戶安全，建議定期更換密碼
          </p>
        </div>

        <form class="flex flex-col flex-1 gap-5" @submit.prevent="handleUpdatePassword">
          <PasswordInput
            id="currentPassword"
            v-model="currentPassword"
            size="profile"
            label="目前密碼"
            placeholder="請輸入目前的密碼"
            required
          />
          <PasswordInput
            id="newPassword"
            v-model="newPassword"
            size="profile"
            label="新密碼"
            placeholder="請輸入新密碼"
            required
          />
          <PasswordInput
            id="confirmPassword"
            v-model="confirmPassword"
            size="profile"
            label="確認新密碼"
            placeholder="請再次輸入新密碼"
            required
          />

          <p v-if="passwordError" class="error-box">{{ passwordError }}</p>

          <button
            type="submit"
            class="mt-auto w-full bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
            :disabled="passwordLoading"
          >
            <span
              v-if="passwordLoading"
              class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
            />
            {{ passwordLoading ? '處理中...' : '更新密碼' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import validator from 'validator'
import { useUserStore } from '@/stores/userStore'
import { getRoleLabel } from '@/constants/userLabels'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import PasswordInput from '@/components/common/PasswordInput.vue'

const PASSWORD_MIN = 4
const PASSWORD_MAX = 20

const fieldLabelClass = 'block text-sm font-medium mb-2 theme-text'
const fieldInputClass =
  'w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:border-blue-500'
const fieldInputReadonlyClass = 'opacity-70 cursor-not-allowed'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, inputClass, conditionalClass } = useThemeClass()
const { account, email, role, isFirstLogin } = storeToRefs(userStore)

const mutedTextClass = computed(() => conditionalClass('text-gray-400', 'text-slate-500'))

const profileEmail = ref('')
const profileError = ref('')
const profileLoading = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordLoading = ref(false)

const roleLabel = computed(() => getRoleLabel(role.value))

const syncProfileEmail = () => {
  profileEmail.value = email.value || ''
}

onMounted(async () => {
  try {
    await userStore.profile()
  } finally {
    syncProfileEmail()
  }
})

const handleUpdateProfile = async () => {
  profileError.value = ''
  const trimmed = profileEmail.value.trim()

  if (trimmed && !validator.isEmail(trimmed)) {
    profileError.value = '信箱格式錯誤'
    return
  }

  profileLoading.value = true
  try {
    const result = await userStore.updateProfile({ email: trimmed })
    if (result?.success) {
      syncProfileEmail()
      notify.notifySuccess(result.message || '個人資料已更新')
      return
    }
    profileError.value = result?.message || '更新失敗'
  } catch (err) {
    profileError.value = err.message || '更新失敗，請稍後再試'
    notify.notifyError(profileError.value)
  } finally {
    profileLoading.value = false
  }
}

const handleUpdatePassword = async () => {
  passwordError.value = ''

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '新密碼與確認密碼不符'
    return
  }

  if (newPassword.value.length < PASSWORD_MIN || newPassword.value.length > PASSWORD_MAX) {
    passwordError.value = '密碼長度必須在 4-20 個字符之間'
    return
  }

  if (currentPassword.value === newPassword.value) {
    passwordError.value = '新密碼不能與目前密碼相同'
    return
  }

  passwordLoading.value = true
  try {
    const result = await userStore.changePassword(currentPassword.value, newPassword.value)
    if (!result?.success) {
      passwordError.value = result?.message || '密碼修改失敗'
      return
    }

    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    notify.notifySuccess(result.message)

    setTimeout(async () => {
      await userStore.logout()
      window.location.href = '/login'
    }, 1500)
  } catch (err) {
    passwordError.value = err.message || '密碼修改失敗，請稍後再試'
    notify.notifyError(passwordError.value)
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 1120px;
  min-height: calc(100vh - 80px);
}

.error-box {
  background-color: rgb(239 68 68 / 0.2);
  border: 1px solid rgb(239 68 68);
  color: rgb(254 226 226);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

[data-theme='dark'] input:-webkit-autofill,
[data-theme='dark'] input:-webkit-autofill:hover,
[data-theme='dark'] input:-webkit-autofill:focus {
  -webkit-text-fill-color: white;
  -webkit-box-shadow: 0 0 0px 1000px rgba(255, 255, 255, 0.1) inset;
  transition: background-color 5000s ease-in-out 0s;
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: inherit;
  -webkit-box-shadow: 0 0 0px 1000px rgba(0, 0, 0, 0.05) inset;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
