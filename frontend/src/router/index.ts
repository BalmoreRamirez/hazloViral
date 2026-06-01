import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth ───────────────────────────────────────────────────────────────
    { path: '/login',    name: 'login',    component: () => import('@/views/auth/LoginView.vue'),    meta: { guest: true } },
    { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterView.vue'), meta: { guest: true } },

    // ── Dashboard ───────────────────────────────────────────────────────────
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { auth: true } },

    // ── Perfil (empresa o influencer según rol) ──────────────────────────
    {
      path: '/perfil',
      name: 'perfil',
      redirect: () => {
        // La redirección real ocurre en el componente de cada vista; aquí sólo como fallback
        return '/dashboard'
      },
      meta: { auth: true },
    },
    {
      path: '/perfil/empresa',
      name: 'perfil-empresa',
      component: () => import('@/views/perfil/EmpresaProfileView.vue'),
      meta: { auth: true, role: 'empresa' },
    },
    {
      path: '/perfil/influencer',
      name: 'perfil-influencer',
      component: () => import('@/views/perfil/InfluencerProfileView.vue'),
      meta: { auth: true, role: 'influencer' },
    },

    // ── Influencers (buscador + perfil público) ──────────────────────────
    {
      path: '/influencers',
      name: 'influencers',
      component: () => import('@/views/influencers/InfluencersSearchView.vue'),
      meta: { auth: true, roles: ['empresa', 'admin'] },
    },
    {
      path: '/influencers/:id',
      name: 'influencer-public',
      component: () => import('@/views/influencers/InfluencerPublicView.vue'),
      meta: { auth: true },
    },

    // ── Chats ───────────────────────────────────────────────────────────────
    { path: '/chats',     name: 'chats', component: () => import('@/views/chats/ChatsView.vue'),   meta: { auth: true } },
    { path: '/chats/:id', name: 'chat',  component: () => import('@/views/chats/ChatView.vue'),    meta: { auth: true } },

    // ── Contratos ───────────────────────────────────────────────────────────
    { path: '/contratos',     name: 'contratos', component: () => import('@/views/contratos/ContratosView.vue'),       meta: { auth: true } },
    { path: '/contratos/:id', name: 'contrato',  component: () => import('@/views/contratos/ContratoDetailView.vue'),  meta: { auth: true } },

    // ── Admin ───────────────────────────────────────────────────────────────
    { path: '/admin', name: 'admin', component: () => import('@/views/admin/AdminView.vue'), meta: { auth: true, role: 'admin' } },

    // ── Fallback ────────────────────────────────────────────────────────────
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isAuthenticated) return '/login'
  if (to.meta.guest && auth.isAuthenticated) return '/dashboard'
  if (to.meta.role === 'admin'      && auth.user?.role !== 'admin')      return '/dashboard'
  if (to.meta.role === 'empresa'    && auth.user?.role !== 'empresa')    return '/dashboard'
  if (to.meta.role === 'influencer' && auth.user?.role !== 'influencer') return '/dashboard'
})

export default router
