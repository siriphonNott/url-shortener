<template>
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-gray-50 dark:bg-slate-950 rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in-modal">

      <!-- Header -->
      <div class="bg-white dark:bg-slate-900 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-800 rounded-t-2xl shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
            <svg class="w-4.5 h-4.5 text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">
              {{ data?.link?.title || link.code }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{{ baseShortUrl }}/{{ link.code }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="overflow-y-auto flex-1 p-5 space-y-4">

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <template v-else-if="data">
          <!-- Stat cards -->
          <div class="grid grid-cols-3 gap-3">
            <div v-for="card in statCards" :key="card.label"
              class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-gray-700 dark:text-slate-300 font-medium">{{ card.label }}</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{{ card.value.toLocaleString() }}</p>
                </div>
                <div :class="`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm shrink-0`">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.icon" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100">{{ $t('dashboard.engagementTimeline') }}</h4>
              <span class="text-xs text-gray-500 dark:text-slate-400">{{ $t('dashboard.last7Days') }}</span>
            </div>
            <div class="h-40">
              <Bar v-if="timelineChartData" :data="timelineChartData" :options="chartOptions" />
              <div v-else class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-slate-500">{{ $t('common.noData') }}</div>
            </div>
          </div>

          <!-- Device + Traffic type -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Device -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
              <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-4">{{ $t('dashboard.trafficByDevice') }}</h4>
              <div class="flex flex-col items-center">
                <div class="h-36 w-full max-w-[160px]">
                  <Doughnut v-if="deviceChartData" :data="deviceChartData" :options="doughnutOptions" />
                  <div v-else class="h-full flex items-center justify-center text-xs text-gray-500 dark:text-slate-500">{{ $t('common.noData') }}</div>
                </div>
                <div v-if="groupedDevices?.length" class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                  <div v-for="d in groupedDevices" :key="d.name" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: DEVICE_COLORS[d.name] ?? '#9ca3af' }" />
                    <span>{{ d.name }}</span>
                    <span class="text-gray-500 dark:text-slate-500">{{ d.count }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Traffic type -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
              <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-4">{{ $t('dashboard.trafficByType') }}</h4>
              <div class="flex flex-col items-center">
                <div class="h-36 w-full max-w-[160px]">
                  <Doughnut v-if="trafficChartData" :data="trafficChartData" :options="doughnutOptions" />
                  <div v-else class="h-full flex items-center justify-center text-xs text-gray-500 dark:text-slate-500">{{ $t('common.noData') }}</div>
                </div>
                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                  <div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" />{{ $t('dashboard.directClicks') }}
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-violet-400 shrink-0" />Referral
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Locations -->
          <div v-if="data.locations?.countries?.length" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100">{{ $t('dashboard.locations') }}</h4>
              <div class="flex gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button v-for="tab in ['countries', 'cities']" :key="tab"
                  @click="locationTab = tab"
                  class="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
                  :class="locationTab === tab
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-700 dark:text-slate-300 hover:text-gray-700'"
                >{{ tab === 'countries' ? $t('dashboard.countries') : $t('dashboard.cities') }}</button>
              </div>
            </div>
            <div class="space-y-2.5">
              <div v-for="(row, i) in locationRows" :key="row.name" class="flex items-center gap-3">
                <span class="text-xs text-gray-500 dark:text-slate-500 w-4 text-right shrink-0">{{ i + 1 }}</span>
                <span class="text-sm font-medium text-gray-800 dark:text-slate-200 w-28 shrink-0 truncate">{{ row.name }}</span>
                <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full bg-blue-500" :style="{ width: row.percent + '%' }" />
                </div>
                <span class="text-xs text-gray-600 dark:text-slate-400 w-6 text-right shrink-0">{{ row.count }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'vue-chartjs';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const props = defineProps({ link: Object });
defineEmits(['close']);
const { t } = useI18n();

const baseShortUrl = import.meta.env.VITE_BASE_SHORT_URL || '';
const data = ref(null);
const loading = ref(true);
const locationTab = ref('countries');

const DEVICE_COLORS = { Desktop: '#3b82f6', Mobile: '#06b6d4', Tablet: '#8b5cf6' };

onMounted(async () => {
  try {
    const res = await api.get(`/links/${props.link._id}/analytics`);
    data.value = res.data;
  } finally {
    loading.value = false;
  }
});

const weekClicks = computed(() => data.value?.timeline?.reduce((s, d) => s + d.clicks, 0) ?? 0);

const statCards = computed(() => [
  {
    label: t('dashboard.totalClicks'),
    value: data.value?.link?.totalClicks ?? 0,
    color: 'from-blue-500 to-indigo-500',
    icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
  },
  {
    label: t('dashboard.visits') + ' (7d)',
    value: weekClicks.value,
    color: 'from-violet-500 to-purple-500',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    label: 'Direct Clicks',
    value: data.value?.trafficType?.direct ?? 0,
    color: 'from-emerald-500 to-teal-500',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
]);

const timelineChartData = computed(() => {
  const t = data.value?.timeline;
  if (!t?.length) return null;
  return {
    labels: t.map((d) => d.date.slice(5)),
    datasets: [{ label: 'Clicks', data: t.map((d) => d.clicks), backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.6 }],
  };
});

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(156,163,175,0.15)' }, ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 1 } },
  },
};

const groupedDevices = computed(() => {
  const devices = data.value?.devices;
  if (!devices?.length) return null;
  const groups = { Desktop: 0, Mobile: 0, Tablet: 0 };
  for (const d of devices) {
    const os = d.name.split(' / ')[1] || '';
    if (os === 'iPadOS') groups.Tablet += d.count;
    else if (os === 'iOS' || os === 'Android') groups.Mobile += d.count;
    else groups.Desktop += d.count;
  }
  return Object.entries(groups).filter(([, c]) => c > 0).map(([name, count]) => ({ name, count }));
});

const deviceChartData = computed(() => {
  const gd = groupedDevices.value;
  if (!gd?.length) return null;
  return {
    labels: gd.map((d) => d.name),
    datasets: [{ data: gd.map((d) => d.count), backgroundColor: gd.map((d) => DEVICE_COLORS[d.name] ?? '#9ca3af'), borderWidth: 0, hoverOffset: 4 }],
  };
});

const trafficChartData = computed(() => {
  const tt = data.value?.trafficType;
  if (!tt || tt.direct + tt.referral === 0) return null;
  return {
    labels: ['Direct', 'Referral'],
    datasets: [{ data: [tt.direct, tt.referral], backgroundColor: ['#3b82f6', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }],
  };
});

const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

const locationRows = computed(() => {
  if (!data.value?.locations) return [];
  return locationTab.value === 'countries'
    ? (data.value.locations.countries || [])
    : (data.value.locations.cities || []);
});
</script>
