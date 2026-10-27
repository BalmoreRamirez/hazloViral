import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import { createAccessGuard } from './access'
import { opaqueViewRoutes } from './paths'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: opaqueViewRoutes([
    // ── Auth ───────────────────────────────────────────────────────────────
    { path: '/login',          name: 'login',           component: () => import('@/views/auth/LoginView.vue'),           meta: { guest: true } },
    { path: '/register',       name: 'register',        component: () => import('@/views/auth/RegisterView.vue'),        meta: { guest: true } },
    { path: '/forgot-password',name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue'),  meta: { guest: true } },
    { path: '/reset-password', name: 'reset-password',  component: () => import('@/views/auth/ResetPasswordView.vue'),   meta: { guest: true } },
    { path: '/verify-email',   name: 'verify-email',    component: () => import('@/views/auth/VerifyEmailView.vue'), meta: { public: true } },

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

    {
      path: '/empresas/:id',
      name: 'empresa-public',
      component: () => import('@/views/empresas/EmpresaPublicView.vue'),
      meta: { auth: true },
    },

    {
      path: '/briefs',
      name: 'campaign-briefs',
      component: () => import('@/views/campaigns/CampaignBriefsView.vue'),
      meta: { auth: true, role: 'empresa' },
    },

    // ── Chats ───────────────────────────────────────────────────────────────
    { path: '/chats',     name: 'chats', component: () => import('@/views/chats/ChatsView.vue'),   meta: { auth: true, roles: ['empresa', 'influencer'] } },
    { path: '/chats/:id', name: 'chat',  component: () => import('@/views/chats/ChatView.vue'),    meta: { auth: true, roles: ['empresa', 'influencer'] } },

    // ── Contratos ───────────────────────────────────────────────────────────
    { path: '/contratos',     name: 'contratos', component: () => import('@/views/contratos/ContratosView.vue'),       meta: { auth: true, roles: ['empresa', 'influencer'] } },
    { path: '/contratos/:id', name: 'contrato',  component: () => import('@/views/contratos/ContratoDetailView.vue'),  meta: { auth: true, roles: ['empresa', 'influencer'] } },
    { path: '/pagos/comprobantes', name: 'payment-receipts', component: () => import('@/views/pagos/ReceiptsView.vue'), meta: { auth: true, roles: ['empresa', 'influencer'] } },

    {
      path: '/saldo/recargar',
      name: 'credit-recharge',
      component: () => import('@/views/credits/RechargeView.vue'),
      meta: { auth: true, role: 'empresa' },
    },

    // ── Admin ───────────────────────────────────────────────────────────────
    { path: '/admin', name: 'admin', component: () => import('@/views/admin/AdminView.vue'), meta: { auth: true, role: 'admin' } },

    {
      path: '/acceso-restringido',
      name: 'access-denied',
      component: () => import('@/views/auth/AccessDeniedView.vue'),
      meta: { public: true },
    },

    // ── Fallback ────────────────────────────────────────────────────────────
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ]),
})

router.beforeEach((to) => createAccessGuard(useAuthStore(), async (resource) => {
  await api.get(resource)
})(to))

export default router
