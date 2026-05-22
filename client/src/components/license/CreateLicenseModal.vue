<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
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
            <label class="block theme-text mb-2">訂單編號 *</label>
            <input
              v-model="licenseDraft.orderNumber"
              type="text"
              placeholder="請輸入訂單編號"
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
              YSOP 中央管理平台
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
              YSOS 工地管理平台
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

        <div class="mb-6">
          <label class="block theme-text mb-3">已簽核報價單 *（圖片或 PDF）</label>
          <div
            class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400"
            :class="conditionalClass('border-gray-600', 'border-gray-300')"
            role="button"
            tabindex="0"
            aria-label="上傳授權附檔，支援圖片或 PDF"
            @click="attachmentInputRef?.click()"
            @keydown.enter.prevent="attachmentInputRef?.click()"
            @keydown.space.prevent="attachmentInputRef?.click()"
          >
            <div class="space-y-1 text-center">
              <svg
                class="mx-auto h-12 w-12"
                :class="conditionalClass('text-gray-500', 'text-gray-400')"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p class="pl-1 theme-text">點擊上傳圖片或 PDF</p>
            </div>
            <input
              ref="attachmentInputRef"
              type="file"
              accept="image/*,application/pdf,.pdf"
              class="hidden"
              aria-label="選擇授權附檔（圖片或 PDF）"
              @change="handleLicenseAttachmentChange"
            />
          </div>
          <div v-if="attachmentFile" class="mt-4 max-w-md">
            <div class="relative group">
              <img
                v-if="attachmentPreviewIsImage"
                :src="attachmentPreviewUrl"
                alt="授權附檔預覽"
                class="w-full max-h-72 object-contain rounded-md border"
                :class="
                  conditionalClass('border-gray-600 bg-[#1f2732]', 'border-slate-300 bg-slate-50')
                "
              />
              <div
                v-else
                class="flex items-center gap-3 px-4 py-3 rounded-md border"
                :class="
                  conditionalClass('border-gray-600 bg-[#1f2732]', 'border-slate-300 bg-slate-50')
                "
              >
                <svg
                  class="h-10 w-10 shrink-0 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h5v2H8v-2z"
                  />
                </svg>
                <p class="theme-text text-sm break-all">{{ attachmentFile.name }}</p>
              </div>
              <button
                type="button"
                class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-75 group-hover:opacity-100 cursor-pointer"
                title="移除附檔"
                aria-label="移除附檔"
                @click.stop="clearLicenseAttachmentSelection"
              >
                &#x2715;
              </button>
            </div>
          </div>
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
            !licenseDraft.orderNumber?.trim() ||
            licenseDraft.features.length === 0 ||
            !licenseDraft.deploymentProfile ||
            !attachmentFile
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
import { buildLicenseQuotasPayload, getDefaultMaxDevicesByFeature } from '@/enums/licenseQuota'
import { isLicenseAttachmentFile } from '@/utils/licenseAttachment.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  cardClass: { type: String, required: true },
  conditionalClass: { type: Function, required: true },
  baFeatures: { type: Array, required: true },
  getAllowedFeatureKeysByProfile: { type: Function, required: true },
  getFeatureLabel: { type: Function, required: true },
})

const emit = defineEmits(['close', 'submit'])

const licenseDraft = ref({
  deploymentProfile: 'central',
  customerName: '',
  orderNumber: '',
  features: [],
  notes: '',
})
const quotaDraft = ref({})
const attachmentInputRef = ref(null)
const attachmentFile = ref(null)
const attachmentPreviewUrl = ref('')

const attachmentPreviewIsImage = computed(() => attachmentFile.value?.type?.startsWith('image/'))

const clearLicenseAttachmentSelection = () => {
  if (attachmentPreviewUrl.value) {
    URL.revokeObjectURL(attachmentPreviewUrl.value)
  }
  attachmentPreviewUrl.value = ''
  attachmentFile.value = null
  if (attachmentInputRef.value) {
    attachmentInputRef.value.value = ''
  }
}

watch(
  () => props.open,
  (isOpen) => {
    clearLicenseAttachmentSelection()
    if (!isOpen) return
    licenseDraft.value = {
      deploymentProfile: 'central',
      customerName: '',
      orderNumber: '',
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

const handleLicenseAttachmentChange = (event) => {
  const input = event.target
  const file = input?.files?.[0]
  if (!file || !isLicenseAttachmentFile(file)) {
    if (input) input.value = ''
    return
  }
  if (attachmentPreviewUrl.value) {
    URL.revokeObjectURL(attachmentPreviewUrl.value)
  }
  attachmentFile.value = file
  attachmentPreviewUrl.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
}

const handleSubmit = () => {
  if (!licenseDraft.value.customerName) return
  const orderNo = (licenseDraft.value.orderNumber || '').trim()
  if (!orderNo) return
  if ((licenseDraft.value.features || []).length === 0) return
  if (!attachmentFile.value || !isLicenseAttachmentFile(attachmentFile.value)) {
    emit('submit', { error: '請上傳已簽核報價單（圖片或 PDF）' })
    return
  }

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
    orderNumber: orderNo,
    features: licenseDraft.value.features,
    notes: licenseDraft.value.notes || null,
    quotas: quotasResult.quotas,
    imageFile: attachmentFile.value,
  })
}

const handleClose = () => {
  emit('close')
}
</script>
