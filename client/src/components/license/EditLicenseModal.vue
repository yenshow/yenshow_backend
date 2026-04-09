<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="handleClose"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="編輯授權"
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
        編輯授權
      </h2>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block theme-text mb-2">客戶名稱</label>
            <input
              :value="draft.customerName || ''"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>

          <div>
            <label class="block theme-text mb-2">狀態</label>
            <div class="relative" ref="statusDropdownRef">
              <button
                type="button"
                @click="toggleStatusDropdown"
                class="flex items-center justify-between gap-2 w-full px-4 py-2 rounded-[10px] transition-colors theme-text"
                :class="
                  conditionalClass(
                    'border-2 border-[#3F5069] hover:bg-[#3a434c]',
                    'border-2 border-slate-300 bg-white hover:bg-slate-50',
                  )
                "
                :disabled="isStatusDropdownDisabled"
              >
                <span>{{ statusDropdownLabel }}</span>
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': isStatusDropdownOpen }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>

              <div
                v-if="isStatusDropdownOpen"
                :class="[
                  cardClass,
                  'absolute left-0 right-0 z-20 mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto text-left',
                ]"
              >
                <div
                  :class="conditionalClass('bg-gray-800/80', 'bg-white/80')"
                  class="backdrop-blur-sm rounded-lg"
                >
                  <button
                    v-for="option in statusDropdownOptions"
                    :key="option.value"
                    type="button"
                    @click="selectStatus(option)"
                    class="w-full text-left px-4 py-2 flex justify-between items-center transition-colors"
                    :class="[
                      conditionalClass(
                        'hover:bg-white/10 text-white',
                        'hover:bg-slate-100 text-slate-700',
                      ),
                      option.disabled ? 'opacity-50 cursor-not-allowed' : '',
                    ]"
                    :disabled="option.disabled"
                  >
                    <span>{{ option.label }}</span>
                    <span v-if="draft.status === option.value" class="text-blue-400">✓</span>
                  </button>
                </div>
              </div>
            </div>
            <p
              v-if="!isAdmin && draft.status !== 'active'"
              class="text-xs mt-1"
              :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
            >
              提示：staff 無法修改授權狀態
            </p>
          </div>

          <div>
            <label class="block theme-text mb-2">Serial Number</label>
            <input
              :value="draft.serialNumber || '-'"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50 font-mono"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>

          <div>
            <label class="block theme-text mb-2">License Key</label>
            <input
              :value="draft.licenseKey || '-'"
              type="text"
              disabled
              class="w-full px-4 py-2 rounded-lg border opacity-50 font-mono text-sm"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">方案選擇</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled
              class="px-3 py-2 rounded-lg border transition cursor-not-allowed opacity-70"
              :class="
                draft.deploymentProfile === 'construction'
                  ? conditionalClass(
                      'border-gray-600 bg-[#2A3441] theme-text',
                      'border-slate-300 bg-white',
                    )
                  : 'border-sky-500 bg-sky-500/10 theme-text'
              "
            >
              中央監控
            </button>
            <button
              type="button"
              disabled
              class="px-3 py-2 rounded-lg border transition cursor-not-allowed opacity-70"
              :class="
                draft.deploymentProfile === 'construction'
                  ? 'border-emerald-500 bg-emerald-500/10 theme-text'
                  : conditionalClass(
                      'border-gray-600 bg-[#2A3441] theme-text',
                      'border-slate-300 bg-white',
                    )
              "
            >
              工地管理
            </button>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">授權功能模組</label>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300"
            >
              {{ getFeatureLabel(feat) }}
            </span>
            <span v-if="(draft.features?.length || 0) === 0" class="opacity-50 theme-text">-</span>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">配額</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="feat in orderedDisplayFeatures"
              :key="feat"
              class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border opacity-50"
              :class="conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')"
            >
              <div class="theme-text text-sm">{{ getFeatureLabel(feat) }}</div>
              <div class="flex items-center gap-2">
                <input
                  :value="
                    (displayQuotas?.[feat]?.maxDevices ?? null) === null
                      ? ''
                      : displayQuotas?.[feat]?.maxDevices
                  "
                  type="text"
                  disabled
                  placeholder="空白=不限"
                  class="w-28 px-3 py-1.5 rounded-lg border text-sm text-center cursor-not-allowed"
                  :class="
                    conditionalClass(
                      'bg-[#1f2732] border-gray-600 theme-text',
                      'bg-white border-slate-300',
                    )
                  "
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">備註</label>
          <textarea
            v-model="draft.notes"
            rows="3"
            placeholder="選填"
            class="w-full px-4 py-2 rounded-lg border"
            :class="
              conditionalClass(
                'bg-[#2A3441] border-gray-600 theme-text',
                'bg-white border-slate-300',
              )
            "
          ></textarea>
        </div>
      </div>

      <div class="flex gap-2 mt-6">
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <span
            v-if="submitting"
            class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
          ></span>
          更新
        </button>
        <button
          @click="handleClose"
          class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  cardClass: { type: String, required: true },
  conditionalClass: { type: Function, required: true },
  license: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  baFeatures: { type: Array, default: () => [] },
  getFeatureLabel: { type: Function, required: true },
})

const emit = defineEmits(['close', 'submit'])

const draft = ref({
  id: null,
  customerName: '',
  serialNumber: '',
  licenseKey: '',
  status: 'pending',
  _originalStatus: 'pending',
  deploymentProfile: 'central',
  features: [],
  notes: '',
})
const sourceLicense = ref(null)

const statusDropdownRef = ref(null)
const isStatusDropdownOpen = ref(false)

const toNumberOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const mergeQuotasForDisplay = (quotasList) => {
  const merged = {}
  for (const quotas of quotasList) {
    if (!quotas || typeof quotas !== 'object' || Array.isArray(quotas)) continue
    for (const [featureKey, value] of Object.entries(quotas)) {
      const current = merged[featureKey]
      const nextValue = toNumberOrNull(value?.maxDevices)

      // 任一為不限（null）→ 不限
      if (current?.maxDevices === null || nextValue === null) {
        merged[featureKey] = { maxDevices: null }
        continue
      }

      const currentNum = Number(current?.maxDevices)
      const currentSafe = Number.isFinite(currentNum) ? currentNum : 0
      const nextSafe = Number.isFinite(nextValue) ? nextValue : 0
      merged[featureKey] = { maxDevices: currentSafe + nextSafe }
    }
  }
  return merged
}

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
  const src = sourceLicense.value
  if (!src) return draft.value.features || []
  const isMain = !src.parentLicenseKey
  if (!isMain) return draft.value.features || []
  const main = src.features || []
  const ext = (src.extensions || []).flatMap((e) => e.features || [])
  return [...new Set([...main, ...ext])]
})

const orderedDisplayFeatures = computed(() => orderFeatureKeys(displayFeatures.value))

const displayQuotas = computed(() => {
  const src = sourceLicense.value
  if (!src) return {}
  const isMain = !src.parentLicenseKey
  if (!isMain) return src.quotas || {}
  const extQuotas = (src.extensions || []).map((e) => e.quotas || null)
  return mergeQuotasForDisplay([src.quotas || null, ...extQuotas])
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    const src = props.license || {}
    sourceLicense.value = src
    draft.value = {
      id: src._id || src.id || null,
      customerName: src.customerName || '',
      serialNumber: src.serialNumber || '',
      licenseKey: src.licenseKey || '',
      status: src.status || 'pending',
      _originalStatus: src.status || 'pending',
      deploymentProfile: src.deploymentProfile || 'central',
      features: Array.isArray(src.features) ? [...src.features] : [],
      notes: src.notes || '',
    }
    isStatusDropdownOpen.value = false
  },
)

const getStatusText = (status) => {
  const statusMap = { pending: '審核中', available: '可啟用', active: '使用中', inactive: '已停用' }
  return statusMap[status] || status
}

const isStatusDropdownDisabled = computed(() => {
  if (draft.value.status === 'active') return true
  return !props.isAdmin
})

const statusDropdownLabel = computed(() => getStatusText(draft.value.status))

const statusDropdownOptions = computed(() => {
  if (draft.value.status === 'active') {
    return [{ value: 'active', label: '使用中', disabled: true }]
  }
  const canGoPending = draft.value._originalStatus === 'pending'
  const base = [{ value: 'available', label: '可啟用', disabled: false }]
  const pendingOption = canGoPending ? [{ value: 'pending', label: '審核中', disabled: false }] : []
  return [...pendingOption, ...base]
})

const toggleStatusDropdown = () => {
  if (isStatusDropdownDisabled.value) return
  isStatusDropdownOpen.value = !isStatusDropdownOpen.value
}

const selectStatus = (option) => {
  if (option?.disabled) return
  draft.value.status = option.value
  isStatusDropdownOpen.value = false
}

const handleClickOutside = (event) => {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(event.target)) {
    isStatusDropdownOpen.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) document.addEventListener('click', handleClickOutside)
    else document.removeEventListener('click', handleClickOutside)
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleSubmit = () => {
  if (!draft.value.id) return

  const base = { id: draft.value.id, notes: draft.value.notes || null }
  if (!props.isAdmin) {
    emit('submit', base)
    return
  }

  emit('submit', {
    ...base,
    status: draft.value.status,
    previousStatus: draft.value._originalStatus,
  })
}

const handleClose = () => emit('close')
</script>
