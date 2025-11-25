import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const DEV_PORT = Number(
  process.env.VITE_DEV_SERVER_PORT || process.env.CLIENT_PORT || process.env.PORT || 3002,
)
const DEV_HOST = process.env.VITE_DEV_SERVER_HOST || '0.0.0.0'
const API_TARGET =
  process.env.VITE_API ||
  process.env.VITE_API_TARGET ||
  `http://localhost:${process.env.DOCKER_API_PORT || process.env.VITE_API_PORT || 4001}`
const STORAGE_TARGET = process.env.VITE_STORAGE_TARGET || API_TARGET

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: DEV_PORT,
    host: DEV_HOST,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/storage': {
        target: STORAGE_TARGET,
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env': {},
  },
})
