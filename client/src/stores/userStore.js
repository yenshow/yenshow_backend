// client/src/stores/userStore.js

// Utilities
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import UserRole from '@/enums/UserRole.js'
import { useApi } from '@/composables/axios'
import { useNotifications } from '@/composables/notificationCenter'

export const useUserStore = defineStore(
  'user',
  () => {
    const { api, apiAuth, safeApiCall } = useApi()
    const notify = useNotifications()

    // ===== 用戶自身狀態 =====
    const token = ref('')
    const account = ref('')
    const email = ref('')
    const role = ref(UserRole.USER)

    const isLogin = computed(() => {
      return token.value.length > 0
    })
    const isAdmin = computed(() => {
      return role.value === UserRole.ADMIN
    })

    const isStaff = computed(() => {
      return role.value === UserRole.STAFF
    })

    // ===== 管理員功能狀態 =====
    const users = ref([])
    const loading = ref(false)
    const error = ref('')

    // ===== 授權管理狀態 =====
    const licenses = ref([])
    const loadingLicenses = ref(false)
    const errorLicenses = ref('')

    const EMPTY_PENDING_COUNTS = { contentManagement: 0, licenses: 0, comeo: 0 }
    const pendingReviewCounts = ref({ ...EMPTY_PENDING_COUNTS })

    const fetchPendingReviewCounts = async () => {
      if (!isAdmin.value && !isStaff.value) {
        pendingReviewCounts.value = { ...EMPTY_PENDING_COUNTS }
        return
      }
      try {
        const { data } = await apiAuth.get('/api/users/pending-review-counts')
        if (data?.success && data.counts) {
          pendingReviewCounts.value = { ...EMPTY_PENDING_COUNTS, ...data.counts }
        }
      } catch (error) {
        console.error('獲取審核中數量失敗:', error)
      }
    }

    const refreshPendingReviewCounts = () => {
      fetchPendingReviewCounts().catch(() => {})
    }

    // ===== 用戶認證功能 =====
    const login = async (values) => {
      try {
        console.log('發送登入請求:', values)
        const { data } = await api.post('/api/users/login', values)
        console.log('登入回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '登入失敗')
        }

        // 使用更嚴格的提取邏輯
        if (data.token) {
          // 直接取得 token
          token.value = data.token
        } else if (data.result?.token) {
          // token 在 result 中
          token.value = data.result.token
        } else {
          throw new Error('回應中找不到有效的 token')
        }

        // 同樣處理用戶資料
        if (data.user) {
          account.value = data.user.account || ''
          role.value = data.user.role || UserRole.USER
        } else if (data.result?.user) {
          account.value = data.result.user.account || ''
          role.value = data.result.user.role || UserRole.USER
        } else {
          console.warn('回應中找不到用戶資料')
        }

        return data.message || '登入成功'
      } catch (error) {
        console.error('登入錯誤:', error)
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '登入失敗',
          showToast: false,
        })
        return errorResult.message
      }
    }

    const profile = async () => {
      if (!isLogin.value) return

      try {
        const { data } = await apiAuth.get('/api/users/profile')

        if (!data || !data.success) {
          throw new Error(data?.message || '獲取個人資料失敗')
        }

        // 用戶資料可能在不同位置，優先檢查 result
        const userData = data.result || data

        // 安全提取，設置預設值
        account.value = userData.account || ''
        email.value = userData.email || ''
        role.value = userData.role || UserRole.USER

        refreshPendingReviewCounts()
        return true
      } catch (error) {
        console.error('獲取個人資料錯誤:', error)
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '獲取個人資料失敗',
          showToast: true,
        })

        // 清除用戶資料
        token.value = ''
        account.value = ''
        role.value = UserRole.USER
        email.value = ''

        throw errorResult.error
      }
    }

    const logout = async () => {
      try {
        if (isLogin.value) {
          await apiAuth.delete('/api/users/logout')
        }
      } catch (error) {
        console.error('登出錯誤:', error)
        notify.handleApiError(error, {
          defaultMessage: '登出失敗',
          showToast: false,
        })
      } finally {
        // 無論如何都清除本地狀態
        token.value = ''
        account.value = ''
        role.value = UserRole.USER
        email.value = ''
        pendingReviewCounts.value = { ...EMPTY_PENDING_COUNTS }
      }
    }

    const changePassword = async (currentPassword, newPassword) => {
      return await safeApiCall(
        async () => {
          loading.value = true
          console.log('正在提交密碼變更請求...')

          const { data } = await apiAuth.post('/api/users/change-password', {
            currentPassword,
            newPassword,
          })

          if (!data || !data.success) {
            throw new Error(data?.message || '密碼修改失敗')
          }

          return {
            success: true,
            message: data.message || '密碼更新成功',
          }
        },
        {
          defaultMessage: '密碼修改失敗',
          onFinally: () => {
            loading.value = false
          },
        },
      )
    }

    // ===== 管理員功能 =====
    const getAllUsers = async () => {
      loading.value = true
      error.value = ''

      try {
        console.log('獲取用戶列表開始')
        const { data } = await apiAuth.get('/api/users/users')
        console.log('獲取用戶列表回應:', data)

        if (!data || !data.success) {
          throw new Error(data?.message || '獲取用戶列表失敗')
        }

        // 根據實際後端回應格式提取用戶列表
        if (Array.isArray(data.users)) {
          users.value = data.users
        } else if (data.result && Array.isArray(data.result.users)) {
          users.value = data.result.users
        } else {
          console.error('回應格式不符合預期:', data)
          throw new Error('回應中找不到用戶列表')
        }

        return data.message || '獲取用戶列表成功'
      } catch (error) {
        console.error('獲取用戶列表錯誤:', error)
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '獲取用戶列表失敗',
          showToast: false,
        })
        error.value = errorResult.message
        throw error
      } finally {
        loading.value = false
      }
    }

    const createUser = async (userData) => {
      return await safeApiCall(
        async () => {
          loading.value = true
          console.log('創建用戶開始:', userData)

          // 處理客戶和員工特定資料
          const requestData = { ...userData }

          // 如果是客戶且有客戶資訊
          if (userData.role === 'client' && userData.clientInfo) {
            requestData.clientInfo = userData.clientInfo
          }

          // 如果是員工/管理員且有員工資訊
          if ((userData.role === 'staff' || userData.role === 'admin') && userData.staffInfo) {
            requestData.staffInfo = userData.staffInfo
          }

          const { data } = await apiAuth.post('/api/users/users', requestData)
          console.log('創建用戶回應:', data)

          if (!data || !data.success) {
            throw new Error(data?.message || '創建用戶失敗')
          }

          // 允許兩種可能的格式
          const newUser = data.result?.user || data.user || data.result
          if (newUser) {
            console.log('新用戶數據:', newUser)
            users.value.push(newUser)
            notify.notifySuccess('創建用戶成功')
            return { success: true, message: data.message || '創建用戶成功' }
          } else {
            console.error('回應中找不到用戶數據:', data)
            // 嘗試重新載入用戶列表
            await getAllUsers()
            return { success: true, message: data.message || '創建用戶成功，但無法獲取新用戶詳情' }
          }
        },
        {
          defaultMessage: '創建用戶失敗',
          onFinally: () => {
            loading.value = false
          },
        },
      )
    }

    const updateUser = async (userId, userData) => {
      return await safeApiCall(
        async () => {
          loading.value = true
          console.log('更新用戶開始:', { userId, userData })

          // 處理客戶和員工特定資料
          const requestData = { ...userData }

          // 如果是客戶且有客戶資訊
          if (userData.role === 'client' && userData.clientInfo) {
            requestData.clientInfo = userData.clientInfo
          }

          // 如果是員工/管理員且有員工資訊
          if ((userData.role === 'staff' || userData.role === 'admin') && userData.staffInfo) {
            requestData.staffInfo = userData.staffInfo
          }

          const { data } = await apiAuth.put(`/api/users/users/${userId}`, requestData)
          console.log('更新用戶回應:', data)

          if (!data || !data.success) {
            throw new Error(data?.message || '更新用戶失敗')
          }

          // 允許兩種可能的格式
          const updatedUser = data.result?.user || data.user || data.result
          if (updatedUser) {
            const index = users.value.findIndex((user) => user._id === userId)
            if (index !== -1) {
              users.value[index] = { ...users.value[index], ...updatedUser }
            }
            return { success: true, message: data.message || '更新用戶成功' }
          } else {
            console.error('回應中找不到用戶數據:', data)
            // 嘗試重新載入用戶列表
            await getAllUsers()
            return { success: true, message: data.message || '更新用戶成功，但無法獲取更新詳情' }
          }
        },
        {
          defaultMessage: '更新用戶失敗',
          onFinally: () => {
            loading.value = false
          },
        },
      )
    }

    const resetUserPassword = async (userId) => {
      return await safeApiCall(
        async () => {
          loading.value = true
          console.log('重置密碼開始:', userId)
          // 使用固定的預設密碼
          const defaultPassword = 'Aa83124007'

          const { data } = await apiAuth.post(`/api/users/users/${userId}/reset-password`, {
            password: defaultPassword,
          })
          console.log('重置密碼回應:', data)

          if (!data || !data.success) {
            throw new Error(data?.message || '重置密碼失敗')
          }

          return {
            success: true,
            message: data.message || '密碼重置成功',
            newPassword: defaultPassword,
          }
        },
        {
          defaultMessage: '重置密碼失敗',
          onFinally: () => {
            loading.value = false
          },
        },
      )
    }

    const deleteUser = async (userId) => {
      return await safeApiCall(
        async () => {
          loading.value = true
          console.log('刪除用戶開始:', userId)
          const { data } = await apiAuth.delete(`/api/users/users/${userId}`)
          console.log('刪除用戶回應:', data)

          if (!data || !data.success) {
            throw new Error(data?.message || '刪除用戶失敗')
          }

          // 從用戶列表中移除該用戶
          const index = users.value.findIndex((user) => user._id === userId)
          if (index !== -1) {
            users.value.splice(index, 1)
          }

          notify.notifySuccess('用戶刪除成功')
          return { success: true, message: data.message || '用戶刪除成功' }
        },
        {
          defaultMessage: '刪除用戶失敗',
          showToast: false,
          onFinally: () => {
            loading.value = false
          },
        },
      )
    }

    // ===== 授權管理功能 =====
    const getAllLicenses = async (params = {}) => {
      loadingLicenses.value = true
      errorLicenses.value = ''

      try {
        const queryParams = {}
        if (params.product) queryParams.product = params.product
        if (params.status) queryParams.status = params.status

        const response = await apiAuth.get('/api/users/licenses', { params: queryParams })
        const { data } = response

        if (!data) {
          throw new Error('伺服器回應為空')
        }

        if (!data.success) {
          throw new Error(data?.message || '獲取授權列表失敗')
        }

        if (Array.isArray(data.licenses)) {
          licenses.value = data.licenses
        } else if (data.result && Array.isArray(data.result.licenses)) {
          licenses.value = data.result.licenses
        } else {
          licenses.value = []
          throw new Error('回應中找不到授權列表')
        }

        return data.message || '獲取授權列表成功'
      } catch (error) {
        console.error('獲取授權列表錯誤:', error)
        if (!Array.isArray(licenses.value)) {
          licenses.value = []
        }
        const errorResult = notify.handleApiError(error, {
          defaultMessage: '獲取授權列表失敗',
          showToast: false,
        })
        errorLicenses.value = errorResult.message
        throw error
      } finally {
        loadingLicenses.value = false
      }
    }

    const createLicense = async (licenseData) => {
      return await safeApiCall(
        async () => {
          const requestBody = {
            product: licenseData.product,
            deploymentProfile: licenseData.deploymentProfile,
            customerName: licenseData.customerName,
            orderNumber: licenseData.orderNumber,
            notes: licenseData.notes || null,
          }
          if (licenseData.product === 'BA-system' && Array.isArray(licenseData.features)) {
            requestBody.features = licenseData.features
          }
          if (licenseData.product === 'BA-system') {
            requestBody.quotas = licenseData.quotas || null
          }

          const hasImage = licenseData.imageFile instanceof File
          let requestPayload = requestBody
          if (hasImage) {
            const fd = new FormData()
            fd.append('licenseDataPayload', JSON.stringify(requestBody))
            fd.append('licenseImage', licenseData.imageFile)
            requestPayload = fd
          }

          const { data } = await apiAuth.post('/api/users/licenses', requestPayload)

          if (!data || !data.success) {
            throw new Error(data?.message || '創建授權失敗')
          }

          // 允許兩種可能的格式
          const newLicense = data.result?.license || data.license || data.result
          if (newLicense) {
            licenses.value.push(newLicense)
          } else {
            console.error('回應中找不到授權數據:', data)
            getAllLicenses().catch((err) => {
              console.error('重新載入授權列表失敗:', err)
            })
          }
          const msg =
            data.message ||
            (newLicense ? '授權建立成功' : '授權建立成功，但無法獲取新授權詳情')
          notify.notifySuccess(msg)
          refreshPendingReviewCounts()
          return { success: true, message: msg }
        },
        {
          defaultMessage: '創建授權失敗',
        },
      )
    }

    const reviewLicense = async (licenseId) => {
      return await safeApiCall(
        async () => {
          const { data } = await apiAuth.post(`/api/users/licenses/${licenseId}/review`)

          if (!data || !data.success) {
            throw new Error(data?.message || '審核授權失敗')
          }
          const message = data.message || '審核授權成功'
          notify.notifySuccess(message)
          refreshPendingReviewCounts()
          return { success: true, message }
        },
        {
          defaultMessage: '審核授權失敗',
        },
      )
    }

    const extendLicense = async (licenseId, extensionData) => {
      return await safeApiCall(
        async () => {
          const { data } = await apiAuth.post(`/api/users/licenses/${licenseId}/extend`, {
            features: extensionData.features,
            orderNumber: extensionData.orderNumber,
            notes: extensionData.notes || null,
            quotas: extensionData.quotas || null,
          })

          if (!data || !data.success) {
            throw new Error(data?.message || '追加授權失敗')
          }

          const message =
            data.message || '副授權申請已建立，待審核通過後將產生 License Key'
          notify.notifySuccess(message)
          refreshPendingReviewCounts()
          return { success: true, message }
        },
        {
          defaultMessage: '追加授權失敗',
        },
      )
    }

    const unbindLicense = async (licenseId) => {
      return await safeApiCall(
        async () => {
          const { data } = await apiAuth.post(`/api/users/licenses/${licenseId}/unbind`)

          if (!data || !data.success) {
            throw new Error(data?.message || '解除綁定失敗')
          }

          const extensionsReset = data.result?.extensionsReset || data.extensionsReset || 0
          const msg =
            extensionsReset > 0 ? `解除綁定成功，已重置 ${extensionsReset} 組副 LK` : '解除綁定成功'
          notify.notifySuccess(msg)
          return { success: true, message: msg }
        },
        {
          defaultMessage: '解除綁定失敗',
        },
      )
    }

    const deleteLicense = async (licenseId) => {
      return await safeApiCall(
        async () => {
          const { data } = await apiAuth.delete(`/api/users/licenses/${licenseId}`)

          if (!data || !data.success) {
            throw new Error(data?.message || '刪除授權失敗')
          }

          const targetId = licenseId?.toString?.() ?? String(licenseId)
          licenses.value = (Array.isArray(licenses.value) ? licenses.value : []).filter((license) => {
            const id = license?._id || license?.id
            if (!id) return true
            const normalized = id?.toString?.() ?? String(id)
            return normalized !== targetId
          })

          notify.notifySuccess(data.message || '授權刪除成功')
          refreshPendingReviewCounts()
          return { success: true, message: data.message || '授權刪除成功' }
        },
        {
          defaultMessage: '刪除授權失敗',
        },
      )
    }

    const downloadLicensePdf = async (licenseId, licenseKeyFallback = '') => {
      try {
        const response = await apiAuth.get(`/api/users/licenses/${licenseId}/pdf`, {
          responseType: 'blob',
        })

        const blob = response.data
        const contentType = (response.headers['content-type'] || '').toLowerCase()

        if (!(blob instanceof Blob) || !contentType.includes('application/pdf')) {
          let message = '下載 PDF 失敗'
          if (blob instanceof Blob) {
            const text = await blob.text()
            try {
              const parsed = JSON.parse(text)
              if (parsed?.message) message = parsed.message
            } catch {
              /* 非 JSON */
            }
          }
          throw new Error(message)
        }

        const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'] || ''
        let filename = ''
        const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
        if (star?.[1]) {
          filename = decodeURIComponent(star[1].replace(/["']/g, '').trim())
        } else {
          const plain = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;\s]+)/i)
          if (plain?.[1]) filename = plain[1].replace(/["']/g, '').trim()
        }

        if (!filename) {
          const safe = String(licenseKeyFallback || 'license').replace(/[^a-zA-Z0-9-_]/g, '_')
          filename = `BA-System-License-${safe}.pdf`
        }

        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.rel = 'noopener'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.URL.revokeObjectURL(url)

        notify.notifySuccess('PDF 下載完成')
        return { success: true, message: 'PDF 下載完成' }
      } catch (error) {
        if (error?.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text()
            const parsed = JSON.parse(text)
            if (parsed?.message) {
              error.message = parsed.message
            }
          } catch {
            /* ignore */
          }
        }
        notify.handleApiError(error, { defaultMessage: '下載 PDF 失敗', showToast: true })
        throw error
      }
    }

    // ===== 客戶端功能 =====

    return {
      // 狀態
      token,
      account,
      email,
      role,
      isLogin,
      isAdmin,
      isStaff,
      users,
      loading,
      error,

      // 授權管理狀態
      licenses,
      loadingLicenses,
      errorLicenses,
      pendingReviewCounts,
      refreshPendingReviewCounts,

      // 用戶認證功能
      login,
      profile,
      logout,
      changePassword,

      // 管理員功能
      getAllUsers,
      createUser,
      updateUser,
      resetUserPassword,
      deleteUser,

      // 授權管理功能
      getAllLicenses,
      createLicense,
      reviewLicense,
      extendLicense,
      unbindLicense,
      deleteLicense,
      downloadLicensePdf,

      // 客戶端功能
    }
  },
  {
    persist: {
      key: 'user',
      paths: ['token'],
    },
  },
)
