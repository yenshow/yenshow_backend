import { defineStore } from 'pinia'

export const useSiteStore = defineStore('site', {
  state: () => ({
    currentSite: 'yenshow', // 預設為 yenshow
    sites: {
      yenshow: {
        name: 'Yenshow',
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4001',
        theme: 'yenshow-theme',
        color: 'blue',
        logo: '/yenshow-icon.svg',
      },
      comeo: {
        name: 'Comeo',
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4001',
        theme: 'comeo-theme',
        color: 'green',
        logo: '/comeo-icon.png',
      },
    },
  }),

  getters: {
    currentSiteConfig: (state) => state.sites[state.currentSite],
    currentApiUrl: (state) => state.sites[state.currentSite].apiUrl,
    availableSites: (state) =>
      Object.keys(state.sites).map((key) => ({
        key,
        ...state.sites[key],
      })),
  },

  actions: {
    setSite(siteKey) {
      if (this.sites[siteKey]) {
        this.currentSite = siteKey
        // 儲存到 localStorage
        localStorage.setItem('selectedSite', siteKey)
      }
    },

    initializeSite() {
      // 強制使用 yenshow 作為預設值
      this.currentSite = 'yenshow'
      localStorage.setItem('selectedSite', 'yenshow')
    },
  },
})
