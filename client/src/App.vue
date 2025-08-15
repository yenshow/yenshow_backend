<template>
  <header
    v-if="isLogin"
    class="sticky top-0 z-50 border-b transition-all duration-200"
    :class="
      isDarkTheme
        ? 'bg-[#1e293b]/80 backdrop-blur-lg border-white/10 text-white'
        : 'bg-white/80 backdrop-blur-lg border-slate-200 text-slate-700 shadow-sm'
    "
  >
    <div class="container mx-auto flex justify-between items-center py-[12px] lg:py-[24px]">
      <!-- Logo 區域 -->
      <div class="flex items-center gap-[12px] lg:gap-[24px]">
        <img class="w-[32px] lg:w-[48px] aspect-square" alt="遠岫科技" src="/yenshow-icon.svg" />
        <h2 class="text-[28px] lg:text-[36px]">遠岫科技</h2>
      </div>

      <!-- 導航連結 -->
      <nav class="flex items-center gap-[24px] lg:gap-[48px]">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-[12px] px-[12px] py-[6px] text-[16px] lg:text-[24px] rounded-[10px] transition-all duration-200"
          :class="[
            isActiveRoute(link.name)
              ? isDarkTheme
                ? 'bg-white/10 text-white'
                : 'bg-slate-100 text-slate-700'
              : isDarkTheme
                ? 'text-gray-300 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50',
          ]"
        >
          <!-- 首頁圖標 -->
          <svg
            v-if="link.name === 'home'"
            class="w-[36px] lg:w-[48px] aspect-square"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>

          <!-- 專欄圖標 -->
          <svg
            v-else-if="link.name === 'contentManagement'"
            class="w-[36px] lg:w-[48px] aspect-square"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>

          <!-- 用戶管理圖標 -->
          <svg
            v-else-if="link.name === 'admin'"
            class="w-[36px] lg:w-[48px] aspect-square"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>

          <span>{{ link.text }}</span>
        </router-link>
      </nav>

      <!-- 工具區域 -->
      <div class="flex items-center gap-[12px] lg:gap-[24px]">
        <!-- 搜尋按鈕 -->
        <button
          @click="toggleSearch"
          :class="[
            'p-2 rounded-full transition-colors',
            conditionalClass('hover:bg-slate-700', 'hover:bg-slate-100'),
          ]"
        >
          <svg
            class="w-[24px] lg:w-[30px] aspect-square"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        <!-- 用戶選單 -->
        <div class="relative" v-click-outside="closeUserMenu">
          <button
            @click="toggleUserMenu"
            :class="[
              'flex items-center gap-[6px] lg:gap-[12px] p-[6px] lg:p-[12px] rounded-lg transition-colors cursor-pointer',
              conditionalClass('hover:bg-slate-700', 'hover:bg-slate-100'),
            ]"
          >
            <svg
              class="w-[24px] lg:w-[30px] aspect-square"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span class="text-[16px] lg:text-[24px]">{{ account }}</span>
          </button>

          <!-- 下拉選單 -->
          <div
            v-if="showUserMenu"
            class="absolute right-0 flex flex-col justify-center items-center rounded-[10px] shadow-lg p-[12px] z-50"
            :class="
              conditionalClass(
                'bg-[#334155] text-white border border-white/10',
                'bg-white text-slate-700 border border-slate-200',
              )
            "
          >
            <div
              class="px-[12px] py-[6px] border-b text-[16px] w-full"
              :class="
                conditionalClass('border-gray-700 text-gray-300', 'border-slate-100 text-slate-500')
              "
            >
              {{ isAdmin ? '管理員' : '員工' }}
            </div>

            <router-link
              to="/change-password"
              class="block px-[12px] py-[6px] text-[16px] transition-colors w-full text-left"
              :class="conditionalClass('hover:bg-gray-700', 'hover:bg-slate-100')"
              @click="closeUserMenu"
            >
              修改密碼
            </router-link>

            <button
              @click="handleLogout"
              class="w-full text-left px-[12px] py-[6px] text-[16px] text-red-600 transition-colors"
              :class="conditionalClass('hover:bg-red-900/30', 'hover:bg-red-50')"
            >
              登出
            </button>
          </div>
        </div>

        <!-- 主題切換按鈕 -->
        <button
          @click="toggleTheme"
          class="relative flex items-center justify-center w-[36px] lg:w-[48px] h-[36px] lg:h-[48px] rounded-full overflow-hidden transition-all duration-300"
          :class="conditionalClass('bg-indigo-600/20', 'bg-blue-500/20')"
        >
          <div
            class="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
            :class="{ 'opacity-0': !isDarkTheme, 'opacity-100': isDarkTheme }"
          >
            <svg
              class="w-[20px] lg:w-[24px] text-yellow-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
              />
            </svg>
          </div>

          <div
            class="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
            :class="{ 'opacity-0': isDarkTheme, 'opacity-100': !isDarkTheme }"
          >
            <svg
              class="w-[20px] lg:w-[24px] text-indigo-700"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  </header>

  <!-- 主要內容區域 -->
  <main>
    <RouterView />
  </main>

  <!-- 全局搜尋組件 -->
  <GlobalSearch />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useThemeStore } from '@/stores/core/theme'
import { storeToRefs } from 'pinia'
import { useNotifications } from '@/composables/notificationCenter'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useThemeClass } from '@/composables/useThemeClass'
import GlobalSearch from '@/components/common/GlobalSearch.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const notify = useNotifications()
const { toggleSearch } = useGlobalSearch()
const { conditionalClass } = useThemeClass()

// 使用 storeToRefs 獲取響應式的用戶狀態
const { isLogin, isAdmin, isStaff, account } = storeToRefs(userStore)

// 主題相關
const { theme } = storeToRefs(themeStore)
const isDarkTheme = computed(() => theme.value === 'dark')
const toggleTheme = themeStore.toggleTheme

// 導航連結配置 - 使用 computed 讓它能夠更靈活地根據狀態變化
const navLinks = computed(() => {
  const links = [
    { to: '/', name: 'home', text: '產品' },
    { to: '/contentManagement', name: 'contentManagement', text: '專欄' },
  ]
  if (isAdmin.value || isStaff.value) {
    links.push({ to: '/admin', name: 'admin', text: '用戶' })
  }
  return links
})

// 控制狀態
const showUserMenu = ref(false)

// 切換控制
const toggleUserMenu = () => (showUserMenu.value = !showUserMenu.value)
const closeUserMenu = () => (showUserMenu.value = false)

// 檢查當前路由
const isActiveRoute = (name) => {
  // 特別處理 home 路由 (現在是 series)
  if (name === 'home') {
    return ['home', 'series-category'].includes(route.name)
  }
  return route.name === name
}

// 登出處理
const handleLogout = async () => {
  try {
    await userStore.logout()
    closeUserMenu()
    router.push('/login')
  } catch (error) {
    console.error('登出時發生錯誤：', error)
    notify.notifyError('登出失敗，請稍後再試')
  }
}

// 定期檢查用戶狀態
const checkUserStatus = async () => {
  try {
    await userStore.profile()
  } catch (error) {
    // 只要檢查狀態失敗，就視為登入無效
    console.error('檢查使用者狀態時發生錯誤，將引導至登入頁面:', error)
    notify.notifyError('連線階段已過期或無效，請重新登入。')
    await userStore.logout()
    // 使用 window.location.href 確保頁面完全刷新，清除所有舊狀態
    window.location.href = '/login'
  }
}

onMounted(() => {
  // 初始化主題
  themeStore.initTheme()

  if (isLogin.value) {
    checkUserStatus()
    // 每 5 分鐘檢查一次
    const statusCheck = setInterval(checkUserStatus, 300000)
    onUnmounted(() => clearInterval(statusCheck))
  }
})
</script>
