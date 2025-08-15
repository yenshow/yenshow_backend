<template>
  <section class="w-full flex justify-center items-center min-h-screen">
    <div class="login-box">
      <div class="title-container">
        <h2
          class="title-text text-[24px] lg:text-[36px] font-semibold text-center mb-[12px] lg:mb-[24px]"
        >
          後台管理系統
        </h2>
        <div class="title-decoration"></div>
      </div>
      <form @submit.prevent="handleLogin" class="flex flex-col gap-[24px]">
        <!-- 帳號 -->
        <div>
          <label for="account" class="text-white">帳號</label>
          <div class="relative">
            <input
              type="text"
              id="account"
              v-model="account"
              required
              placeholder="請輸入帳號"
              class="bg-white/10 text-white placeholder-white/50 w-full"
            />
          </div>
        </div>
        <!-- 密碼 -->
        <div>
          <label for="password" class="text-white">密碼</label>
          <div class="relative">
            <input
              type="password"
              id="password"
              v-model="password"
              required
              placeholder="請輸入密碼"
              class="bg-white/10 text-white placeholder-white/50 w-full"
            />
          </div>
        </div>
        <!-- 錯誤訊息 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- 登入按鈕 -->
        <button
          type="submit"
          :disabled="loading"
          class="bg-white text-[#212a37] hover:bg-white/90 flex items-center justify-center"
        >
          <span v-if="loading" class="mr-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useNotifications } from '@/composables/notificationCenter'

const userStore = useUserStore()
const notify = useNotifications()

// 表單狀態
const account = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// 登入處理
const handleLogin = async () => {
  if (!account.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    notify.notifyError('請輸入帳號和密碼')
    return
  }

  loading.value = true
  error.value = ''

  try {
    console.log('正在嘗試登入...')
    const message = await userStore.login({
      account: account.value,
      password: password.value,
    })

    console.log('登入回應訊息:', message)

    if (message === '登入成功' || message.includes('成功')) {
      console.log('登入成功，即將跳轉...')

      notify.notifySuccess('登入成功')

      // 短暫延遲以展示成功訊息
      setTimeout(() => {
        // 使用 window.location.href 進行頁面重新整理並導向首頁
        window.location.href = '/'
      }, 1000)
    } else {
      error.value = message
      console.error('登入未成功，原因:', message)

      notify.notifyError(message)
    }
  } catch (err) {
    console.error('登入過程拋出錯誤:', err)
    error.value = err || '登入失敗，請稍後再試'

    notify.notifyError(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-box {
  background: rgba(33, 42, 55, 0.7);
  padding: 48px;
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: fit-content;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.title-container {
  position: relative;
  text-align: center;
  margin-bottom: 48px;
  padding: 24px 0;
}

.title-text {
  font-size: 48px;
  font-weight: bold;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-decoration {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 4px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  border-radius: 2px;
}

input {
  width: 360px;
  padding: 12px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background-color: rgba(255, 255, 255, 0.15);
}

button {
  width: 360px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

button:disabled {
  background-color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.error-message {
  color: #ff6b6b;
  text-align: center;
  font-size: 16px;
}

label {
  display: block;
  font-size: 24px;
  margin-bottom: 12px;
  opacity: 0.9;
}
</style>
