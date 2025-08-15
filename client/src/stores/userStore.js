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
          showToast: true,
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
          showToast: true,
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
          onFinally: () => {
            loading.value = false
          },
        },
      )
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
