import { defineStore } from 'pinia'
import { useApi } from '@/composables/axios'
import { useLanguageStore } from '@/stores/core/languageStore'

// 通用實體 store 工廠函數
export const createEntityStore = (entityType, options = {}) => {
  const responseKey = options.responseKey || `${entityType}List`

  return defineStore(`${entityType}Store`, {
    state: () => ({
      items: [],
      currentItem: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
      isLoading: false,
      error: null,
    }),

    getters: {
      getItemById: (state) => (id) => {
        return state.items.find((item) => item._id === id)
      },

      // 取得本地化名稱的輔助函數
      getItemName: () => (item) => {
        if (!item) return ''
        const languageStore = useLanguageStore()
        return languageStore.getLocalizedField(item, 'name')
      },
    },

    actions: {
      // 獲取所有項目
      async fetchAll(params = {}) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 加入當前語言參數
          const updatedParams = {
            ...params,
            lang: languageStore.currentLang,
          }

          const result = await entityApi(entityType, { responseKey }).getAll(updatedParams)
          this.items = result.items || []
          if (result.pagination) {
            this.pagination = {
              page: result.pagination.page || 1,
              limit: result.pagination.limit || this.pagination.limit,
              total: result.pagination.total || this.pagination.total,
              pages: result.pagination.pages || this.pagination.pages,
            }
          }
        } catch (error) {
          this.error = error.message || `獲取${entityType}時發生錯誤`
        } finally {
          this.isLoading = false
        }
      },

      // 獲取單個項目
      async fetchById(id, params = {}) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 加入當前語言參數
          const updatedParams = {
            ...params,
            lang: languageStore.currentLang,
          }

          this.currentItem = await entityApi(entityType).getById(id, updatedParams)
          return this.currentItem
        } catch (error) {
          this.error = error.message || `獲取${entityType}時發生錯誤`
          return null
        } finally {
          this.isLoading = false
        }
      },

      // 搜尋項目
      async search(keyword, params = {}) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          const searchParams = {
            keyword,
            page: params.page || this.pagination.page,
            limit: params.limit || this.pagination.limit,
            sort: params.sort || 'createdAt',
            sortDirection: params.sortDirection || 'asc',
            ...params,
            lang: languageStore.currentLang,
          }

          const result = await entityApi(entityType, { responseKey }).search(searchParams)

          this.items = result.items
          if (result.pagination) {
            this.pagination = result.pagination
          }

          return this.items
        } catch (error) {
          this.error = error.message || `搜尋${entityType}時發生錯誤`
          return []
        } finally {
          this.isLoading = false
        }
      },

      // 創建項目
      async create(data) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 檢查是否為 FormData 對象
          if (data instanceof FormData) {
            // 如果是 FormData，不需要額外處理，直接發送
            return await entityApi(entityType).create(data)
          } else {
            // 對於普通對象，添加語言參數
            const updatedData = {
              ...data,
              lang: languageStore.currentLang,
            }

            // 簡化日誌輸出
            console.log(`[${entityType}] 創建請求`)

            return await entityApi(entityType).create(updatedData)
          }
        } catch (error) {
          // 簡化錯誤處理
          console.error(`[${entityType}] 創建錯誤:`, error.message)

          if (error.response?.data?.message) {
            this.error = error.response.data.message
          } else if (error.response?.data?.error) {
            this.error = error.response.data.error
          } else {
            this.error = error.message || `創建${entityType}時發生錯誤`
          }

          return null
        } finally {
          this.isLoading = false
        }
      },

      // 更新項目
      async update(id, data) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 檢查是否為 FormData 對象
          if (data instanceof FormData) {
            // 如果是 FormData，不需要額外處理，直接發送
            const result = await entityApi(entityType).update(id, data)

            // 更新本地數據
            if (result) {
              if (this.currentItem && this.currentItem._id === id) {
                this.currentItem = result
              }

              const index = this.items.findIndex((item) => item._id === id)
              if (index !== -1) {
                this.items[index] = result
              }
            }

            return result
          } else {
            // 對於普通對象，可能需要添加語言參數
            const updatedData = {
              ...data,
              lang: languageStore.currentLang,
            }

            // 簡化日誌輸出
            console.log(`[${entityType}] 更新請求 ID:${id}`)

            const result = await entityApi(entityType).update(id, updatedData)

            // 假設後端成功處理但未返回更新後的實體
            // 則手動構建一個結果對象作為回應
            const finalResult = result || {
              _id: id,
              ...updatedData,
            }

            // 更新本地數據
            if (this.currentItem && this.currentItem._id === id) {
              this.currentItem = finalResult
            }

            const index = this.items.findIndex((item) => item._id === id)
            if (index !== -1) {
              this.items[index] = finalResult
            }

            return finalResult
          }
        } catch (error) {
          // 簡化錯誤處理
          console.error(`[${entityType}] 更新錯誤:`, error.message)

          if (error.response?.data?.message) {
            this.error = error.response.data.message
          } else if (error.response?.data?.error) {
            this.error = error.response.data.error
          } else {
            this.error = error.message || `更新${entityType}時發生錯誤`
          }

          return null
        } finally {
          this.isLoading = false
        }
      },

      // 刪除項目
      async delete(id) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 使用帶語言參數的 API 調用
          const success = await entityApi(entityType).delete(id, {
            lang: languageStore.currentLang,
          })

          if (success) {
            // 更新本地數據
            if (this.currentItem && this.currentItem._id === id) {
              this.currentItem = null
            }

            this.items = this.items.filter((item) => item._id !== id)
          }

          return success
        } catch (error) {
          this.error = error.message || `刪除${entityType}時發生錯誤`
          return false
        } finally {
          this.isLoading = false
        }
      },

      // 批量處理
      async batchProcess(data) {
        this.isLoading = true
        this.error = null

        try {
          const { entityApi } = useApi()
          const languageStore = useLanguageStore()

          // 加入當前語言參數
          const updatedData = {
            ...data,
            lang: languageStore.currentLang,
          }

          return await entityApi(entityType).batchProcess(updatedData)
        } catch (error) {
          this.error = error.message || `批量處理${entityType}時發生錯誤`
          return null
        } finally {
          this.isLoading = false
        }
      },
    },
  })
}
