<template>
  <div class="container mx-auto py-12">
    <div class="mb-10 text-center">
      <h1 class="text-4xl font-bold mb-4 theme-text">修改密碼</h1>
      <p class="text-xl" :class="conditionalClass('text-gray-400', 'text-slate-500')">
        為了帳戶安全，建議定期更換密碼
      </p>
    </div>

    <!-- 主要表單區塊 -->
    <div :class="[cardClass, 'max-w-xl mx-auto rounded-2xl p-10 backdrop-blur-sm']">
      <form @submit.prevent="updatePassword" class="space-y-8">
        <!-- 目前密碼 -->
        <div>
          <label class="block theme-text text-lg mb-3" for="currentPassword">目前密碼</label>
          <div class="relative">
            <input
              id="currentPassword"
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              :class="[inputClass, 'w-full px-5 py-4 rounded-xl text-lg pr-14']"
              placeholder="請輸入目前的密碼"
              required
            />
            <button
              type="button"
              @click="showCurrentPassword = !showCurrentPassword"
              :class="
                conditionalClass(
                  'text-white/50 hover:text-white/90',
                  'text-slate-400 hover:text-slate-600',
                )
              "
              class="absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1"
            >
              <svg
                v-if="showCurrentPassword"
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
                class="h-6 w-6"
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

        <!-- 新密碼 -->
        <div>
          <label class="block theme-text text-lg mb-3" for="newPassword">新密碼</label>
          <div class="relative">
            <input
              id="newPassword"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              :class="[inputClass, 'w-full px-5 py-4 rounded-xl text-lg pr-14']"
              placeholder="請輸入新密碼"
              required
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              :class="
                conditionalClass(
                  'text-white/50 hover:text-white/90',
                  'text-slate-400 hover:text-slate-600',
                )
              "
              class="absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1"
            >
              <svg
                v-if="showNewPassword"
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
                class="h-6 w-6"
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
          <p class="mt-2 text-base" :class="conditionalClass('text-gray-400', 'text-slate-500')">
            密碼長度必須在 4-20 個字符之間
          </p>
        </div>

        <!-- 確認新密碼 -->
        <div>
          <label class="block theme-text text-lg mb-3" for="confirmPassword">確認新密碼</label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :class="[inputClass, 'w-full px-5 py-4 rounded-xl text-lg pr-14']"
              placeholder="請再次輸入新密碼"
              required
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              :class="
                conditionalClass(
                  'text-white/50 hover:text-white/90',
                  'text-slate-400 hover:text-slate-600',
                )
              "
              class="absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1"
            >
              <svg
                v-if="showConfirmPassword"
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
                class="h-6 w-6"
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

        <!-- 錯誤訊息 -->
        <div
          v-if="errorMessage"
          class="bg-red-500/20 border border-red-500 text-red-100 px-6 py-4 rounded-xl text-lg"
        >
          {{ errorMessage }}
        </div>

        <!-- 提交按鈕 -->
        <button
          type="submit"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-semibold py-4 px-8 rounded-xl transition duration-200 flex items-center justify-center gap-3 mt-8"
          :disabled="loading"
        >
          <span
            v-if="loading"
            class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"
          ></span>
          {{ loading ? '處理中...' : '更新密碼' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'

const userStore = useUserStore()
const notify = useNotifications()
const { cardClass, inputClass, conditionalClass } = useThemeClass()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)

// 密碼顯示控制
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const validatePassword = (password) => {
  const minLength = 6

  if (password.length < minLength) {
    return { valid: false, message: '密碼長度不足' }
  }

  return { valid: true }
}

const updatePassword = async () => {
  const validation = validatePassword(newPassword.value)
  if (!validation.valid) {
    errorMessage.value = validation.message
    return
  }
  // 重置錯誤訊息
  errorMessage.value = ''

  // 表單驗證
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '新密碼與確認密碼不符'
    return
  }

  if (newPassword.value.length < 4 || newPassword.value.length > 20) {
    errorMessage.value = '密碼長度必須在 4-20 個字符之間'
    return
  }

  if (currentPassword.value === newPassword.value) {
    errorMessage.value = '新密碼不能與目前密碼相同'
    return
  }

  loading.value = true
  console.log('正在提交密碼變更請求...')

  try {
    const result = await userStore.changePassword(currentPassword.value, newPassword.value)

    if (result.success) {
      // 清空表單
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      notify.notifySuccess(result.message)

      // 延遲登出，讓用戶有時間看到成功訊息
      setTimeout(async () => {
        console.log('密碼更新成功，正在登出...')
        await userStore.logout()
        window.location.href = '/login'
      }, 1500)
    } else {
      errorMessage.value = result.message || '密碼修改失敗'
      console.error('密碼變更失敗:', result.message)
    }
  } catch (error) {
    console.error('修改密碼過程中發生錯誤:', error)
    errorMessage.value = error.message || '密碼修改失敗，請稍後再試'
    notify.notifyError(errorMessage.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  min-height: calc(100vh - 80px); /* 假設 header 高度為 80px */
}

/* 深色主題的自動填充樣式 */
[data-theme='dark'] input:-webkit-autofill,
[data-theme='dark'] input:-webkit-autofill:hover,
[data-theme='dark'] input:-webkit-autofill:focus {
  -webkit-text-fill-color: white;
  -webkit-box-shadow: 0 0 0px 1000px rgba(255, 255, 255, 0.1) inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* 淺色主題的自動填充樣式 */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: inherit;
  -webkit-box-shadow: 0 0 0px 1000px rgba(0, 0, 0, 0.05) inset;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
