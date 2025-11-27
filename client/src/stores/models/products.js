import { defineStore } from 'pinia'
import { useApi } from '@/composables/axios'
import { useLanguageStore } from '@/stores/core/languageStore'

/**
 * 產品管理 Store
 * 專門用於處理產品資料的狀態管理和 API 操作
 */
export const useProductsStore = defineStore('productsStore', {
  state: () => ({
    items: [],
    currentProduct: null,
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
    /**
     * 通過 ID 獲取產品
     */
    getProductById: (state) => (id) => {
      return state.items.find((item) => item._id === id)
    },

    /**
     * 獲取本地化產品名稱
     */
    getProductName: () => (product) => {
      if (!product) return ''
      const languageStore = useLanguageStore()
      const name = product.name
      if (!name) return product.code || ''

      // 如果 name 是物件（多語言格式），根據當前語言返回對應值
      if (typeof name === 'object' && name !== null) {
        const currentLang = languageStore.currentLang
        return (
          name[currentLang] || name.TW || name.EN || Object.values(name)[0] || product.code || ''
        )
      }

      // 如果 name 是字串，直接返回
      return typeof name === 'string' ? name : product.code || ''
    },
  },

  actions: {
    /**
     * 獲取產品列表
     */
    async fetchProducts(params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()
        const languageStore = useLanguageStore()

        // 基本查詢參數
        const queryParams = {
          page: params.page || this.pagination.page,
          limit: params.limit || this.pagination.limit,
          sort: params.sort || 'createdAt',
          sortDirection: params.sortDirection || 'asc',
          ...params,
          lang: languageStore.currentLang,
        }

        // 發送請求
        const response = await apiAuth({
          url: '/api/products',
          method: 'get',
          params: queryParams,
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '獲取產品列表失敗')
        }

        // 更新狀態
        const result = response.data.result || {}
        this.items = result.productsList || []

        // 更新分頁信息
        if (result.pagination) {
          this.pagination = result.pagination
        }

        return this.items
      } catch (error) {
        console.error('獲取產品列表失敗:', error)
        this.error = error.message || '獲取產品列表時發生錯誤'
        return []
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 搜索產品
     * @param {string} keyword - 搜尋關鍵字
     * @param {Object} params - 搜尋參數
     * @param {number} params.page - 頁碼（預設：1）
     * @param {number} params.limit - 每頁數量（預設：20）
     * @param {string} params.sort - 排序欄位（預設：createdAt）
     * @param {string} params.sortDirection - 排序方向（預設：asc）
     * @param {string} params.specifications - 規格 ID 過濾
     * @param {boolean} params.includeInactive - 是否包含非活躍產品（預設：false）
     * @returns {Promise<Array>} 產品列表
     */
    async searchProducts(keyword, params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()

        // 構建搜尋參數（移除後端不支援的 lang 參數）
        const searchParams = {
          keyword: keyword || undefined, // 允許空關鍵字進行過濾搜尋
          page: params.page || this.pagination.page,
          limit: params.limit || this.pagination.limit,
          sort: params.sort || 'createdAt',
          sortDirection: params.sortDirection || 'asc',
        }

        // 可選參數
        if (params.specifications) {
          searchParams.specifications = params.specifications
        }

        if (params.includeInactive === true) {
          searchParams.includeInactive = 'true'
        }

        // 發送請求
        const response = await apiAuth({
          url: '/api/products/search',
          method: 'get',
          params: searchParams,
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '搜索產品失敗')
        }

        // 更新狀態
        const result = response.data.result || {}
        this.items = result.productsList || []

        // 更新分頁信息
        if (result.pagination) {
          this.pagination = {
            page: result.pagination.page || this.pagination.page,
            limit: result.pagination.limit || this.pagination.limit,
            total: result.pagination.total || 0,
            pages: result.pagination.pages || 0,
          }
        }

        return this.items
      } catch (error) {
        console.error('搜索產品失敗:', error)
        this.error = error.message || '搜索產品時發生錯誤'
        this.items = []
        return []
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 搜尋產品（簡化版本，用於全局搜尋）
     * 這是 searchProducts 的別名方法，用於與 searchStore 兼容
     * @param {string} keyword - 搜尋關鍵字
     * @returns {Promise<Array>} 產品列表
     */
    async search(keyword) {
      if (!keyword || keyword.trim() === '') {
        return []
      }

      // 全局搜尋時使用較小的 limit 以提升性能
      return await this.searchProducts(keyword.trim(), {
        page: 1,
        limit: 10, // 全局搜尋只顯示前 10 個結果
        sort: 'createdAt',
        sortDirection: 'desc', // 預設按最新排序
      })
    },

    /**
     * 獲取單個產品詳情
     */
    async fetchProductById(id, params = {}) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()
        const languageStore = useLanguageStore()

        // 添加語言參數
        const queryParams = {
          ...params,
          lang: languageStore.currentLang,
        }

        // 發送請求
        const response = await apiAuth({
          url: `/api/products/${id}`,
          method: 'get',
          params: queryParams,
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '獲取產品詳情失敗')
        }

        // 更新當前產品
        this.currentProduct = response.data.result.products || response.data.result
        return this.currentProduct
      } catch (error) {
        console.error(`獲取產品 (ID: ${id}) 失敗:`, error)
        this.error = error.message || '獲取產品詳情時發生錯誤'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 創建新產品
     */
    async createProduct(formData) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()

        // 檢查 formData 是否為空
        console.log('Store提交的FormData:')
        if (formData instanceof FormData) {
          for (const pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0].includes('image') ? '[文件內容]' : pair[1]))
          }
        } else {
          console.error('Error: 預期的 FormData 是空的或不是 FormData 類型')
          throw new Error('傳遞給 createProduct 的不是有效的 FormData')
        }

        // 發送 FormData 請求 - 關鍵：不要讓 axios 自動處理 FormData
        const response = await apiAuth({
          url: '/api/products',
          method: 'post',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // 防止攔截器修改 FormData
          transformRequest: [
            function (data) {
              return data // 不做任何處理，直接傳遞 FormData
            },
          ],
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '創建產品失敗')
        }

        const newProduct = response.data.result.products || response.data.result

        // 添加到列表
        if (newProduct) {
          this.items.unshift(newProduct)
        }

        return newProduct
      } catch (error) {
        console.error('創建產品失敗:', error)
        this.error = error.message || '創建產品時發生錯誤'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 更新產品
     */
    async updateProduct(id, formData) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()

        // 檢查 formData 是否為空
        console.log('Store提交的FormData (更新):')
        if (formData instanceof FormData) {
          for (const pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0].includes('image') ? '[文件內容]' : pair[1]))
          }
        } else {
          console.error('Error: 預期的 FormData 是空的或不是 FormData 類型')
          throw new Error('傳遞給 updateProduct 的不是有效的 FormData')
        }

        // 發送 FormData 請求 - 關鍵：不要讓 axios 自動處理 FormData
        const response = await apiAuth({
          url: `/api/products/${id}`,
          method: 'put',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // 防止攔截器修改 FormData
          transformRequest: [
            function (data) {
              return data // 不做任何處理，直接傳遞 FormData
            },
          ],
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '更新產品失敗')
        }

        const updatedProduct = response.data.result.products || response.data.result

        // 更新列表和當前產品
        if (updatedProduct) {
          // 更新列表中的產品
          const index = this.items.findIndex((p) => p._id === id)
          if (index !== -1) {
            this.items[index] = updatedProduct
          }

          // 更新當前產品
          if (this.currentProduct && this.currentProduct._id === id) {
            this.currentProduct = updatedProduct
          }
        }

        return updatedProduct
      } catch (error) {
        console.error(`更新產品 (ID: ${id}) 失敗:`, error)
        this.error = error.message || '更新產品時發生錯誤'
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 刪除產品
     */
    async deleteProduct(id) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()

        // 發送刪除請求
        const response = await apiAuth({
          url: `/api/products/${id}`,
          method: 'delete',
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '刪除產品失敗')
        }

        // 從列表中移除產品
        this.items = this.items.filter((p) => p._id !== id)

        // 如果當前產品是被刪除的產品，清空當前產品
        if (this.currentProduct && this.currentProduct._id === id) {
          this.currentProduct = null
        }

        return true
      } catch (error) {
        console.error(`刪除產品 (ID: ${id}) 失敗:`, error)
        this.error = error.message || '刪除產品時發生錯誤'
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 批量處理產品
     */
    async batchProcess(data) {
      this.isLoading = true
      this.error = null

      try {
        const { apiAuth } = useApi()
        const languageStore = useLanguageStore()

        // 添加語言參數
        const processData = {
          ...data,
          lang: languageStore.currentLang,
        }

        // 發送請求
        const response = await apiAuth({
          url: '/api/products/batch',
          method: 'post',
          data: processData,
        })

        if (!response.data.success) {
          throw new Error(response.data.message || '批量處理產品失敗')
        }

        // 重新加載產品列表
        await this.fetchProducts()

        return response.data.result
      } catch (error) {
        console.error('批量處理產品失敗:', error)
        this.error = error.message || '批量處理產品時發生錯誤'
        return null
      } finally {
        this.isLoading = false
      }
    },
  },
})
