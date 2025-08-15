import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore(
  'theme',
  () => {
    // 主題狀態
    const theme = ref(localStorage.getItem('theme') || 'dark') // 預設使用黑暗主題

    // 應用主題到 DOM
    const applyTheme = (newTheme) => {
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
      localStorage.setItem('theme', newTheme)
    }

    // 切換主題
    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    // 初始化主題
    const initTheme = () => {
      applyTheme(theme.value)
    }

    // 監聽主題變化並應用
    watch(theme, (newTheme) => {
      applyTheme(newTheme)
    })

    return {
      theme,
      toggleTheme,
      initTheme,
    }
  },
  {
    persist: {
      key: 'user-theme',
      paths: ['theme'],
    },
  },
)
