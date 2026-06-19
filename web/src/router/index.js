import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  // Landing page (public)
  {
    path: '/',
    component: () => import('../views/LandingView.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  // App layout — children define their own absolute-style paths via named routes
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { permission: 'dashboard' } },
      { path: 'urls',      component: () => import('../views/URLsView.vue'),            meta: { permission: 'urls' } },
      { path: 'users',     component: () => import('../views/UserManagementView.vue'),  meta: { permission: 'users' } },
      { path: 'roles',     component: () => import('../views/RoleManagementView.vue'),  meta: { permission: 'roles' } },
      { path: 'docs',      component: () => import('../views/DocumentationView.vue'),   meta: { permission: 'docs' } },
      { path: 'api-key',        component: () => import('../views/APIKeyView.vue'),           meta: { permission: 'api_key' } },
      { path: 'api-key-management', component: () => import('../views/APIKeyManagementView.vue'), meta: { permission: 'api_keys' } },
      { path: 'profile',   component: () => import('../views/ProfileView.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) return '/login';
  if (to.meta.guest && token) return '/dashboard';

  // Permission guard — only runs when permissions are already loaded
  if (to.meta.permission && token) {
    const auth = useAuthStore();
    if (auth.permissions && Object.keys(auth.permissions).length > 0) {
      if (!auth.permissions[to.meta.permission]?.view) {
        const NAV = ['dashboard', 'urls', 'users', 'roles', 'docs', 'api_key', 'api_keys'];
        const first = NAV.find((m) => auth.permissions[m]?.view);
        const pathMap = { api_keys: '/api-key-management', api_key: '/api-key' };
        const path = first ? (pathMap[first] ?? `/${first.replace('_', '-')}`) : '/login';
        if (to.path !== path) return path;
      }
    }
  }
});

export default router;
