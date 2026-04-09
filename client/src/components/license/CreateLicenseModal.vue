<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="handleClose"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="新增授權"
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
        新增授權
      </h2>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block theme-text mb-2">客戶名稱 *</label>
            <input
              v-model="licenseDraft.customerName"
              type="text"
              placeholder="請輸入客戶名稱"
              class="w-full px-4 py-2 rounded-lg border"
              :class="
                conditionalClass(
                  'bg-[#2A3441] border-gray-600 theme-text',
                  'bg-white border-slate-300',
                )
              "
            />
          </div>

          <div>
            <label class="block theme-text mb-2">申請人 *</label>
            <input
              v-model="licenseDraft.applicant"
              type="text"
              placeholder="請輸入申請人"
              class="w-full px-4 py-2 rounded-lg border"
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
          <label class="block theme-text mb-2">方案選擇 *</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="licenseDraft.deploymentProfile = 'central'"
              class="px-3 py-2 rounded-lg border transition cursor-pointer"
              :class="
                licenseDraft.deploymentProfile === 'central'
                  ? 'border-sky-500 bg-sky-500/10 theme-text'
                  : conditionalClass(
                      'border-gray-600 bg-[#2A3441] theme-text',
                      'border-slate-300 bg-white',
                    )
              "
            >
              中央監控
            </button>
            <button
              type="button"
              @click="licenseDraft.deploymentProfile = 'construction'"
              class="px-3 py-2 rounded-lg border transition cursor-pointer"
              :class="
                licenseDraft.deploymentProfile === 'construction'
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
          <label class="block theme-text mb-2">授權功能模組 *</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="feat in availableFeatures"
              :key="feat.value"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition"
              :class="[
                licenseDraft.features.includes(feat.value)
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white'),
              ]"
            >
              <input
                type="checkbox"
                :value="feat.value"
                v-model="licenseDraft.features"
                class="accent-indigo-500"
              />
              <span class="theme-text">{{ feat.label }}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">配額</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="feat in orderedSelectedFeatures"
              :key="feat"
              class="flex items-center justify-between gap-3 px-6 py-2 rounded-lg border"
              :class="conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')"
            >
              <div class="theme-text text-sm">{{ getFeatureLabel(feat) }}</div>
              <div class="flex items-center gap-2">
                <input
                  v-model="quotaDraft[feat]"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="空白=不限"
                  class="w-28 px-3 py-1.5 rounded-lg border text-sm text-center"
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
          <p
            v-if="licenseDraft.features.length === 0"
            class="text-sm mt-1"
            :class="conditionalClass('text-gray-400', 'text-slate-500')"
          >
            先選擇功能模組後才可設定配額
          </p>
        </div>

        <div>
          <label class="block theme-text mb-2">備註</label>
          <textarea
            v-model="licenseDraft.notes"
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
          :disabled="
            submitting ||
            !licenseDraft.customerName ||
            !licenseDraft.applicant ||
            licenseDraft.features.length === 0 ||
            !licenseDraft.deploymentProfile
          "
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <span
            v-if="submitting"
            class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
          ></span>
          建立
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
import { computed, ref, watch } from 'vue'
import { buildLicenseQuotasPayload, getDefaultMaxDevicesByFeature } from '@/utils/licenseQuota'

const props = defineProps({
  open: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  cardClass: { type: String, required: true },
  conditionalClass: { type: Function, required: true },
  baFeatures: { type: Array, required: true },
  getAllowedFeatureKeysByProfile: { type: Function, required: true },
  getFeatureLabel: { type: Function, required: true },
  defaultApplicant: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const licenseDraft = ref({
  deploymentProfile: 'central',
  customerName: '',
  applicant: '',
  features: [],
  notes: '',
})
const quotaDraft = ref({})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    licenseDraft.value = {
      deploymentProfile: 'central',
      customerName: '',
      applicant: props.defaultApplicant || '',
      features: [],
      notes: '',
    }
    quotaDraft.value = {}
  },
)

watch(
  () => licenseDraft.value.deploymentProfile,
  () => {
    const allowed = new Set(
      props.getAllowedFeatureKeysByProfile(licenseDraft.value.deploymentProfile),
    )
    licenseDraft.value.features = (licenseDraft.value.features || []).filter((f) => allowed.has(f))
  },
)

watch(
  () => licenseDraft.value.features,
  (nextFeatures, prevFeatures) => {
    const next = Array.isArray(nextFeatures) ? nextFeatures : []
    const prev = Array.isArray(prevFeatures) ? prevFeatures : []

    // 移除已取消勾選的 quota draft，避免殘留舊值
    for (const key of Object.keys(quotaDraft.value || {})) {
      if (!next.includes(key)) delete quotaDraft.value[key]
    }

    // 新增的 feature：套用預設 quota（可手動清空=不限）
    const added = next.filter((f) => !prev.includes(f))
    for (const featureKey of added) {
      if (quotaDraft.value?.[featureKey] !== undefined) continue
      quotaDraft.value[featureKey] = getDefaultMaxDevicesByFeature(featureKey)
    }
  },
  { deep: false },
)

const availableFeatures = computed(() => {
  const allowed = props.getAllowedFeatureKeysByProfile(licenseDraft.value.deploymentProfile)
  return (props.baFeatures || []).filter((f) => allowed.includes(f.value))
})

const featureOrderIndex = computed(() => {
  const map = new Map()
  for (const [idx, feat] of (props.baFeatures || []).entries()) {
    if (!feat?.value) continue
    map.set(feat.value, idx)
  }
  return map
})

const orderedSelectedFeatures = computed(() => {
  const selected = Array.isArray(licenseDraft.value.features) ? licenseDraft.value.features : []
  const order = featureOrderIndex.value
  return [...selected].sort((a, b) => {
    const aIdx = order.has(a) ? order.get(a) : Number.MAX_SAFE_INTEGER
    const bIdx = order.has(b) ? order.get(b) : Number.MAX_SAFE_INTEGER
    if (aIdx !== bIdx) return aIdx - bIdx
    return String(a).localeCompare(String(b))
  })
})

const handleSubmit = () => {
  if (!licenseDraft.value.customerName) return
  if (!licenseDraft.value.applicant) return
  if ((licenseDraft.value.features || []).length === 0) return

  const quotasResult = buildLicenseQuotasPayload({
    featureKeys: licenseDraft.value.features,
    quotaDraft: quotaDraft.value,
    getFeatureLabel: props.getFeatureLabel,
  })
  if (quotasResult.error) {
    emit('submit', { error: quotasResult.error })
    return
  }

  emit('submit', {
    deploymentProfile: licenseDraft.value.deploymentProfile,
    customerName: licenseDraft.value.customerName,
    applicant: licenseDraft.value.applicant,
    features: licenseDraft.value.features,
    notes: licenseDraft.value.notes || null,
    quotas: quotasResult.quotas,
  })
}

const handleClose = () => {
  emit('close')
}
</script>
