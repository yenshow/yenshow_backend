<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
    <div
      v-for="feat in featureKeys"
      :key="feat"
      v-show="model[feat]"
      class="flex flex-col gap-2 px-4 py-3 rounded-lg border"
      :class="conditionalClass('border-gray-600 bg-[#2A3441]', 'border-slate-300 bg-white')"
    >
      <div class="theme-text text-sm font-medium">
        {{ getFeatureLabel(feat) }}
        <span class="opacity-70 font-normal">（{{ getQuotaFieldLabel(feat) }}）</span>
      </div>
      <div v-if="feat === 'elevator'" class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-1 text-sm theme-text">
          <span class="opacity-80">台數</span>
          <input
            v-model="model[feat].maxDevices"
            type="number"
            min="0"
            step="1"
            placeholder="不限"
            :aria-label="`${ariaPrefix}電梯台數`"
            class="w-24 px-2 py-1.5 rounded-lg border text-sm text-center"
            :class="inputClass"
          />
          <span class="opacity-70">台</span>
        </label>
        <label class="flex items-center gap-1 text-sm theme-text">
          <span class="opacity-80">點數</span>
          <input
            v-model="model[feat].maxPoints"
            type="number"
            min="0"
            step="1"
            placeholder="不限"
            :aria-label="`${ariaPrefix}電梯點數`"
            class="w-24 px-2 py-1.5 rounded-lg border text-sm text-center"
            :class="inputClass"
          />
          <span class="opacity-70">點</span>
        </label>
      </div>
      <div v-else class="flex items-center gap-2">
        <input
          v-model="model[feat].maxDevices"
          type="number"
          min="0"
          step="1"
          placeholder="空白=不限"
          :aria-label="`${ariaPrefix}${getFeatureLabel(feat)} ${getQuotaFieldLabel(feat)}`"
          class="w-28 px-3 py-1.5 rounded-lg border text-sm text-center"
          :class="inputClass"
        />
        <span class="text-sm theme-text opacity-70">{{ getQuotaUnitSuffix(feat) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getQuotaFieldLabel, getQuotaUnitSuffix } from '@/enums/baLicenseFeatures'

const props = defineProps({
  featureKeys: { type: Array, default: () => [] },
  modelValue: { type: Object, required: true },
  getFeatureLabel: { type: Function, required: true },
  conditionalClass: { type: Function, required: true },
  ariaPrefix: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const inputClass = computed(() =>
  props.conditionalClass('bg-[#1f2732] border-gray-600 theme-text', 'bg-white border-slate-300'),
)
</script>
