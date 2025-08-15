<template>
  <div class="flex items-center space-x-2">
    <span class="text-sm">語言:</span>
    <button
      v-for="lang in availableLanguages"
      :key="lang.code"
      type="button"
      :title="`切換至${lang.name}`"
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
})

const emit = defineEmits(['update:modelValue'])
const { conditionalClass } = useThemeClass()

const selectLanguage = (langCode) => {
  emit('update:modelValue', langCode)
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
