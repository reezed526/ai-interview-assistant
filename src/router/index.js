import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/HomePage.vue'),
  },
  {
    path: '/interview',
    component: () => import('../views/InterviewRoom.vue'),
  },
  {
    path: '/report',
    component: () => import('../views/ReportPage.vue'),
  },
  {
    path: '/notebook',
    component: () => import('../views/NotebookPage.vue'),
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

export default router
