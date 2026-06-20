<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950 overflow-x-hidden transition-colors duration-300">

    <!-- Background blobs -->
    <div class="blob blob-1 fixed w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none bg-blue-400/20 dark:bg-blue-600/8 top-0 right-0 -translate-y-1/3 translate-x-1/3" />
    <div class="blob blob-2 fixed w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none bg-violet-400/15 dark:bg-violet-600/8 bottom-0 left-0 translate-y-1/3 -translate-x-1/4" />
    <div class="blob blob-3 fixed w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none bg-cyan-300/10 dark:bg-cyan-500/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

    <!-- ─── NAVBAR ─── -->
    <nav class="relative z-50 flex items-center justify-between px-6 lg:px-12 py-5 nav-enter">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Blly.to</span>
      </div>
      <div class="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
        <a
          :href="loginUrl"
          class="shine-btn relative overflow-hidden flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:-translate-y-px"
        >
          {{ $t('auth.login') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </nav>

    <!-- ─── HERO ─── -->
    <section class="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-24 lg:pt-20 lg:pb-32">

      <!-- Badge -->
      <div class="badge-enter inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full mb-8 uppercase tracking-wider">
        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        {{ $t('landing.badge') }}
      </div>

      <!-- Headline -->
      <h1 class="hero-title max-w-3xl text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6">
        {{ $t('landing.heroTitle') }}
        <span class="bg-gradient-to-r from-blue-600 via-violet-600 to-blue-500 bg-clip-text text-transparent">{{ $t('landing.heroGradient') }}</span>
        <br />{{ $t('landing.heroEnd') }}
      </h1>

      <!-- Subtitle -->
      <p class="hero-sub max-w-xl text-lg text-gray-500 dark:text-slate-400 leading-relaxed mb-10">
        {{ $t('landing.heroSub') }}
      </p>

      <!-- CTAs -->
      <div class="hero-cta flex items-center gap-4 flex-wrap justify-center">
        <a
          :href="signupUrl"
          class="shine-btn relative overflow-hidden flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-base"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('landing.ctaPrimary') }}
        </a>
        <a
          href="#features"
          class="flex items-center gap-2 text-gray-600 dark:text-slate-300 font-semibold px-6 py-4 rounded-2xl border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800/80 transition-all duration-200 text-base hover:-translate-y-0.5"
        >
          {{ $t('landing.ctaSecondary') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>

      <!-- URL demo card -->
      <div class="hero-card mt-16 w-full max-w-2xl">
        <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-700/60 rounded-3xl shadow-2xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
          <div class="h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-blue-600" />
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex gap-1.5">
                <span class="w-3 h-3 rounded-full bg-red-400" />
                <span class="w-3 h-3 rounded-full bg-yellow-400" />
                <span class="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 dark:text-slate-500 font-mono">
                blly.to/dashboard
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-400 dark:text-slate-500 font-mono truncate">
                https://www.example.com/very-long-url-that-nobody-wants-to-type...
              </div>
              <div class="shrink-0 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold px-4 py-3 rounded-xl">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Shorten
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3">
              <span class="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">blly.to/<span class="text-violet-600 dark:text-violet-400">my-link</span></span>
              <span class="text-xs text-blue-400 dark:text-blue-500 font-medium">{{ $t('landing.demoReady') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── STATS BAR ─── -->
    <section class="relative z-10 px-6 lg:px-12 pb-20" ref="statsRef">
      <div
        class="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4"
        :class="{ 'section-visible': statsVisible }"
      >
        <div v-for="(stat, i) in stats" :key="i"
          class="stat-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/60 rounded-2xl p-5 text-center shadow-sm"
          :style="`animation-delay: ${i * 0.08}s`"
        >
          <div class="text-3xl font-extrabold bg-gradient-to-br from-blue-600 to-violet-600 bg-clip-text text-transparent mb-1">{{ stat.value }}</div>
          <div class="text-sm text-gray-500 dark:text-slate-400 font-medium">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- ─── FEATURES ─── -->
    <section id="features" class="relative z-10 px-6 lg:px-12 pb-24" ref="featuresRef">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14" :class="{ 'section-visible': featuresVisible }">
          <div class="section-fade inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <div class="h-px w-8 bg-blue-500" />
            {{ $t('landing.featuresSection') }}
            <div class="h-px w-8 bg-blue-500" />
          </div>
          <h2 class="section-fade text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight" style="animation-delay:0.1s">
            {{ $t('landing.featuresTitle') }}<br />
            <span class="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{{ $t('landing.featuresSubtitle') }}</span>
          </h2>
        </div>

        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          :class="{ 'section-visible': featuresVisible }"
        >
          <div v-for="(feat, i) in features" :key="i"
            class="feature-card group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
            :style="`animation-delay: ${i * 0.07}s`"
          >
            <div :class="`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feat.iconBg}`">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feat.iconD" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 mb-2">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── HOW IT WORKS ─── -->
    <section class="relative z-10 px-6 lg:px-12 pb-24" ref="stepsRef">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-14" :class="{ 'section-visible': stepsVisible }">
          <div class="section-fade inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">
            <div class="h-px w-8 bg-violet-500" />
            {{ $t('landing.howSection') }}
            <div class="h-px w-8 bg-violet-500" />
          </div>
          <h2 class="section-fade text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight" style="animation-delay:0.1s">
            {{ $t('landing.howTitle') }} <span class="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">{{ $t('landing.howGradient') }}</span>
          </h2>
        </div>

        <div class="relative" :class="{ 'section-visible': stepsVisible }">
          <!-- Connector line -->
          <div class="hidden lg:block absolute top-9 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-blue-300 via-violet-300 to-blue-300 dark:from-blue-700 dark:via-violet-700 dark:to-blue-700" />

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div v-for="(step, i) in steps" :key="i"
              class="step-card flex flex-col items-center text-center"
              :style="`animation-delay: ${i * 0.12}s`"
            >
              <div class="relative w-16 h-16 mb-5">
                <div :class="`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shadow-lg ${step.bg}`">
                  {{ i + 1 }}
                </div>
              </div>
              <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 mb-2">{{ step.title }}</h3>
              <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── API SECTION ─── -->
    <section class="relative z-10 px-6 lg:px-12 pb-24" ref="apiRef">
      <div class="max-w-5xl mx-auto" :class="{ 'section-visible': apiVisible }">
        <div class="api-card bg-slate-900 dark:bg-slate-950 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20">
          <div class="h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500" />
          <div class="grid lg:grid-cols-2 gap-0">
            <!-- Left: info -->
            <div class="p-10 lg:p-14 flex flex-col justify-center">
              <div class="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 w-fit">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {{ $t('landing.apiSection') }}
              </div>
              <h2 class="text-3xl font-extrabold text-white mb-4 leading-tight">
                {{ $t('landing.apiTitle') }}<br />
                <span class="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{{ $t('landing.apiGradient') }}</span>
              </h2>
              <p class="text-slate-400 text-sm leading-relaxed mb-8">
                {{ $t('landing.apiSub') }}
              </p>
              <div class="flex flex-col gap-3">
                <div v-for="(item, i) in apiFeatures" :key="i" class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span class="text-sm text-slate-300">{{ item }}</span>
                </div>
              </div>
            </div>

            <!-- Right: code block -->
            <div class="p-6 lg:p-8 flex items-center bg-slate-950/50 border-l border-slate-800/50">
              <div class="w-full">
                <div class="flex items-center gap-2 mb-4">
                  <div class="flex gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-red-500/60" />
                    <span class="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <span class="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span class="text-slate-500 text-xs ml-2 font-mono">POST /api/v1/shorten</span>
                </div>
                <pre class="text-sm font-mono leading-relaxed overflow-x-auto"><code><span class="text-slate-500"># สร้าง Short Link</span>
<span class="text-violet-400">curl</span> <span class="text-slate-300">-X POST https://blly.to/api/v1/shorten</span>
  <span class="text-blue-400">-H</span> <span class="text-emerald-400">"X-API-Key: your_api_key"</span>
  <span class="text-blue-400">-H</span> <span class="text-emerald-400">"Content-Type: application/json"</span>
  <span class="text-blue-400">-d</span> <span class="text-yellow-300">'{
    "destinationUrl": "https://example.com/long",
    "code": "my-link"
  }'</span>

<span class="text-slate-500"># Response</span>
<span class="text-slate-300">{</span>
  <span class="text-blue-400">"shortUrl"</span><span class="text-slate-300">:</span> <span class="text-emerald-400">"https://blly.to/my-link"</span><span class="text-slate-300">,</span>
  <span class="text-blue-400">"code"</span><span class="text-slate-300">:</span> <span class="text-emerald-400">"my-link"</span>
<span class="text-slate-300">}</span></code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA ─── -->
    <section class="relative z-10 px-6 lg:px-12 pb-24" ref="ctaRef">
      <div class="max-w-3xl mx-auto text-center" :class="{ 'section-visible': ctaVisible }">
        <div class="cta-card bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 rounded-3xl p-12 lg:p-16 shadow-2xl shadow-blue-500/30 overflow-hidden relative">
          <!-- Glow overlay -->
          <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div class="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl" />
          <div class="relative z-10">
            <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 class="text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight">
              {{ $t('landing.ctaTitle') }}
            </h2>
            <p class="text-blue-100 mb-8 max-w-md mx-auto leading-relaxed">
              {{ $t('landing.ctaSub') }}
            </p>
            <a
              :href="loginUrl"
              class="inline-flex items-center gap-2 bg-white text-blue-600 font-extrabold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-base"
            >
              {{ $t('landing.ctaBtn') }}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── FOOTER ─── -->
    <footer class="relative z-10 border-t border-gray-200 dark:border-slate-800 px-6 lg:px-12 py-8">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span class="font-bold text-gray-700 dark:text-slate-300 text-sm">Blly.to</span>
        </div>
        <p class="text-xs text-gray-400 dark:text-slate-600">
          {{ $t('landing.copyright') }}
        </p>
        <a :href="loginUrl" class="text-xs text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium">
          {{ $t('landing.signIn') }}
        </a>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import { useTheme } from '../composables/useTheme';

const { init: initTheme } = useTheme();
const { t } = useI18n();

// Landing is served on the apex (eraflow.dev) while the app lives on a separate host;
// send login/CTA to the app domain (VITE_APP_URL), falling back to a same-origin /login in dev.
const loginUrl = (import.meta.env.VITE_APP_URL || '') + '/login';
const signupUrl = (import.meta.env.VITE_APP_URL || '') + '/signup';

const stats = computed(() => [
  { value: t('landing.statFastValue'), label: t('landing.statFast') },
  { value: t('landing.statCustomValue'), label: t('landing.statCustomLabel') },
  { value: t('landing.statAnalyticsValue'), label: t('landing.statAnalyticsLabel') },
  { value: t('landing.statApiValue'), label: t('landing.statApiLabel') },
]);

const features = computed(() => [
  {
    title: t('landing.feat1Title'),
    desc: t('landing.feat1Desc'),
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconD: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
  {
    title: t('landing.feat2Title'),
    desc: t('landing.feat2Desc'),
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    iconD: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    title: t('landing.feat3Title'),
    desc: t('landing.feat3Desc'),
    iconBg: 'bg-gradient-to-br from-orange-500 to-pink-500',
    iconD: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: t('landing.feat4Title'),
    desc: t('landing.feat4Desc'),
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    iconD: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    title: t('landing.feat5Title'),
    desc: t('landing.feat5Desc'),
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500',
    iconD: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
  },
  {
    title: t('landing.feat6Title'),
    desc: t('landing.feat6Desc'),
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    iconD: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
]);

const steps = computed(() => [
  {
    title: t('landing.step1Title'),
    desc: t('landing.step1Desc'),
    bg: 'bg-gradient-to-br from-blue-600 to-violet-600',
  },
  {
    title: t('landing.step2Title'),
    desc: t('landing.step2Desc'),
    bg: 'bg-gradient-to-br from-violet-600 to-pink-500',
  },
  {
    title: t('landing.step3Title'),
    desc: t('landing.step3Desc'),
    bg: 'bg-gradient-to-br from-pink-500 to-orange-500',
  },
]);

const apiFeatures = computed(() => [
  t('landing.apiBullet1'),
  t('landing.apiBullet2'),
  t('landing.apiBullet3'),
  t('landing.apiBullet4'),
]);

// Intersection Observer for scroll reveal
const statsRef = ref(null);
const featuresRef = ref(null);
const stepsRef = ref(null);
const apiRef = ref(null);
const ctaRef = ref(null);

const statsVisible = ref(false);
const featuresVisible = ref(false);
const stepsVisible = ref(false);
const apiVisible = ref(false);
const ctaVisible = ref(false);

let observer;

onMounted(() => {
  initTheme();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target === statsRef.value) statsVisible.value = true;
        if (entry.target === featuresRef.value) featuresVisible.value = true;
        if (entry.target === stepsRef.value) stepsVisible.value = true;
        if (entry.target === apiRef.value) apiVisible.value = true;
        if (entry.target === ctaRef.value) ctaVisible.value = true;
      });
    },
    { threshold: 0.1 }
  );

  [statsRef, featuresRef, stepsRef, apiRef, ctaRef].forEach((r) => {
    if (r.value) observer.observe(r.value);
  });
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
/* ── Navbar ── */
.nav-enter { animation: fadeDown 0.5s 0.1s ease-out both; }
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Hero ── */
.badge-enter  { animation: fadeUp 0.5s 0.15s ease-out both; }
.hero-title   { animation: fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both; }
.hero-sub     { animation: fadeUp 0.5s 0.38s ease-out both; }
.hero-cta     { animation: fadeUp 0.5s 0.48s ease-out both; }
.hero-card    { animation: fadeUp 0.7s 0.55s cubic-bezier(0.16,1,0.3,1) both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Scroll reveal: stat cards ── */
.stat-card, .feature-card, .step-card, .api-card, .cta-card, .section-fade {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.16,1,0.3,1);
}
.section-visible .stat-card,
.section-visible .feature-card,
.section-visible .step-card,
.section-visible .section-fade {
  opacity: 1;
  transform: translateY(0);
}
.section-visible .api-card {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.05s;
}
.section-visible .cta-card {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.05s;
}

/* Shine button */
.shine-btn::after {
  content: '';
  position: absolute;
  top: 0; left: -75%;
  width: 50%; height: 100%;
  background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%);
  transform: skewX(-20deg);
  pointer-events: none;
}
.shine-btn:hover::after {
  left: 140%;
  transition: left 0.55s cubic-bezier(0.4,0,0.2,1);
}

/* Blobs */
.blob { animation: blobFloat 9s ease-in-out infinite; }
.blob-2 { animation-delay: -4s; animation-duration: 11s; }
.blob-3 { animation-delay: -7s; animation-duration: 13s; }
@keyframes blobFloat {
  0%, 100% { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1); }
  50%       { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1.07); }
}
</style>
