import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  {
    path: '/auth',
    component: () => import('../views/AuthPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/interview',
    component: () => import('../views/InterviewRoom.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/report',
    component: () => import('../views/ReportPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/notebook',
    component: () => import('../views/NotebookPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/auth'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/'
  }

  return true
})

export default router
