<template>
  <div v-if="show" :class="containerClass" />
</template>

<script setup>
defineProps({
  // 是否顯示（多數頁面用外層 v-if 控制掛載；未傳時預設顯示，避免必填 prop 警告）
  show: {
    type: Boolean,
    default: true,
  },
  // 自訂容器樣式（可選）
  containerClass: {
    type: String,
    default: '',
  },
})
</script>


