<template>
  <div class="px-4 lg:px-8 py-6 space-y-5">

    <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('apiKey.title') }}</h1>

    <!-- Info banner -->
    <div class="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl px-4 py-3.5">
      <svg class="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <p class="text-sm text-blue-700 dark:text-blue-300">{{ $t('apiKey.infoNote') }}</p>
    </div>

    <!-- API Key Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6 space-y-5">

      <div>
        <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('apiKey.yourKey') }}</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-slate-500">{{ $t('apiKey.keepSecure') }}</p>
      </div>

      <!-- Key display -->
      <div v-if="auth.apiKey" class="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
        <code
          class="flex-1 text-sm font-mono text-gray-800 dark:text-slate-200 break-all transition-all duration-200"
          :class="showKey ? 'select-all' : 'blur-sm select-none'"
        >{{ auth.apiKey }}</code>
        <button
          @click="showKey = !showKey"
          class="shrink-0 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          :title="showKey ? $t('apiKey.hide') : $t('apiKey.show')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="showKey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          @click="copyKey"
          class="shrink-0 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          :title="$t('common.copy')"
        >
          <svg v-if="copied" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <!-- Existing key (masked — the full key is shown only once at creation) -->
      <div v-else-if="auth.hasKey" class="space-y-2">
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <code class="flex-1 text-sm font-mono text-gray-800 dark:text-slate-200 break-all select-none tracking-wide">{{ maskedKey }}</code>
          <span
            v-if="auth.apiKeyStatus"
            class="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            :class="auth.apiKeyStatus === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'"
          >{{ auth.apiKeyStatus }}</span>
        </div>
        <p class="text-xs text-gray-400 dark:text-slate-600">{{ $t('apiKey.maskedNote') }}</p>
      </div>

      <!-- No key yet -->
      <div v-else-if="!loading" class="bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl px-4 py-6 text-center">
        <p class="text-sm text-gray-500 dark:text-slate-400">{{ $t('apiKey.noKey') }}</p>
      </div>

      <!-- Generate / Regenerate -->
      <div v-if="loading" class="w-full h-11 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
      <button
        v-else
        @click="handleRegenerate"
        :disabled="regenerating"
        :class="hasOrFresh
          ? 'border-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm shadow-emerald-500/25'"
        class="w-full flex items-center justify-center gap-2.5 disabled:opacity-60 font-bold py-3 rounded-xl text-sm transition-colors"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': regenerating }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ regenerating ? $t('apiKey.generating') : (hasOrFresh ? $t('apiKey.regenerate') : $t('apiKey.generate')) }}
      </button>

      <p v-if="hasOrFresh" class="text-xs text-gray-400 dark:text-slate-600 text-center">
        {{ $t('apiKey.regenerateWarning') }}
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const auth = useAuthStore();
const toast = useToast();

// A key exists either freshly generated (full key in store) or already stored (masked prefix).
const hasOrFresh = computed(() => !!(auth.apiKey || auth.hasKey));
// Masked form of the stored key, e.g. ak_live_2Umab4******** (full key is shown only once).
const maskedKey = computed(() => `${auth.apiKeyPrefix || 'ak_live_'}********`);

const loading = ref(true);
const regenerating = ref(false);
const showKey = ref(false);
const copied = ref(false);

const copyKey = async () => {
  if (!auth.apiKey) return;
  await navigator.clipboard.writeText(auth.apiKey);
  copied.value = true;
  toast.success(t('apiKey.copied'));
  setTimeout(() => { copied.value = false; }, 2000);
};

const handleRegenerate = async () => {
  if (hasOrFresh.value) {
    if (!confirm(t('apiKey.regenerateConfirm'))) return;
  }
  regenerating.value = true;
  try {
    await auth.regenerateApiKey();
    showKey.value = false;
    toast.success(t('apiKey.generated'));
  } catch {
    toast.error(t('apiKey.generateFailed'));
  } finally {
    regenerating.value = false;
  }
};

onMounted(async () => {
  try {
    await auth.fetchApiKey();
  } finally {
    loading.value = false;
  }
});
</script>
