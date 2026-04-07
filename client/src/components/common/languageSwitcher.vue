<template>
  <div
    class="flex items-center gap-2"
    role="tablist"
    :aria-label="ariaLabel"
    :data-active-lang="modelValue"
    :data-testid="dataTestId"
  >
    <span v-if="showLabel" class="text-sm theme-text opacity-80">{{ labelText }}</span>
    <button
      v-for="lang in availableLanguages"
      :key="lang.code"
      type="button"
      role="tab"
      :aria-selected="modelValue === lang.code"
      :title="`切換至${lang.name}`"
      :data-lang="lang.code"
      :data-testid="optionTestId(lang.code)"
      @click="selectLanguage(lang.code)"
      :class="getButtonClass(lang.code)"
    >
      {{ lang.label || lang.name }}
    </button>
  </div>
</template>

<script setup>
import { useThemeClass } from '@/composables/useThemeClass'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  availableLanguages: {
    type: Array,
    default: () => [
      { code: 'TW', name: '繁體中文', label: 'TW' },
      { code: 'EN', name: 'English', label: 'EN' },
    ],
  },
  dataTestId: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '語言切換',
  },
  showLabel: {
    type: Boolean,
    default: true,
  },
  labelText: {
    type: String,
    default: '語言:',
  },
})

const emit = defineEmits(['update:modelValue'])
const { conditionalClass } = useThemeClass()

const selectLanguage = (langCode) => {
  emit('update:modelValue', langCode)
}

const optionTestId = (langCode) => {
  if (!props.dataTestId) return ''
  return `${props.dataTestId}-${String(langCode).toLowerCase()}`
}

const getButtonClass = (langCode) => {
  const isActive = props.modelValue === langCode
  let baseClasses = ['focus:outline-none', 'px-2', 'py-1', 'text-xs', 'rounded-md', 'font-medium']

  if (isActive) {
    baseClasses.push(
      ...conditionalClass('bg-blue-500 text-white', 'bg-blue-600 text-white').split(' '),
    )
  } else {
    baseClasses.push(
      ...conditionalClass(
        'bg-gray-600 text-gray-300 hover:bg-gray-500',
        'bg-gray-200 text-gray-500 hover:bg-gray-300',
      ).split(' '),
    )
  }
  return baseClasses.join(' ')
}
</script>
