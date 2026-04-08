<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="handleClose"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="追加授權"
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
        追加授權（申請副授權）
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block theme-text mb-2">目前已有的功能</label>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="feat in existingFeatures"
              :key="feat"
              class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300"
            >
              {{ getFeatureLabel(feat) }}
            </span>
          </div>
        </div>

        <div>
          <label class="block theme-text mb-2">申請人 *</label>
          <input
            v-model="extendApplicant"
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

        <div class="md:col-span-2">
          <label class="block theme-text mb-2">追加 / 加配額的功能模組 *</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="feat in availableExtendFeatures"
              :key="feat.value"
              class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition"
              :class="[
                extendFeatures.includes(feat.value)
                  ? 'border-purple-500 bg-purple-500/10'
                  : conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white'),
              ]"
            >
              <input
                type="checkbox"
                :value="feat.value"
                v-model="extendFeatures"
                class="accent-purple-500"
              />
              <span class="theme-text">
                {{ feat.label }}
                <span v-if="isAlreadyLicensed(feat.value)" class="ml-1 opacity-70">(已授權)</span>
              </span>
            </label>
          </div>
          <p
            v-if="availableExtendFeatures.length === 0"
            class="text-sm mt-1"
            :class="conditionalClass('text-yellow-400', 'text-yellow-600')"
          >
            無可用的功能模組
          </p>
        </div>

        <div class="md:col-span-2">
          <label class="block theme-text mb-2">配額</label>
          <p
            v-if="extendFeatures.length > 0"
            class="text-sm mb-2"
            :class="conditionalClass('text-gray-400', 'text-slate-500')"
          >
            輸入的配額為「追加數量」，會與目前已存在的配額相加。
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="feat in extendFeatures"
              :key="feat"
              class="flex items-center justify-between gap-3 px-6 py-2 rounded-lg border"
              :class="conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')"
            >
              <div class="theme-text">{{ getFeatureLabel(feat) }}</div>
              <div class="flex items-center gap-2">
                <input
                  v-model="extendQuotas[feat]"
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
            v-if="extendFeatures.length === 0"
            class="text-sm mt-1"
            :class="conditionalClass('text-gray-400', 'text-slate-500')"
          >
            先選擇功能模組後才可設定配額
          </p>
        </div>

        <div class="md:col-span-2">
          <label class="block theme-text mb-2">備註</label>
          <textarea
            v-model="extendNotes"
            rows="2"
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
          :disabled="submitting || extendFeatures.length === 0 || !extendApplicant?.trim()"
          class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <span
            v-if="submitting"
            class="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block mr-2"
          ></span>
          送出申請
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
  target: { type: Object, default: null },
  baFeatures: { type: Array, required: true },
  existingFeatures: { type: Array, default: () => [] },
  getAllowedFeatureKeysByProfile: { type: Function, required: true },
  getFeatureLabel: { type: Function, required: true },
  defaultApplicant: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const extendFeatures = ref([])
const extendApplicant = ref('')
const extendNotes = ref('')
const extendQuotas = ref({})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    extendFeatures.value = []
    extendNotes.value = ''
    extendQuotas.value = {}
    extendApplicant.value = props.defaultApplicant || ''
  },
)

const availableExtendFeatures = computed(() => {
  const profile = props.target?.deploymentProfile || 'central'
  const allowed = props.getAllowedFeatureKeysByProfile(profile)
  return (props.baFeatures || []).filter((f) => allowed.includes(f.value))
})

const isAlreadyLicensed = (featureKey) => {
  return (props.existingFeatures || []).includes(featureKey)
}

watch(
  () => extendFeatures.value,
  (nextFeatures, prevFeatures) => {
    const next = Array.isArray(nextFeatures) ? nextFeatures : []
    const prev = Array.isArray(prevFeatures) ? prevFeatures : []

    for (const key of Object.keys(extendQuotas.value || {})) {
      if (!next.includes(key)) delete extendQuotas.value[key]
    }

    const added = next.filter((f) => !prev.includes(f))
    for (const featureKey of added) {
      if (extendQuotas.value?.[featureKey] !== undefined) continue
      extendQuotas.value[featureKey] = getDefaultMaxDevicesByFeature(featureKey)
    }
  },
  { deep: false },
)

const handleSubmit = () => {
  if (!props.target) return
  if ((extendFeatures.value || []).length === 0) return
  if (!extendApplicant.value?.trim()) return

  const quotasResult = buildLicenseQuotasPayload({
    featureKeys: extendFeatures.value,
    quotaDraft: extendQuotas.value,
    getFeatureLabel: props.getFeatureLabel,
  })
  if (quotasResult.error) {
    emit('submit', { error: quotasResult.error })
    return
  }

  emit('submit', {
    features: extendFeatures.value,
    applicant: extendApplicant.value,
    notes: extendNotes.value || null,
    quotas: quotasResult.quotas,
  })
}

const handleClose = () => {
  emit('close')
}
</script>
