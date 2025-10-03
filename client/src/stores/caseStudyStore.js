import { defineStore } from 'pinia'
import { useApi } from '@/composables/axios'

export const useCaseStudyStore = defineStore('caseStudy', {
  state: () => ({
    items: [],
    currentItem: null,
    pagination: {
      current: 1,
      total: 1,
      count: 0,
    },
    isLoading: false,
    error: null,
  }),

  getters: {
    getItemById: (state) => (id) => {
      return state.items.find((item) => item._id === id)
    },
  },

  actions: {
    // 獲取所有案例
    async fetchAll(params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()
        const { data } = await apiAuth.get('/api/case-studies', { params })

        this.items = data.caseStudies || []
        this.pagination = data.pagination || {
          current: 1,
          total: 1,
          count: 0,
        }

        return this.items
      } catch (error) {
        console.error('載入案例失敗:', error)
        this.error = error.message || '載入案例失敗'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 獲取單一案例
    async fetchById(id) {
      try {
        const { apiAuth } = useApi()
        const { data } = await apiAuth.get(`/api/case-studies/${id}`)
        this.currentItem = data.caseStudy
        return data.caseStudy
      } catch (error) {
        console.error('載入案例失敗:', error)
        this.error = error.message || '載入案例失敗'
        throw error
      }
    },

    // 創建案例
    async create(caseStudyData) {
      try {
        const { apiAuth } = useApi()
        const { data } = await apiAuth.post('/api/case-studies', caseStudyData)

        // 將新案例加入列表開頭
        this.items.unshift(data.caseStudy)

        return data.caseStudy
      } catch (error) {
        console.error('創建案例失敗:', error)
        this.error = error.message || '創建案例失敗'
        throw error
      }
    },

    // 更新案例
    async update(id, caseStudyData) {
      try {
        const { apiAuth } = useApi()
        const { data } = await apiAuth.put(`/api/case-studies/${id}`, caseStudyData)

        // 更新本地列表
        const index = this.items.findIndex((item) => item._id === id)
        if (index !== -1) {
          this.items.splice(index, 1, data.caseStudy)
        }

        return data.caseStudy
      } catch (error) {
        console.error('更新案例失敗:', error)
        this.error = error.message || '更新案例失敗'
        throw error
      }
    },

    // 刪除案例
    async delete(id) {
      try {
        const { apiAuth } = useApi()
        await apiAuth.delete(`/api/case-studies/${id}`)

        // 從本地列表移除
        const index = this.items.findIndex((item) => item._id === id)
        if (index !== -1) {
          this.items.splice(index, 1)
        }

        return true
      } catch (error) {
        console.error('刪除案例失敗:', error)
        this.error = error.message || '刪除案例失敗'
        throw error
      }
    },

    // 切換狀態
    async toggleStatus(id) {
      try {
        const { apiAuth } = useApi()
        const { data } = await apiAuth.patch(`/api/case-studies/${id}/toggle-status`)

        // 更新本地狀態
        const item = this.items.find((item) => item._id === id)
        if (item) {
          item.isActive = data.caseStudy.isActive
        }

        return data.caseStudy
      } catch (error) {
        console.error('切換狀態失敗:', error)
        this.error = error.message || '切換狀態失敗'
        throw error
      }
    },

    // 清除錯誤
    clearError() {
      this.error = null
    },

    // 重置狀態
    reset() {
      this.items = []
      this.currentItem = null
      this.pagination = {
        current: 1,
        total: 1,
        count: 0,
      }
      this.isLoading = false
      this.error = null
    },
  },
})
