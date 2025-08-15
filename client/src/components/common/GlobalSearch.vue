<template>
  <div>
    <!-- 搜尋彈窗遮罩 -->
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 backdrop-blur-[2px] transition-all duration-300"
      @click="closeSearch"
    ></div>

    <!-- 搜尋彈窗 -->
    <div
      v-if="isVisible"
      class="fixed top-[80px] lg:top-[120px] left-1/2 transform -translate-x-1/2 w-[90%] max-w-[800px] rounded-xl shadow-xl z-50 transition-all duration-300 max-h-[80vh] overflow-hidden flex flex-col"
      :class="
        conditionalClass('bg-[#1e293b] border border-white/10', 'bg-white border border-slate-200')
      "
    >
      <!-- 搜尋輸入區域 -->
      <div
        class="p-[16px]"
        :class="conditionalClass('border-b border-gray-700', 'border-b border-slate-200')"
      >
        <div class="relative">
          <input
            id="global-search-input"
            v-model="keyword"
            @input="debouncedSearch(keyword)"
            class="w-full rounded-lg px-[48px] py-[12px] outline-none focus:ring-2 focus:ring-blue-500"
            :class="conditionalClass('bg-gray-800 text-white', 'bg-slate-100 text-slate-700')"
            :placeholder="'搜尋產品、系列、分類...'"
            @keydown.esc="closeSearch"
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
            class="absolute right-[16px] top-1/2 transform -translate-y-1/2 hover:text-white"
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
      </div>

      <!-- 內容區域 -->
      <div class="flex-1 overflow-y-auto">
        <!-- 加載中 -->
        <div
          v-if="isLoading"
          class="p-[24px] text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-400')"
        >
          <div
            class="animate-spin inline-block w-[32px] h-[32px] border-4 rounded-full"
            :class="
              conditionalClass(
                'border-gray-300 border-t-blue-500',
                'border-slate-200 border-t-blue-500',
              )
            "
          ></div>
          <p class="mt-[12px]">搜尋中...</p>
        </div>

        <!-- 最近搜尋 -->
        <div v-else-if="!keyword && recentSearches.length > 0" class="p-[16px]">
          <div class="flex justify-between items-center mb-[12px]">
            <h3 class="text-[16px]" :class="conditionalClass('text-gray-400', 'text-slate-500')">
              最近搜尋
            </h3>
            <button
              @click="clearRecentSearches"
              class="text-[14px] text-blue-400 hover:text-blue-300"
            >
              清除
            </button>
          </div>
          <div class="flex flex-wrap gap-[8px]">
            <button
              v-for="(item, index) in recentSearches"
              :key="index"
              @click="search(item)"
              class="px-[12px] py-[6px] rounded-full text-[14px]"
              :class="
                conditionalClass('bg-gray-800 hover:bg-gray-700', 'bg-slate-100 hover:bg-slate-200')
              "
            >
              {{ item }}
            </button>
          </div>
        </div>

        <!-- 無結果 -->
        <div
          v-else-if="keyword && !isLoading && !hasResults"
          class="p-[24px] text-center"
          :class="conditionalClass('text-gray-400', 'text-slate-500')"
        >
          <p>找不到與「{{ keyword }}」相關的結果</p>
        </div>

        <!-- 搜尋結果 -->
        <div v-else-if="keyword && hasResults" class="flex flex-col">
          <!-- 分類標籤 -->
          <div
            class="flex overflow-x-auto whitespace-nowrap px-[16px] py-[8px] gap-[12px]"
            :class="conditionalClass('bg-gray-800', 'bg-slate-100')"
          >
            <button
              class="px-[12px] py-[6px] rounded-full transition-colors"
              :class="
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : conditionalClass('hover:bg-gray-700', 'hover:bg-slate-200')
              "
              @click="setActiveTab('all')"
            >
              全部 ({{ resultCounts.total }})
            </button>
            <button
              v-for="(count, type) in resultCounts"
              :key="type"
              v-show="type !== 'total' && count > 0"
              class="px-[12px] py-[6px] rounded-full transition-colors"
              :class="
                activeTab === type
                  ? 'bg-blue-600 text-white'
                  : conditionalClass('hover:bg-gray-700', 'hover:bg-slate-200')
              "
              @click="setActiveTab(type)"
            >
              {{ entityTypeNames[type] }} ({{ count }})
            </button>
          </div>

          <!-- 結果列表 -->
          <div class="p-[16px]">
            <template v-if="activeTab === 'all'">
              <!-- 所有結果 -->
              <div v-for="(items, type) in currentTabResults" :key="type" v-show="items.length > 0">
                <h3
                  class="text-[16px] mb-[8px]"
                  :class="conditionalClass('text-gray-400', 'text-slate-500')"
                >
                  {{ entityTypeNames[type] }}
                </h3>
                <div class="mb-[16px]">
                  <button
                    v-for="item in items.slice(0, 3)"
                    :key="item._id"
                    @click="navigateToResult(type, item)"
                    class="block w-full text-left px-[12px] py-[8px] rounded-lg transition-colors mb-[4px]"
                    :class="conditionalClass('hover:bg-gray-800', 'hover:bg-slate-100')"
                  >
                    <div class="text-[16px]">{{ getEntityName(item) }}</div>
                    <div
                      class="text-[14px]"
                      :class="conditionalClass('text-gray-400', 'text-slate-500')"
                    >
                      {{ item.code }}
                    </div>
                  </button>
                  <button
                    v-if="items.length > 3"
                    @click="setActiveTab(type)"
                    class="text-[14px] text-blue-400 hover:text-blue-300 mt-[4px]"
                  >
                    查看更多 {{ entityTypeNames[type] }} ({{ items.length }})
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- 特定分類結果 -->
              <div v-for="(items, type) in currentTabResults" :key="type" v-show="items.length > 0">
                <div class="mb-[16px]">
                  <button
                    v-for="item in items"
                    :key="item._id"
                    @click="navigateToResult(type, item)"
                    class="block w-full text-left px-[12px] py-[8px] rounded-lg transition-colors mb-[4px]"
                    :class="conditionalClass('hover:bg-gray-800', 'hover:bg-slate-100')"
                  >
                    <div class="text-[16px]">{{ getEntityName(item) }}</div>
                    <div
                      class="text-[14px]"
                      :class="conditionalClass('text-gray-400', 'text-slate-500')"
                    >
                      {{ item.code }}
                    </div>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 底部操作區 -->
      <div
        class="p-[16px]"
        :class="conditionalClass('border-t border-gray-700', 'border-t border-slate-200')"
      >
        <div class="flex justify-end">
          <button
            @click="closeSearch"
            class="px-[16px] py-[8px] rounded-lg"
            :class="
              conditionalClass(
                'bg-gray-800 text-white hover:bg-gray-700',
                'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )
            "
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useThemeClass } from '@/composables/useThemeClass'

const {
  isVisible,
  isLoading,
  keyword,
  activeTab,
  resultCounts,
  hasResults,
  currentTabResults,
  recentSearches,
  closeSearch,
  setActiveTab,
  debouncedSearch,
  navigateToResult,
  clearSearch,
  getEntityName,
  entityTypeNames,
  clearRecentSearches,
  search,
} = useGlobalSearch()

const { conditionalClass } = useThemeClass()
</script>
