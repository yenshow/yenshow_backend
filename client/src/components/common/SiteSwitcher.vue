<template>
  <div class="site-switcher">
    <div class="flex items-center space-x-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">網站:</span>
      <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          v-for="site in availableSites"
          :key="site.key"
          @click="switchSite(site.key)"
          :class="getButtonClass(site.key)"
          class="px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200"
        >
          <div class="flex items-center space-x-2">
            <div :class="getColorClass(site.color)" class="w-2 h-2 rounded-full"></div>
            <span>{{ site.name }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSiteStore } from '@/stores/core/siteStore'
import { useThemeClass } from '@/composables/useThemeClass'

const router = useRouter()
const siteStore = useSiteStore()
const { conditionalClass } = useThemeClass()

const { availableSites, currentSite } = storeToRefs(siteStore)

const switchSite = (siteKey) => {
  siteStore.setSite(siteKey)

  // 根據網站切換到對應的首頁
  if (siteKey === 'yenshow') {
    router.push('/')
  } else if (siteKey === 'comeo') {
    router.push('/comeo')
  }

  // 重新載入頁面以切換 API 端點
  window.location.reload()
}

const getButtonClass = (siteKey) => {
  const isActive = currentSite.value === siteKey
  let baseClasses = ['focus:outline-none', 'transition-all', 'duration-200']

  if (isActive) {
    baseClasses.push(
      ...conditionalClass('bg-white text-gray-900 shadow-sm', 'bg-gray-600 text-white').split(' '),
    )
  } else {
    baseClasses.push(
      ...conditionalClass(
        'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        'text-gray-400 hover:text-gray-200 hover:bg-gray-600',
      ).split(' '),
    )
  }

  return baseClasses.join(' ')
}

const getColorClass = (color) => {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }
  return colorMap[color] || 'bg-gray-500'
}
</script>

<style scoped>
.site-switcher {
  @apply flex items-center;
}
</style>
