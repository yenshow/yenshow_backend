<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
  >
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
            <label class="block theme-text mb-2">狀態</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 theme-text"
              :class="readonlyBoxClass"
            >
              {{ getLicenseStatusText(src.status) }}
            </div>
          </div>

          <div>
            <label class="block theme-text mb-2">Serial Number</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 font-mono theme-text text-sm"
              :class="readonlyBoxClass"
            >
              {{ src.serialNumber || '—' }}
            </div>
          </div>

          <div>
            <label class="block theme-text mb-2">License Key</label>
            <div
              class="w-full px-4 py-2 rounded-lg border opacity-90 font-mono theme-text text-sm break-all"
              :class="readonlyBoxClass"
            >
              {{ src.licenseKey || '—' }}
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
              中央監控
            </div>
            <div
              class="px-3 py-2 rounded-lg border text-center theme-text"
              :class="
                src.deploymentProfile === 'construction'
                  ? conditionalClass('border-emerald-500/50 bg-emerald-500/10', 'border-emerald-300 bg-emerald-50')
                  : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')
              "
            >
              工地管理
            </div>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">授權功能模組</label>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="px-1.5 py-0.5 rounded"
              :class="
                conditionalClass(
                  'bg-indigo-500/20 text-indigo-300',
                  'bg-indigo-100 text-indigo-900',
                )
              "
            >
              {{ getFeatureLabel(feat) }}
            </span>
            <span v-if="orderedDisplayFeatures.length === 0" class="opacity-50 theme-text">—</span>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">配額</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border"
              :class="readonlyBoxClass"
            >
              <div class="theme-text text-sm">{{ getFeatureLabel(feat) }}</div>
              <div class="theme-text text-sm font-mono">
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
