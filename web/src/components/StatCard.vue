<template>
  <div
    ref="cardRef"
    class="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-5 overflow-visible"
  >
    <!-- Title row + Icon -->
    <div class="flex items-start justify-between mb-2">
      <p class="text-sm font-medium text-gray-700 dark:text-slate-300">{{ title }}</p>
      <!-- Icon -->
      <div
        class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2"
        :class="iconClasses"
      >
        <!-- green: add/link icon -->
        <template v-if="color === 'green'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </template>
        <!-- blue: cursor/visit icon -->
        <template v-else-if="color === 'blue'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
        </template>
        <!-- indigo: bar chart icon -->
        <template v-else>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </template>
      </div>
    </div>

    <!-- Number + Sparkline row -->
    <div class="flex items-end gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-3xl font-bold text-gray-900 dark:text-slate-100 leading-none">
          {{ value.toLocaleString() }}
        </p>
        <p class="text-xs text-gray-500 dark:text-slate-500 mt-2">last 7 days</p>
      </div>
      <div ref="canvasWrapRef" class="w-28 h-14 shrink-0">
        <canvas ref="canvasRef" />
      </div>
    </div>

    <!-- Tooltip -->
    <Transition
      enter-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="tooltipState.visible"
        class="absolute z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 pointer-events-none min-w-[130px]"
        :style="tooltipStyle"
      >
        <p class="text-xs font-semibold text-gray-700 dark:text-slate-200">{{ tooltipState.date }}</p>
        <p class="text-xs text-gray-600 dark:text-slate-400 mt-1">
          {{ labelUnit }}&nbsp;<span class="font-bold text-gray-800 dark:text-slate-100">{{ tooltipState.value }}</span>
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const props = defineProps({
  title: String,
  value: { type: Number, default: 0 },
  sparkline: { type: Array, default: () => [] },
  dates: { type: Array, default: () => [] },
  labelUnit: { type: String, default: 'Value' },
  color: { type: String, default: 'blue' },
});

const COLORS = {
  green:  { border: '#22c55e', bg: 'rgba(34,197,94,0.10)',  icon: 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' },
  blue:   { border: '#3b82f6', bg: 'rgba(59,130,246,0.10)', icon: 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  indigo: { border: '#6366f1', bg: 'rgba(99,102,241,0.10)', icon: 'border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' },
};

const iconClasses = computed(() => COLORS[props.color]?.icon ?? COLORS.blue.icon);

const cardRef = ref(null);
const canvasRef = ref(null);
const canvasWrapRef = ref(null);
let chart = null;

const tooltipState = reactive({ visible: false, x: 0, y: 0, date: '', value: 0 });

const tooltipStyle = computed(() => ({
  left: `${tooltipState.x}px`,
  top: `${tooltipState.y}px`,
  transform: 'translateX(-50%)',
}));

const formatTooltipDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const externalTooltip = ({ chart: c, tooltip }) => {
  if (tooltip.opacity === 0) { tooltipState.visible = false; return; }
  if (!cardRef.value || !canvasRef.value) return;

  const cardRect = cardRef.value.getBoundingClientRect();
  const canvasRect = canvasRef.value.getBoundingClientRect();

  const x = (canvasRect.left - cardRect.left) + tooltip.caretX;
  const y = (canvasRect.top - cardRect.top) + tooltip.caretY - 72;

  const idx = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
  tooltipState.x = x;
  tooltipState.y = y;
  tooltipState.date = formatTooltipDate(props.dates[idx]);
  tooltipState.value = tooltip.dataPoints?.[0]?.raw ?? 0;
  tooltipState.visible = true;
};

const buildChart = () => {
  if (!canvasRef.value) return;
  if (chart) { chart.destroy(); chart = null; }

  const c = COLORS[props.color] ?? COLORS.blue;
  const data = props.sparkline.length ? props.sparkline : Array(7).fill(0);
  const labels = data.map((_, i) => i);

  chart = new ChartJS(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: c.border,
        backgroundColor: c.bg,
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 4,
        pointBackgroundColor: c.border,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
        fill: true,
        tension: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltip,
        },
      },
      scales: { x: { display: false }, y: { display: false } },
      animation: false,
    },
  });
};

onMounted(buildChart);
watch(() => [props.sparkline, props.dates], buildChart, { deep: true });
onBeforeUnmount(() => { if (chart) chart.destroy(); });
</script>
