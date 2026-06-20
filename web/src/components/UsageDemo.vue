<template>
  <div
    class="usage-demo bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-700/60 rounded-3xl shadow-2xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div class="h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-blue-600" aria-hidden="true" />

    <!-- Browser chrome -->
    <div class="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-slate-800" aria-hidden="true">
      <div class="flex gap-1.5">
        <span class="w-3 h-3 rounded-full bg-red-400" />
        <span class="w-3 h-3 rounded-full bg-yellow-400" />
        <span class="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 dark:text-slate-500 font-mono truncate">
        {{ sceneUrl }}
      </div>
    </div>

    <!-- Step tabs -->
    <div class="px-4 sm:px-5 pt-4">
      <div class="flex gap-1.5 sm:gap-2">
        <button
          v-for="(s, i) in scenes" :key="i"
          type="button"
          @click="goTo(i)"
          :aria-current="i === scene ? 'step' : undefined"
          class="flex-1 flex items-center justify-center sm:justify-start gap-2 rounded-xl px-2.5 sm:px-3 py-2 transition-colors duration-200"
          :class="i === scene
            ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/30'
            : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'"
        >
          <span
            class="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-extrabold transition-colors duration-200"
            :class="i === scene
              ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'"
          >{{ i + 1 }}</span>
          <span
            class="hidden sm:block text-xs font-bold truncate transition-colors duration-200"
            :class="i === scene ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-slate-400'"
          >{{ s.tab }}</span>
        </button>
      </div>

      <!-- Progress -->
      <div class="mt-3 h-1 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
        <div
          :key="scene"
          class="progress-fill h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
          :style="{ animationDuration: scenes[scene].dwell + 's', animationPlayState: barPlayState }"
          @animationend="onProgressEnd"
        />
      </div>
    </div>

    <!-- Scene stage -->
    <div class="relative px-4 sm:px-6 py-5 min-h-[300px] sm:min-h-[290px]">
      <div :key="scene" class="scene">

        <!-- ── Scene 1: Paste & Shorten ── -->
        <template v-if="scene === 0">
          <div class="space-y-4">
            <div>
              <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5">{{ t('landing.demoDestLabel') }}</div>
              <div class="paste-flash flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-3">
                <svg class="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span class="text-sm text-gray-600 dark:text-slate-300 font-mono truncate">{{ longUrl }}</span>
              </div>
            </div>

            <div>
              <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5">{{ t('landing.demoCodeLabel') }}</div>
              <div class="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-3">
                <span class="text-sm text-gray-400 dark:text-slate-500 font-mono">blly.to/</span>
                <span class="typed text-sm text-violet-600 dark:text-violet-400 font-mono font-semibold">my-link</span>
              </div>
            </div>

            <div class="btn-press shine-btn relative overflow-hidden flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold px-4 py-3 rounded-xl shadow-lg shadow-blue-500/25">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {{ t('landing.demoShortenBtn') }}
            </div>
          </div>
        </template>

        <!-- ── Scene 2: Get & Copy Short Link ── -->
        <template v-else-if="scene === 1">
          <div class="flex flex-col items-center justify-center h-full text-center pt-2">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 check-pop">
              <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">{{ t('landing.demoResultLabel') }}</div>

            <div class="result-in relative flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl pl-4 pr-2 py-2.5 w-full max-w-sm">
              <span class="flex-1 text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 font-mono truncate text-left">blly.to/<span class="text-violet-600 dark:text-violet-400">my-link</span></span>
              <span class="shrink-0 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-600 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {{ t('landing.demoCopy') }}
              </span>

              <!-- Copied toast -->
              <div class="toast-in absolute -top-3 right-2 flex items-center gap-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                {{ t('landing.demoCopied') }}
              </div>
            </div>

            <p class="mt-4 text-xs text-gray-500 dark:text-slate-500 max-w-xs">{{ t('landing.demoShareHint') }}</p>
          </div>
        </template>

        <!-- ── Scene 3: View Analytics ── -->
        <template v-else>
          <div>
            <div class="flex items-end justify-between mb-4">
              <div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">{{ t('landing.demoClicksLabel') }}</div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold bg-gradient-to-br from-blue-600 to-violet-600 bg-clip-text text-transparent tabular-nums">{{ clicksText }}</span>
                  <span class="chip-in inline-flex items-center gap-0.5 text-emerald-500 text-xs font-bold">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" /></svg>
                    12%
                  </span>
                </div>
              </div>
              <div class="text-[11px] font-medium text-gray-400 dark:text-slate-500">{{ t('landing.demoTrendLabel') }}</div>
            </div>

            <!-- Bar chart -->
            <div class="flex items-end justify-between gap-2 h-24 mb-5">
              <div v-for="(h, i) in bars" :key="i" class="flex-1 flex items-end h-full">
                <div
                  class="bar w-full rounded-t-md bg-gradient-to-t from-blue-500 to-violet-500"
                  :style="{ height: h + '%', animationDelay: (0.1 + i * 0.07) + 's' }"
                />
              </div>
            </div>

            <!-- Device + Geo chips -->
            <div class="grid grid-cols-2 gap-3">
              <div class="chip-in flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5" style="animation-delay:0.5s">
                <div class="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" /></svg>
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-bold text-gray-900 dark:text-slate-100">64%</div>
                  <div class="text-[11px] text-gray-500 dark:text-slate-400 truncate">{{ t('landing.demoDeviceLabel') }}</div>
                </div>
              </div>
              <div class="chip-in flex items-center gap-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5" style="animation-delay:0.62s">
                <div class="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0 text-base">🇹🇭</div>
                <div class="min-w-0">
                  <div class="text-sm font-bold text-gray-900 dark:text-slate-100">38%</div>
                  <div class="text-[11px] text-gray-500 dark:text-slate-400 truncate">{{ t('landing.demoGeoLabel') }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  active: { type: Boolean, default: false },
});

const { t } = useI18n();

const longUrl = 'https://example.com/blog/ultimate-growth-guide-2026';
const bars = [42, 68, 54, 83, 61, 96, 74];

const scene = ref(0);
const paused = ref(false);
const reduced = ref(false);
const clicks = ref(0);

const scenes = computed(() => [
  { tab: t('landing.demoStep1Tab'), url: 'app.blly.to/new', dwell: 4 },
  { tab: t('landing.demoStep2Tab'), url: 'app.blly.to/links', dwell: 3.2 },
  { tab: t('landing.demoStep3Tab'), url: 'app.blly.to/dashboard', dwell: 5 },
]);
const sceneUrl = computed(() => scenes.value[scene.value].url);
const clicksText = computed(() => clicks.value.toLocaleString('en-US'));

// Progress bar drives auto-advance via its animationend; pause it when off-screen,
// hovered, or when the user prefers reduced motion.
const barPlayState = computed(() =>
  props.active && !paused.value && !reduced.value ? 'running' : 'paused'
);

function onProgressEnd(e) {
  if (e.animationName !== 'demoProgress' || reduced.value) return;
  scene.value = (scene.value + 1) % scenes.value.length;
}

function goTo(i) {
  scene.value = i;
}

// Count-up for the analytics scene (rAF, eased), respecting reduced motion.
const CLICK_TARGET = 1248;
let rafId = 0;

function animateClicks() {
  cancelAnimationFrame(rafId);
  if (reduced.value) { clicks.value = CLICK_TARGET; return; }
  clicks.value = 0;
  const duration = 1400;
  let start = null;
  const step = (ts) => {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    clicks.value = Math.round(eased * CLICK_TARGET);
    if (p < 1) rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

watch(scene, (val) => {
  if (val === 2 && props.active) animateClicks();
  else { cancelAnimationFrame(rafId); clicks.value = 0; }
});

watch(() => props.active, (a) => {
  if (a && scene.value === 2) animateClicks();
});

let mq;
function onMq(e) { reduced.value = e.matches; }

onMounted(() => {
  mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced.value = mq.matches;
  mq.addEventListener?.('change', onMq);
});

onUnmounted(() => {
  mq?.removeEventListener?.('change', onMq);
  cancelAnimationFrame(rafId);
});
</script>

<style scoped>
/* Scene entrance */
.scene { animation: demoSceneIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes demoSceneIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Progress bar — duration + play-state set inline */
.progress-fill {
  width: 0;
  animation-name: demoProgress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes demoProgress { from { width: 0; } to { width: 100%; } }

/* Scene 1 — paste flash on the destination URL */
.paste-flash { animation: demoPaste 1s ease-out 0.15s both; }
@keyframes demoPaste {
  0%   { opacity: 0; transform: translateY(4px); background-color: rgba(59, 130, 246, 0.18); }
  55%  { opacity: 1; transform: translateY(0); }
  100% { background-color: transparent; }
}

/* Scene 1 — typing the custom code (monospace → 1ch per char) */
.typed {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: bottom;
  width: 7ch;
  border-right: 1.5px solid currentColor;
  animation:
    demoType 0.85s steps(7, end) 0.7s both,
    demoCaret 0.6s step-end 0.7s 5 both;
}
@keyframes demoType { from { width: 0; } to { width: 7ch; } }
@keyframes demoCaret { 50% { border-color: transparent; } }

/* Scene 1 — button press */
.btn-press { animation: demoPress 0.55s ease-out 2.3s both; }
@keyframes demoPress {
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(0.95); }
  72%      { transform: scale(1.03); }
}

/* Scene 2 — success check, result row, copied toast */
.check-pop { animation: demoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; }
@keyframes demoPop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }

.result-in { animation: demoResultIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
@keyframes demoResultIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.toast-in { animation: demoToast 2.6s ease-out 1.1s both; }
@keyframes demoToast {
  0%   { opacity: 0; transform: translateY(6px) scale(0.9); }
  14%  { opacity: 1; transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-2px) scale(0.96); }
}

/* Scene 3 — bars + chips */
.bar { transform-origin: bottom; animation: demoBar 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes demoBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }

.chip-in { animation: demoChip 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes demoChip {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Shine sweep on the shorten button (mirrors the landing's .shine-btn) */
.shine-btn::after {
  content: '';
  position: absolute;
  top: 0; left: -75%;
  width: 50%; height: 100%;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.28) 50%, transparent 100%);
  transform: skewX(-20deg);
  animation: demoShine 2.6s ease-in-out 1s infinite;
  pointer-events: none;
}
@keyframes demoShine {
  0%, 60% { left: -75%; }
  85%, 100% { left: 140%; }
}

/* Reduced motion — show end states, no looping/auto-advance */
@media (prefers-reduced-motion: reduce) {
  .usage-demo *,
  .usage-demo *::before,
  .usage-demo *::after {
    animation-duration: 0.001s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001s !important;
  }
  .typed { width: 7ch; border-right-color: transparent; }
  .bar { transform: scaleY(1); }
}
</style>
