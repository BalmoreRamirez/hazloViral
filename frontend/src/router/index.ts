import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login',    name: 'login',    component: () => import('@/views/LoginView.vue'),           meta: { guest: true } },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'),        meta: { guest: true } },
    { path: '/',         redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'),     meta: { auth: true } },
    { path: '/chats',    name: 'chats',    component: () => import('@/views/ChatsView.vue'),           meta: { auth: true } },
    { path: '/chats/:id', name: 'chat',   component: () => import('@/views/ChatView.vue'),            meta: { auth: true } },
    { path: '/contratos', name: 'contratos', component: () => import('@/views/ContratosView.vue'),    meta: { auth: true } },
    { path: '/contratos/:id', name: 'contrato', component: () => import('@/views/ContratoDetailView.vue'), meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isAuthenticated) return '/login'
  if (to.meta.guest && auth.isAuthenticated) return '/dashboard'
})

export default router
