export const clickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (event) => {
      // 檢查點擊事件是否發生在元素外部
      if (!(el === event.target || el.contains(event.target))) {
        // 呼叫綁定的值，通常是一個方法
        binding.value(event)
      }
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) {
    // 移除事件監聽器以避免記憶體洩漏
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  },
}

export default clickOutside
