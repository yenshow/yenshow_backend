import { defineStore } from 'pinia'

export const useLanguageStore = defineStore('language', {
  state: () => ({
    currentLang: 'TW',
    supportedLangs: [
      { code: 'TW', name: 'TW' },
      { code: 'EN', name: 'EN' },
    ],
    translations: {
      TW: {},
      EN: {},
    },
  }),

  getters: {
    // 當前語言代碼
    currentLangCode: (state) => state.currentLang,

    // 當前語言名稱
    currentLangName: (state) => {
      const lang = state.supportedLangs.find((l) => l.code === state.currentLang)
      return lang ? lang.name : state.currentLang
    },

    // 獲取翻譯函數
    t:
      (state) =>
      (key, params = {}) => {
        // 獲取當前語言的翻譯
        const translation = state.translations[state.currentLang][key] || key

        // 處理參數替換
        if (params && Object.keys(params).length) {
          return Object.keys(params).reduce((result, param) => {
            return result.replace(new RegExp(`{${param}}`, 'g'), params[param])
          }, translation)
        }

        return translation
      },

    // 簡化的多語言字段獲取函數
    getLocalizedField: (state) => (entity, field) => {
      if (!entity || !entity[field]) return ''

      // 當field是多語言對象時 (標準格式: { TW: "值", EN: "值" })
      if (typeof entity[field] === 'object' && entity[field][state.currentLang]) {
        return entity[field][state.currentLang]
      }

      // 嘗試使用預設語言
      if (typeof entity[field] === 'object' && entity[field]['TW']) {
        return entity[field]['TW']
      }

      // 回傳原始值
      return entity[field]
    },
  },

  actions: {
    // 設置當前語言
    setLanguage(langCode) {
      if (this.supportedLangs.some((l) => l.code === langCode)) {
        this.currentLang = langCode
        localStorage.setItem('appLanguage', langCode)
        document.documentElement.setAttribute('lang', langCode)
      }
    },

    // 載入翻譯資料
    loadTranslations(langCode, translations) {
      if (this.supportedLangs.some((l) => l.code === langCode)) {
        this.translations[langCode] = {
          ...this.translations[langCode],
          ...translations,
        }
      }
    },

    // 初始化語言設定
    initLanguage() {
      // 從本地儲存中獲取語言設定
      const savedLang = localStorage.getItem('appLanguage')
      if (savedLang && this.supportedLangs.some((l) => l.code === savedLang)) {
        this.currentLang = savedLang
      } else {
        // 使用瀏覽器語言或系統預設值
        const browserLang = navigator.language
        if (browserLang.includes('zh')) {
          this.currentLang = 'TW'
        } else {
          this.currentLang = 'EN'
        }
        localStorage.setItem('appLanguage', this.currentLang)
      }

      document.documentElement.setAttribute('lang', this.currentLang)
    },
  },
})
