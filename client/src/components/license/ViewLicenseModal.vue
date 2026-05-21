<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      role="dialog"
      aria-modal="true"
      aria-label="檢視授權"
      :class="[
        cardClass,
        'w-full max-w-2xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
      ]"
      @click.stop
    >
      <button
        type="button"
        @click="handleClose"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="關閉"
        aria-label="關閉"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        檢視授權
      </h2>
      <div v-if="src" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block theme-text mb-2">客戶名稱</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 theme-text"
              :class="readonlyBoxClass"
            >
              {{ src.customerName || '—' }}
            </div>
          </div>

          <div>
            <label class="block theme-text mb-2">訂單編號</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 theme-text font-mono"
              :class="readonlyBoxClass"
            >
              {{ src.orderNumber || '—' }}
            </div>
          </div>

          <div>
            <label class="block theme-text mb-2">Serial Number</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 font-mono theme-text"
              :class="readonlyBoxClass"
            >
              {{ src.serialNumber || '—' }}
            </div>
          </div>

          <div>
            <label class="block theme-text mb-2">License Key</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 font-mono theme-text break-all"
              :class="readonlyBoxClass"
            >
              {{ src.licenseKey || '—' }}
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block theme-text mb-2">狀態</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 theme-text"
              :class="readonlyBoxClass"
            >
              {{ getLicenseStatusText(src.status) }}
            </div>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">方案選擇</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              class="px-3 py-2 rounded-lg border text-center theme-text"
              :class="
                (src.deploymentProfile || 'central') === 'construction'
                  ? conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')
                  : conditionalClass('border-sky-500/50 bg-sky-500/10', 'border-sky-300 bg-sky-50')
              "
            >
              YSOP 中央管理平台
            </div>
            <div
              class="px-3 py-2 rounded-lg border text-center theme-text"
              :class="
                src.deploymentProfile === 'construction'
                  ? conditionalClass(
                      'border-emerald-500/50 bg-emerald-500/10',
                      'border-emerald-300 bg-emerald-50',
                    )
                  : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')
              "
            >
              YSOS 工地管理平台
            </div>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">授權功能模組</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border transition"
              :class="
                conditionalClass(
                  'border-indigo-500 bg-indigo-500/10',
                  'border-indigo-300 bg-indigo-50',
                )
              "
            >
              <input
                type="checkbox"
                class="accent-indigo-500"
                :checked="true"
                disabled
                tabindex="-1"
                aria-label="已授權功能模組"
              />
              <span class="theme-text">{{ getFeatureLabel(feat) }}</span>
            </div>
            <div
              v-if="orderedDisplayFeatures.length === 0"
              class="opacity-50 theme-text col-span-full"
            >
              —
            </div>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">配額</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="flex items-center justify-between gap-3 px-6 py-2 rounded-lg border"
              :class="readonlyBoxClass"
            >
              <div class="theme-text text-sm">{{ getFeatureLabel(feat) }}</div>
              <div
                class="w-28 px-3 py-1.5 rounded-lg border text-center font-mono"
                :class="
                  conditionalClass(
                    'bg-[#1f2732] border-gray-600 theme-text',
                    'bg-white border-slate-300',
                  )
                "
              >
                {{
                  (displayQuotas?.[feat]?.maxDevices ?? null) === null
                    ? '不限'
                    : displayQuotas?.[feat]?.maxDevices
                }}
              </div>
            </div>
            <div
              v-if="orderedDisplayFeatures.length === 0"
              class="theme-text text-sm opacity-50 col-span-full"
            >
              —
            </div>
          </div>
        </div>

        <div v-if="src.imageUrl">
          <label class="block theme-text mb-2">已簽核報價單</label>
          <a
            v-if="attachmentMeta.isPdf"
            :href="src.imageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-3 rounded-lg border transition outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-blue-500 hover:opacity-95 theme-text"
            :class="readonlyBoxClass"
            :title="`在新分頁開啟 PDF：${attachmentMeta.name}`"
            :aria-label="`在新分頁開啟 PDF：${attachmentMeta.name}`"
          >
            <svg
              class="h-8 w-8 shrink-0 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h5v2H8v-2z"
              />
            </svg>
            <span class="text-sm break-all underline-offset-2 hover:underline">
              {{ attachmentMeta.name }}
            </span>
            <span class="text-xs opacity-70 shrink-0">（新分頁開啟）</span>
          </a>
          <a
            v-else
            :href="src.imageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="block max-w-md rounded-lg border overflow-hidden outline-none transition ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-blue-500 hover:opacity-95"
            :class="readonlyBoxClass"
            title="點擊在新分頁開啟原圖"
            aria-label="在新分頁開啟授權附圖完整大小"
          >
            <img
              :src="src.imageUrl"
              alt="授權申請附圖"
              class="w-full h-auto max-h-64 object-contain bg-black/5 dark:bg-white/5 cursor-pointer"
            />
          </a>
        </div>

        <div>
          <label class="block theme-text mb-2">備註</label>
          <div
            class="w-full min-h-[4.5rem] px-4 py-2 rounded-lg border whitespace-pre-wrap theme-text"
            :class="readonlyBoxClass"
          >
            {{ src.notes?.trim() ? src.notes : '—' }}
          </div>
        </div>
      </div>

      <div class="mt-6">
        <button
          type="button"
          @click="handleClose"
          class="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
        >
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getLicenseAttachmentUrlMeta } from '@/utils/licenseAttachment.js'
import { getLicenseStatusText } from '@/utils/licenseLabels.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  cardClass: { type: String, required: true },
  conditionalClass: { type: Function, required: true },
  license: { type: Object, default: null },
  baFeatures: { type: Array, default: () => [] },
  getFeatureLabel: { type: Function, required: true },
})

const emit = defineEmits(['close'])

const src = computed(() => (props.open ? props.license : null))

const attachmentMeta = computed(() => getLicenseAttachmentUrlMeta(src.value?.imageUrl))

const readonlyBoxClass = computed(() =>
  props.conditionalClass('bg-[#2A3441] border-gray-600', 'bg-white border-slate-300'),
)

const featureOrderIndex = computed(() => {
  const map = new Map()
  for (const [idx, feat] of (props.baFeatures || []).entries()) {
    if (!feat?.value) continue
    map.set(feat.value, idx)
  }
  return map
})

const orderFeatureKeys = (featureKeys) => {
  const safe = Array.isArray(featureKeys) ? featureKeys : []
  const order = featureOrderIndex.value
  return [...safe].sort((a, b) => {
    const aIdx = order.has(a) ? order.get(a) : Number.MAX_SAFE_INTEGER
    const bIdx = order.has(b) ? order.get(b) : Number.MAX_SAFE_INTEGER
    if (aIdx !== bIdx) return aIdx - bIdx
    return String(a).localeCompare(String(b))
  })
}

const displayFeatures = computed(() => {
  const row = src.value
  if (!row) return []
  return row.features || []
})

const orderedDisplayFeatures = computed(() => orderFeatureKeys(displayFeatures.value))

const displayQuotas = computed(() => {
  const row = src.value
  if (!row) return {}
  return row.quotas || {}
})

const handleClose = () => emit('close')
</script>
