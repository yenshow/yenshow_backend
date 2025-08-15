import { computed } from 'vue'
import { useThemeStore } from '@/stores/core/theme'
import { storeToRefs } from 'pinia'

export function useThemeClass() {
  const themeStore = useThemeStore()
  const { theme } = storeToRefs(themeStore)
  const isDarkTheme = computed(() => theme.value === 'dark')

  // 基礎卡片樣式
  const cardClass = computed(() => {
    return isDarkTheme.value
      ? 'bg-[#334155] border border-white/10 text-white shadow-lg'
      : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
  })

  // 背景樣式
  const bgClass = computed(() => {
    return isDarkTheme.value ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-700'
  })

  // 表單輸入框樣式
  const inputClass = computed(() => {
    return isDarkTheme.value
      ? 'bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-blue-500'
      : 'bg-white border border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-500'
  })

  // 主按鈕樣式
  const primaryButtonClass = computed(() => {
    return 'bg-blue-500 hover:bg-blue-600 text-white'
  })

  // 次要按鈕樣式
  const secondaryButtonClass = computed(() => {
    return isDarkTheme.value
      ? 'bg-gray-700 hover:bg-gray-600 text-white'
      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
  })

  // 錯誤按鈕樣式
  const dangerButtonClass = computed(() => {
    return 'bg-red-500 hover:bg-red-600 text-white'
  })

  // 提供條件類（接受兩種配置）
  const conditionalClass = (darkClass, lightClass) => {
    return isDarkTheme.value ? darkClass : lightClass
  }

  return {
    isDarkTheme,
    cardClass,
    bgClass,
    inputClass,
    primaryButtonClass,
    secondaryButtonClass,
    dangerButtonClass,
    conditionalClass,
  }
}
