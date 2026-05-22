<template>
  <div>
    <label v-if="label" :class="labelClasses" :for="id">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        :value="modelValue"
        :type="visible ? 'text' : 'password'"
        :required="required"
        :placeholder="placeholder"
        :class="[inputClass, inputClasses]"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        type="button"
        :class="[
          conditionalClass(
            'text-white/50 hover:text-white/90',
            'text-slate-400 hover:text-slate-600',
          ),
          toggleClasses,
        ]"
        :aria-label="visible ? '隱藏密碼' : '顯示密碼'"
        @click="visible = !visible"
      >
        <svg
          v-if="visible"
          xmlns="http://www.w3.org/2000/svg"
          :class="iconClasses"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fill-rule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          :class="iconClasses"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
            clip-rule="evenodd"
          />
          <path
            d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
          />
        </svg>
      </button>
    </div>
    <p v-if="hint" :class="hintClasses">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  id: { type: String, required: true },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  /** sm：表單 Modal；profile：個人設定頁（與 ProfileView 其他欄位一致） */
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['sm', 'profile'].includes(v),
  },
})

defineEmits(['update:modelValue'])

const { inputClass, conditionalClass } = useThemeClass()
const visible = ref(false)

const isProfile = computed(() => props.size === 'profile')

const labelClasses = 'block text-sm font-medium mb-2 theme-text'

const inputClasses = computed(() =>
  isProfile.value
    ? 'w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:border-blue-500 pr-10'
    : 'w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 pr-10',
)

const toggleClasses = 'absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1'

const iconClasses = 'h-5 w-5'

const hintClasses = computed(() =>
  [
    'mt-1.5 text-sm',
    conditionalClass('text-gray-400', 'text-slate-500'),
  ].join(' '),
)
</script>
