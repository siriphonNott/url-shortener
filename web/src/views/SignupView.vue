<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
    <!-- Animated background blobs -->
    <div class="blob blob-1 absolute w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none bg-blue-400/25 dark:bg-blue-600/10 top-0 right-0 -translate-y-1/2 translate-x-1/3" />
    <div class="blob blob-2 absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none bg-violet-400/20 dark:bg-violet-600/10 bottom-0 left-0 translate-y-1/2 -translate-x-1/4" />

    <!-- Theme + language -->
    <div class="absolute top-5 right-5 z-10 flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <div class="relative w-full max-w-sm card-enter">
      <div class="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-300/60 dark:shadow-black/50 border border-white/80 dark:border-slate-700/50 overflow-hidden">
        <div class="h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-blue-600" />

        <!-- Brand -->
        <div class="pt-9 pb-6 px-8 text-center">
          <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{{ $t('auth.signupTitle') }}</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1.5">{{ $t('auth.signupSubtitle') }}</p>
        </div>

        <div class="px-8 pb-8">
          <!-- Google + divider (hidden when no client id) -->
          <template v-if="google.enabled">
            <div ref="googleBtnEl" class="flex justify-center min-h-[44px]" />
            <div class="flex items-center gap-3 my-6">
              <div class="flex-1 h-px bg-gray-200 dark:bg-slate-700/80" />
              <span class="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">{{ $t('auth.orDivider') }}</span>
              <div class="flex-1 h-px bg-gray-200 dark:bg-slate-700/80" />
            </div>
          </template>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">{{ $t('auth.email') }}</label>
              <input
                v-model="email"
                type="email"
                required
                placeholder="your@email.com"
                class="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200"
              />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">{{ $t('auth.password') }}</label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  placeholder="••••••••"
                  class="w-full px-4 pr-11 py-3 rounded-xl text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200"
                />
                <button type="button" @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-3.5 flex items-center text-gray-400 dark:text-slate-500 hover:text-blue-500 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Turnstile -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">{{ $t('auth.verifyHuman') }}</label>
              <div ref="turnstileEl" class="min-h-[65px]" />
            </div>

            <!-- Error -->
            <div v-if="error" class="flex items-center gap-2.5 text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 rounded-xl">
              <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              {{ error }}
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading || !turnstileToken"
              class="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2">
              <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ loading ? $t('auth.submitting') : $t('auth.createAccount') }}</span>
            </button>
          </form>

          <p class="text-center text-sm text-gray-500 dark:text-slate-400 mt-6">
            {{ $t('auth.haveAccount') }}
            <router-link to="/login" class="font-semibold text-blue-600 dark:text-blue-400 hover:underline">{{ $t('auth.signInLink') }}</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useTheme } from '../composables/useTheme';
import { useGoogleSignin } from '../composables/useGoogleSignin';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();
const { isDark } = useTheme();
const google = useGoogleSignin();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const showPassword = ref(false);

const turnstileEl = ref(null);
const turnstileToken = ref('');
let turnstileWidgetId = null;

const googleBtnEl = ref(null);
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// Load an external script once; resolve when it has loaded.
const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loaded[src];
}

async function finishAuth() {
  await auth.fetchMe();
  router.push('/dashboard');
}

async function handleSubmit() {
  error.value = '';
  if (!turnstileToken.value) {
    error.value = t('auth.errorTurnstile');
    return;
  }
  loading.value = true;
  try {
    await auth.register(email.value, password.value, turnstileToken.value);
    await finishAuth();
  } catch (e) {
    error.value = e.response?.data?.message || t('auth.errorDefault');
    // Reset Turnstile so the user gets a fresh challenge token before retrying.
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
      turnstileToken.value = '';
    }
  } finally {
    loading.value = false;
  }
}

async function handleGoogleCredential(idToken) {
  error.value = '';
  loading.value = true;
  try {
    await auth.googleSignin(idToken);
    await finishAuth();
  } catch (e) {
    error.value = e.response?.data?.message || t('auth.errorGoogle');
  } finally {
    loading.value = false;
  }
}

// Render Turnstile with a theme matching the APP (not the OS). Turnstile's default
// theme:'auto' follows prefers-color-scheme, which mismatches the app's class-based
// light/dark toggle. Re-rendered when the app theme changes (resets the token).
function renderTurnstile() {
  if (!window.turnstile || !turnstileEl.value) return;
  if (turnstileWidgetId !== null) {
    window.turnstile.remove(turnstileWidgetId);
    turnstileWidgetId = null;
  }
  turnstileToken.value = '';
  turnstileWidgetId = window.turnstile.render(turnstileEl.value, {
    sitekey: siteKey,
    theme: isDark.value ? 'dark' : 'light',
    callback: (token) => { turnstileToken.value = token; },
    'error-callback': () => { turnstileToken.value = ''; },
    'expired-callback': () => { turnstileToken.value = ''; },
  });
}

onMounted(async () => {
  // Turnstile widget (explicit render, theme synced to the app).
  try {
    await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    renderTurnstile();
  } catch {
    error.value = t('auth.errorTurnstile');
  }

  // "Continue with Google" button (no-op when no client id is configured).
  google.renderButton(googleBtnEl.value, handleGoogleCredential);
});

// Keep the Turnstile widget's theme in sync with the app's light/dark toggle.
watch(isDark, () => renderTurnstile());
</script>

<style scoped>
.card-enter { animation: cardSlideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes cardSlideUp {
  from { opacity: 0; transform: translateY(36px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.blob { animation: blobFloat 8s ease-in-out infinite; }
.blob-2 { animation-delay: -3s; animation-duration: 10s; }
@keyframes blobFloat {
  0%, 100% { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1); }
  50%      { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(1.08); }
}
</style>
