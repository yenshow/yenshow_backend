import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import clickOutside from './directives/clickOutside'

// 創建應用實例
const app = createApp(App)

// 註冊 click-outside 指令
app.directive('click-outside', clickOutside)

// 配置 Pinia
const pinia = createPinia()
pinia.use(piniaPersist)

// 初始化主題
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

// 應用啟動前初始化主題
initTheme()

// Toast 配置
const toastOptions = {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
}

// 初始化插件
app.use(pinia)
app.use(router)
app.use(Toast, toastOptions)

// 掛載應用
app.mount('#app')
