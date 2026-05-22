<template>
  <td class="py-3 px-4">
    <div v-if="canManage" class="flex flex-wrap gap-2">
      <button
        type="button"
        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer"
        @click="$emit('edit', user)"
      >
        編輯
      </button>
      <button
        type="button"
        class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition cursor-pointer flex items-center gap-1"
        :disabled="deletingId === user._id"
        @click="$emit('delete', user)"
      >
        <span
          v-if="deletingId === user._id"
          class="animate-spin h-3 w-3 border-b-2 border-white rounded-full"
        ></span>
        {{ deletingId === user._id ? '處理中...' : '刪除' }}
      </button>
    </div>
    <span v-else class="text-sm" :class="conditionalClass('text-gray-500', 'text-slate-400')">—</span>
  </td>
</template>

<script setup>
import { useThemeClass } from '@/composables/useThemeClass'

defineProps({
  user: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
  deletingId: { type: String, default: null },
})

defineEmits(['edit', 'delete'])

const { conditionalClass } = useThemeClass()
</script>
