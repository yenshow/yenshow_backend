<template>
  <div>
    <!-- 簡化的搜尋彈窗 - 只顯示搜尋輸入框 -->
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 backdrop-blur-[2px] transition-all duration-300"
      @click="closeSearch"
    ></div>

    <!-- 搜尋輸入框 -->
    <div
      v-if="isVisible"
      class="fixed top-[80px] lg:top-[120px] left-1/2 transform -translate-x-1/2 w-[90%] max-w-[600px] rounded-xl shadow-xl z-50 transition-all duration-300"
      :class="
        conditionalClass('bg-[#1e293b] border border-white/10', 'bg-white border border-slate-200')
      "
    >
      <div class="p-[16px]">
        <div class="relative">
          <input
            id="global-search-input"
            v-model="keyword"
            @input="debouncedSearch(keyword)"
            @keydown.esc="closeSearch"
            @keydown.enter="debouncedSearch(keyword)"
            class="w-full rounded-lg px-[48px] py-[12px] outline-none focus:ring-2 focus:ring-blue-500"
            :class="conditionalClass('bg-gray-800 text-white', 'bg-slate-100 text-slate-700')"
            :placeholder="'搜尋產品、系列、分類...'"
          />
          <svg
            class="absolute left-[16px] top-1/2 transform -translate-y-1/2 w-[20px] h-[20px]"
            :class="conditionalClass('text-gray-400', 'text-slate-400')"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
          <button
            v-if="keyword"
            @click="clearSearch"
            class="absolute right-[16px] top-1/2 transform -translate-y-1/2"
            :class="
              conditionalClass(
                'text-gray-400 hover:text-white',
                'text-slate-400 hover:text-slate-700',
              )
            "
          >
            <svg class="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <!-- 搜尋提示 -->
        <div
          v-if="keyword && isLoading"
          class="mt-2 text-sm text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-500')"
        >
          搜尋中...
        </div>
        <div
          v-else-if="keyword && !isLoading"
          class="mt-2 text-sm text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-500')"
        >
          按 Enter 或等待自動跳轉到搜尋結果頁面
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useThemeClass } from '@/composables/useThemeClass'

const { isVisible, isLoading, keyword, closeSearch, debouncedSearch, clearSearch } =
  useGlobalSearch()

const { conditionalClass } = useThemeClass()
</script>
