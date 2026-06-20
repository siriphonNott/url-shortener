<template>
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col animate-slide-in-modal transition-colors duration-200">

      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('logModal.title') }}</h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{{ baseShortUrl }}/{{ link.code }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-150"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="overflow-auto flex-1">
        <!-- Loading -->
        <div v-if="loading" class="p-16 flex flex-col items-center gap-3 text-gray-600 dark:text-slate-400">
          <svg class="animate-spin w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm font-medium">{{ $t('logModal.loading') }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="logs.length === 0" class="p-16 flex flex-col items-center gap-3 animate-fade-in">
          <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
            <svg class="w-7 h-7 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0" />
            </svg>
          </div>
          <p class="text-gray-800 dark:text-slate-200 font-bold">{{ $t('logModal.noLogs') }}</p>
          <p class="text-sm text-gray-600 dark:text-slate-400">{{ $t('logModal.noLogsHint') }}</p>
        </div>

        <!-- Log list -->
        <div v-else class="divide-y divide-gray-200 dark:divide-slate-700/70">
          <div
            v-for="(log, index) in pagedLogs"
            :key="log._id"
            class="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors duration-100"
          >
            <!-- Number -->
            <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {{ (currentPage - 1) * PAGE_SIZE + index + 1 }}
              </span>
            </div>

            <div class="flex-1 min-w-0 space-y-1">
              <!-- Time + IP -->
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ formatDate(log.createdAt) }}</span>
                <span
                  v-if="log.ip"
                  class="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md font-medium"
                >
                  {{ log.ip }}
                </span>
              </div>
              <!-- User Agent -->
              <p class="text-xs text-gray-600 dark:text-slate-400 truncate" :title="log.userAgent">
                {{ log.userAgent || '—' }}
              </p>
              <!-- Referer -->
              <p v-if="log.referer" class="text-xs text-indigo-500 dark:text-indigo-400 truncate" :title="log.referer">
                from: {{ log.referer }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: info + pagination -->
      <div
        v-if="!loading && logs.length > 0"
        class="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 shrink-0 rounded-b-2xl"
      >
        <p class="text-sm text-gray-600 dark:text-slate-400">
          {{ $t('logModal.showingLatest', { n: logs.length }) }}
        </p>

        <!-- Pagination -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-slate-500">
            {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, logs.length) }} / {{ logs.length }}
          </span>
          <button
            :disabled="currentPage <= 1"
            @click="currentPage--"
            class="p-1.5 rounded-lg text-gray-500 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            class="p-1.5 rounded-lg text-gray-500 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useLinksStore } from '../stores/links';

const props = defineProps({ link: Object });
defineEmits(['close']);
const store = useLinksStore();

const baseShortUrl = import.meta.env.VITE_BASE_SHORT_URL;
const PAGE_SIZE = 5;

const logs = ref([]);
const loading = ref(true);
const currentPage = ref(1);

const totalPages = computed(() => Math.max(1, Math.ceil(logs.value.length / PAGE_SIZE)));

const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return logs.value.slice(start, start + PAGE_SIZE);
});

onMounted(async () => {
  logs.value = await store.getLogs(props.link._id);
  loading.value = false;
});

const formatDate = (d) =>
  new Date(d).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
</script>
