<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">

    <!-- Mobile overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="ui.sidebarOpen"
        class="fixed inset-0 bg-black/40 z-40 lg:hidden"
        @click="ui.sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col',
        'bg-white dark:bg-slate-900',
        'border-r border-gray-100 dark:border-slate-800',
        'transition-[width,transform] duration-300 ease-in-out lg:relative lg:translate-x-0',
        ui.sidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/10' : '-translate-x-full',
        ui.sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-64',
      ]"
    >
      <!-- Collapse toggle (desktop only) -->
      <button
        type="button"
        @click="ui.toggleSidebarCollapsed()"
        :aria-label="ui.sidebarCollapsed ? $t('nav.expandSidebar') : $t('nav.collapseSidebar')"
        :aria-expanded="!ui.sidebarCollapsed"
        class="hidden lg:flex absolute -right-3 top-7 z-50 h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-400 shadow-md shadow-black/5 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500/40 hover:scale-105 transition-all duration-200"
      >
        <svg
          class="w-3.5 h-3.5 transition-transform duration-300"
          :class="ui.sidebarCollapsed ? 'rotate-180' : ''"
          fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0 overflow-hidden">
        <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div
          class="min-w-0 whitespace-nowrap transition-opacity duration-200"
          :class="ui.sidebarCollapsed ? 'lg:opacity-0' : ''"
        >
          <p class="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">Blly.to</p>
          <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 leading-none">Short Link Manager</p>
        </div>
      </div>

      <!-- Top divider -->
      <div class="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700/80 to-transparent mb-1" />

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">

        <!-- Skeleton while auth loading -->
        <template v-if="!auth.authReady">
          <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-3.5 py-3 rounded-xl">
            <div class="w-[18px] h-[18px] rounded-md bg-gray-200 dark:bg-slate-700/60 animate-pulse shrink-0" />
            <div class="h-3 rounded-full bg-gray-200 dark:bg-slate-700/60 animate-pulse" :style="`width: ${[60, 45, 72, 55][i-1]}%`" />
          </div>
        </template>

        <!-- Real nav -->
        <Transition
          enter-active-class="transition-opacity duration-300"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <div v-if="auth.authReady" class="space-y-0.5">
            <template v-for="item in visibleNavItems">

              <!-- Section label -->
              <div v-if="item.section" :key="'s-' + item.section" class="pt-4 pb-1.5">
                <p
                  class="px-3 text-[10px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-[0.1em]"
                  :class="ui.sidebarCollapsed ? 'lg:hidden' : ''"
                >{{ $t(item.section) }}</p>
                <!-- Collapsed: thin divider keeps the grouping -->
                <div
                  class="mx-3 h-px bg-gray-100 dark:bg-slate-800"
                  :class="ui.sidebarCollapsed ? 'hidden lg:block' : 'hidden'"
                />
              </div>

              <!-- Nav link -->
              <router-link
                v-else
                :key="item.path"
                :to="item.path"
                :aria-label="$t(item.labelKey)"
                @click="onNavClick"
                @mouseenter="showTip($event, $t(item.labelKey))"
                @mouseleave="hideTip"
                @focus="showTip($event, $t(item.labelKey))"
                @blur="hideTip"
                class="group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 overflow-hidden"
                :class="
                  $route.path === item.path
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-500 dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white'
                "
              >
                <!-- Active left bar -->
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 -translate-x-2"
                  enter-to-class="opacity-100 translate-x-0"
                  leave-active-class="transition-all duration-200 ease-in"
                  leave-from-class="opacity-100 translate-x-0"
                  leave-to-class="opacity-0 -translate-x-2"
                >
                  <span
                    v-if="$route.path === item.path"
                    class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-500 rounded-r-full"
                  />
                </Transition>

                <!-- Icon -->
                <svg
                  class="shrink-0 transition-all duration-200"
                  :class="[
                    $route.path === item.path
                      ? 'text-blue-500 dark:text-blue-400 w-[19px] h-[19px]'
                      : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300 w-[18px] h-[18px]',
                  ]"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconD" />
                </svg>

                <span class="truncate transition-opacity duration-200" :class="ui.sidebarCollapsed ? 'lg:opacity-0' : ''">{{ $t(item.labelKey) }}</span>
              </router-link>
            </template>
          </div>
        </Transition>
      </nav>

      <!-- Bottom divider -->
      <div class="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700/80 to-transparent" />

      <!-- User info footer -->
      <div class="px-3 py-3 shrink-0">
        <button
          class="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all duration-200 group"
          :aria-label="displayName"
          @click="goProfile"
          @mouseenter="showTip($event, displayName)"
          @mouseleave="hideTip"
          @focus="showTip($event, displayName)"
          @blur="hideTip"
        >
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase shadow-sm">
            {{ displayName.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0 text-left whitespace-nowrap transition-opacity duration-200" :class="ui.sidebarCollapsed ? 'lg:opacity-0' : ''">
            <p class="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate leading-tight">{{ displayName }}</p>
            <p class="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5">{{ auth.user?.email }}</p>
          </div>
          <svg
            class="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 shrink-0 transition-all duration-200"
            :class="ui.sidebarCollapsed ? 'lg:hidden' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Top bar -->
      <header class="flex items-center justify-between px-4 lg:px-6 py-3 bg-transparent shrink-0">
        <button
          class="lg:hidden p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          @click="ui.sidebarOpen = !ui.sidebarOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="ml-auto flex items-center gap-2">
          <!-- Language switcher -->
          <LanguageSwitcher />

          <!-- Theme toggle -->
          <ThemeToggle />

          <!-- Logout button -->
          <button
            @click="onLogout"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Logout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="hidden sm:inline">{{ $t('nav.logout') }}</span>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <router-view />
      </main>
    </div>

    <!-- Toasts -->
    <ToastContainer />

    <!-- Modals -->
    <LinkForm
      v-if="ui.showLinkForm"
      :link="ui.editingLink"
      @close="ui.closeForm()"
      @saved="handleFormSaved"
    />
    <LogModal
      v-if="ui.showLogModal && ui.viewingLink"
      :link="ui.viewingLink"
      @close="ui.closeLogs()"
    />
    <ConfirmDialog
      v-if="ui.showLogoutConfirm"
      @confirm="handleLogout"
      @cancel="ui.showLogoutConfirm = false"
    />

    <!-- Collapsed-sidebar tooltip (rendered to body to escape nav overflow) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-x-1"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-1"
      >
        <div
          v-if="tooltip.show"
          class="fixed z-[100] -translate-y-1/2 pointer-events-none"
          :style="{ top: tooltip.top + 'px', left: tooltip.left + 'px' }"
          role="tooltip"
        >
          <div class="relative px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium whitespace-nowrap shadow-lg shadow-black/25 ring-1 ring-white/10">
            {{ tooltip.text }}
            <span class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useUIStore } from '../stores/ui';
import { useLinksStore } from '../stores/links';
import { useTheme } from '../composables/useTheme';
import { usePermission } from '../composables/usePermission';
import LinkForm from '../components/LinkForm.vue';
import LogModal from '../components/LogModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import ToastContainer from '../components/ToastContainer.vue';

const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();
const ui = useUIStore();
const store = useLinksStore();
const { init: initTheme } = useTheme();
const { can } = usePermission();

// --- Collapsed-sidebar tooltip ---------------------------------------------
// Only shown on desktop (lg+) while the sidebar is collapsed to an icon rail.
const isLg = ref(false);
let lgQuery = null;

const tooltip = ref({ show: false, text: '', top: 0, left: 0 });

const showTip = (event, text) => {
  if (!ui.sidebarCollapsed || !isLg.value) return;
  const rect = event.currentTarget.getBoundingClientRect();
  tooltip.value = {
    show: true,
    text,
    top: rect.top + rect.height / 2,
    left: rect.right + 12,
  };
};
const hideTip = () => { tooltip.value.show = false; };

// The tooltip position is snapshotted on show, so dismiss it whenever the
// anchor could move or the rail could disappear: scroll (capture phase also
// catches the nav's own scroll), resize, Escape, breakpoint drop, and toggle.
const onLgChange = (e) => {
  isLg.value = e.matches;
  if (!e.matches) hideTip();
};
const onKeydown = (e) => { if (e.key === 'Escape') hideTip(); };
watch(() => ui.sidebarCollapsed, hideTip);

const onNavClick = () => {
  ui.sidebarOpen = false;
  hideTip();
};

const navItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', permission: 'dashboard', iconD: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/urls',      labelKey: 'nav.urls',      permission: 'urls',      iconD: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' },
  { section: 'nav.management' },
  { path: '/users',              labelKey: 'nav.users',   permission: 'users',    iconD: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { path: '/roles',              labelKey: 'nav.roles',   permission: 'roles',    iconD: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { path: '/api-key-management', labelKey: 'nav.apiKeys', permission: 'api_keys', iconD: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { section: 'nav.account' },
  { path: '/api-key',   labelKey: 'nav.apiKey', permission: 'api_key', iconD: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { path: '/docs',      labelKey: 'nav.docs',   permission: 'docs',    iconD: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

const visibleNavItems = computed(() => {
  const result = [];
  let pendingSection = null;
  for (const item of navItems) {
    if (item.section) {
      pendingSection = item;
    } else if (can(item.permission)) {
      if (pendingSection) { result.push(pendingSection); pendingSection = null; }
      result.push(item);
    }
  }
  return result;
});

const displayName = computed(() => {
  if (auth.user?.fullName) return auth.user.fullName;
  const email = auth.user?.email || '';
  return email.split('@')[0] || 'User';
});

const goProfile = () => {
  router.push('/profile');
};

const onLogout = () => {
  ui.showLogoutConfirm = true;
};

const ROUTE_PERMISSION = {
  '/dashboard': 'dashboard',
  '/urls': 'urls',
  '/users': 'users',
  '/roles': 'roles',
  '/docs': 'docs',
  '/api-key': 'api_key',
  '/api-key-management': 'api_keys',
};

onMounted(async () => {
  initTheme();
  lgQuery = window.matchMedia('(min-width: 1024px)');
  isLg.value = lgQuery.matches;
  lgQuery.addEventListener('change', onLgChange);
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', hideTip);
  window.addEventListener('keydown', onKeydown);
  if (auth.token && !auth.user) {
    await auth.fetchMe();
  } else if (!auth.token) {
    auth.authReady = true;
  }
  // Redirect if current route has no view permission
  const requiredPerm = ROUTE_PERMISSION[router.currentRoute.value.path];
  if (requiredPerm && !can(requiredPerm)) {
    const first = navItems.find((n) => can(n.permission));
    router.replace(first ? first.path : '/login');
  }
});

onBeforeUnmount(() => {
  lgQuery?.removeEventListener('change', onLgChange);
  window.removeEventListener('scroll', hideTip, true);
  window.removeEventListener('resize', hideTip);
  window.removeEventListener('keydown', onKeydown);
});

const handleCreateLink = () => {
  ui.openCreate();
  ui.sidebarOpen = false;
};

const handleFormSaved = () => {
  ui.closeForm();
  store.fetchAnalytics();
};

const handleLogout = () => {
  ui.showLogoutConfirm = false;
  auth.logout();
  router.push('/login');
};
</script>
