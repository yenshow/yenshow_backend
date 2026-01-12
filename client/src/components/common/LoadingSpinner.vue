<template>
  <div v-if="show" :class="containerClass" />
</template>

<script setup>
defineProps({
  // 是否顯示
  show: {
    type: Boolean,
    required: true,
  },
  // 自訂容器樣式（可選）
  containerClass: {
    type: String,
    default: '',
  },
})
</script>


