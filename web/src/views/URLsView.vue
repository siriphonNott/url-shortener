<template>
  <div class="px-4 lg:px-8 py-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('urls.title') }}</h1>
      <button
        @click="ui.openCreate()"
        class="shorten-btn flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-px active:translate-y-0 active:shadow-md"
      >
        <svg class="w-4 h-4 transition-transform duration-200 group-hover:rotate-90 shorten-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        {{ $t('urls.shortenBtn') }}
      </button>
    </div>

    <!-- Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden">

      <!-- Search + Filter -->
      <div class="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <!-- Search -->
        <div class="relative flex-1 max-w-sm">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            v-model="search"
            type="text"
            :placeholder="$t('urls.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            @input="currentPage = 1"
          />
        </div>

        <!-- Status filter -->
        <div class="w-44 shrink-0">
          <AppSelect
            v-model="activeFilter"
            @change="currentPage = 1"
            :options="[
              { value: 'all',      label: $t('common.allStatuses') },
              { value: 'active',   label: $t('common.active'),   dot: 'bg-emerald-500' },
              { value: 'inactive', label: $t('common.inactive'), dot: 'bg-gray-400' },
              { value: 'expired',  label: $t('common.expired'),  dot: 'bg-orange-500' },
            ]"
            :placeholder="$t('common.allStatuses')"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <!-- Loading -->
        <div v-if="store.loading" class="p-16 flex flex-col items-center gap-3 text-gray-400 dark:text-slate-600">
          <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm">{{ $t('common.loading') }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredLinks.length === 0" class="p-16 flex flex-col items-center gap-3">
          <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
            <svg class="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p class="font-semibold text-gray-700 dark:text-slate-300">{{ $t('urls.noLinks') }}</p>
          <p class="text-sm text-gray-400 dark:text-slate-600">{{ $t('urls.noLinksHint') }}</p>
        </div>

        <!-- Data table -->
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('urls.titleCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('urls.shortLinkCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('urls.destinationUrlCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('urls.visitsCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('common.status') }}</th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none"
                @click="toggleSort"
              >
                <span class="flex items-center gap-1">
                  {{ $t('common.createdAt') }}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('urls.expiredAtCol') }}</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-slate-700/70">
            <tr
              v-for="link in pagedLinks"
              :key="link._id"
              class="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- Title -->
              <td class="px-4 py-3 max-w-[240px]">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      v-if="getFaviconUrl(link.destinationUrl)"
                      :src="getFaviconUrl(link.destinationUrl)"
                      class="w-5 h-5 object-contain"
                      @error="e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block' }"
                    />
                    <svg class="w-4 h-4 text-gray-400 dark:text-slate-600" style="display:none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-snug" :title="link.title">
                    {{ link.title || '—' }}
                  </span>
                </div>
              </td>
              <!-- Short Link -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2">
                  <a
                    :href="`${baseShortUrl}/${link.code}`"
                    target="_blank"
                    class="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg"
                  >
                    /{{ link.code }}
                  </a>
                  <button
                    @click="copyLink(link.code)"
                    class="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
                    :title="copied === link.code ? $t('common.copied') : $t('common.copy')"
                  >
                    <svg v-if="copied !== link.code" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </td>
              <!-- Destination URL -->
              <td class="px-4 py-3 max-w-[220px]">
                <span class="text-xs text-gray-600 dark:text-slate-400 truncate block" :title="link.destinationUrl">
                  {{ link.destinationUrl }}
                </span>
              </td>
              <!-- Visits -->
              <td class="px-4 py-3.5 text-gray-700 dark:text-slate-300 font-medium text-sm">
                {{ link.clickCount.toLocaleString() }}
              </td>
              <!-- Status -->
              <td class="px-4 py-3.5">
                <span
                  :class="linkStatus(link).cls"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                >
                  <!-- Clock icon for expired -->
                  <svg v-if="isExpired(link)" class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />
                  </svg>
                  <!-- Dot for active / inactive -->
                  <span v-else class="w-1.5 h-1.5 rounded-full shrink-0" :class="linkStatus(link).dotCls" />
                  {{ linkStatus(link).label }}
                </span>
              </td>
              <!-- Created At -->
              <td class="px-4 py-3.5 text-xs text-gray-600 dark:text-slate-400">
                {{ formatDate(link.createdAt) }}
              </td>
              <!-- Expired At -->
              <td class="px-4 py-3.5 text-xs">
                <span v-if="link.expiresAt" :class="isExpired(link) ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-slate-500'">
                  {{ formatDate(link.expiresAt) }}
                </span>
                <span v-else class="text-gray-300 dark:text-slate-700">—</span>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex justify-end gap-1">
                  <button @click="analyticsLink = link" title="Analytics"
                    class="p-1.5 rounded-lg text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  <button @click="ui.openLogs(link)" :title="$t('common.viewLogs')"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button @click="ui.openEdit(link)" :title="$t('common.edit')"
                    class="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="handleDelete(link._id)" :title="$t('common.delete')"
                    class="p-1.5 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="filteredLinks.length > 0" class="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-slate-700 gap-4">
        <!-- Left: total -->
        <span class="text-sm font-medium text-gray-600 dark:text-slate-400 shrink-0">
          {{ $t('urls.total', { n: filteredLinks.length }) }}
        </span>
        <!-- Center: page buttons -->
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="currentPage--"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            @click="currentPage = p"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
            :class="p === currentPage
              ? 'bg-indigo-100 dark:bg-blue-900/40 text-indigo-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700'"
          >{{ p }}</button>
          <button
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <!-- Right: per-page -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-sm text-gray-500 dark:text-slate-500">{{ $t('common.showPerPage') }}</span>
          <div class="w-20">
            <AppSelect
              v-model="pageSize"
              @change="currentPage = 1"
              :options="[
                { value: 5,  label: '5' },
                { value: 10, label: '10' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
              ]"
              trigger-class="!py-1.5 !text-sm !px-2.5"
            />
          </div>
        </div>
      </div>
    </div>

  <!-- Analytics Modal -->
  <LinkAnalyticsModal
    v-if="analyticsLink"
    :link="analyticsLink"
    @close="analyticsLink = null"
  />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLinksStore } from '../stores/links';
import { useUIStore } from '../stores/ui';
import { useToast } from '../composables/useToast';
import AppSelect from '../components/AppSelect.vue';
import LinkAnalyticsModal from '../components/LinkAnalyticsModal.vue';

const { t } = useI18n();
const store = useLinksStore();
const ui = useUIStore();
const toast = useToast();

const baseShortUrl = import.meta.env.VITE_BASE_SHORT_URL || '';
const search = ref('');
const activeFilter = ref('all');
const currentPage = ref(1);
const pageSize = ref(5);
const sortDesc = ref(true);
const copied = ref(null);
const analyticsLink = ref(null);


const isExpired = (link) => !!link.expiresAt && new Date(link.expiresAt) < new Date();

const linkStatus = (link) => {
  if (isExpired(link)) {
    return {
      label: t('common.expired'),
      cls: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40',
      dotCls: '',
    };
  }
  if (!link.isActive) {
    return {
      label: t('common.inactive'),
      cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dotCls: 'bg-gray-400 dark:bg-slate-500',
    };
  }
  return {
    label: t('common.active'),
    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/40',
    dotCls: 'bg-green-500 dark:bg-green-400',
  };
};

const filteredLinks = computed(() => {
  const now = new Date();
  let list = store.links.filter((link) => {
    if (search.value) {
      const q = search.value.toLowerCase();
      if (!link.code.toLowerCase().includes(q) &&
          !link.destinationUrl?.toLowerCase().includes(q) &&
          !(link.title || '').toLowerCase().includes(q)) return false;
    }
    const expired = link.expiresAt && new Date(link.expiresAt) < now;
    if (activeFilter.value === 'active')   return link.isActive && !expired;
    if (activeFilter.value === 'inactive') return !link.isActive && !expired;
    if (activeFilter.value === 'expired')  return !!expired;
    return true;
  });

  list = [...list].sort((a, b) => {
    const diff = new Date(b.createdAt) - new Date(a.createdAt);
    return sortDesc.value ? diff : -diff;
  });
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLinks.value.length / pageSize.value)));

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  const range = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) range.push(i);
  return range;
});

const pagedLinks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredLinks.value.slice(start, start + pageSize.value);
});

const paginationInfo = computed(() => {
  const total = filteredLinks.value.length;
  if (total === 0) return '0 items';
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = Math.min(currentPage.value * pageSize.value, total);
  return t('common.showing', { start, end, total });
});

const toggleSort = () => { sortDesc.value = !sortDesc.value; };

const copyLink = async (code) => {
  await navigator.clipboard.writeText(`${baseShortUrl}/${code}`);
  copied.value = code;
  toast.success(t('urls.copied'));
  setTimeout(() => { copied.value = null; }, 2000);
};

const handleDelete = async (id) => {
  if (!confirm(t('urls.deleteConfirm'))) return;
  try {
    await store.deleteLink(id);
    toast.success(t('urls.deleted'));
  } catch {
    toast.error(t('urls.deleteFailed'));
  }
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

const getFaviconUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
};

onMounted(() => store.fetchLinks());
</script>

<style scoped>
.shorten-btn {
  position: relative;
  overflow: hidden;
}

.shorten-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 100%
  );
  transform: skewX(-20deg);
  transition: none;
  pointer-events: none;
}

.shorten-btn:hover::after {
  left: 140%;
  transition: left 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
