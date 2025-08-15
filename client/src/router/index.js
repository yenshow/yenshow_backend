import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/views/SeriesView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          redirect: { name: 'series-category', params: { seriesCode: 'default' } },
        },
        {
          path: ':seriesCode',
          name: 'series-category',
          component: () => import('@/components/products/CategoryBlock.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/contentManagement',
      name: 'contentManagement',
      component: () => import('@/views/ContentManagementView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/change-password',
      name: 'changePassword',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// 路由守衛
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 檢查是否需要登入權限
  if (to.meta.requiresAuth && !userStore.isLogin) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // 檢查管理員權限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
    return
  }

  // 如果已登入還要訪問登入頁面
  if (to.path === '/login' && userStore.isLogin) {
    next('/')
    return
  }

  // 處理首次登入強制修改密碼
  if (userStore.isFirstLogin && to.name !== 'changePassword') {
    next({ name: 'changePassword' })
    return
  }

  next()
})

export default router
