<template>
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-slate-700 w-full max-w-md animate-slide-in-modal transition-colors duration-200">

      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-slate-700">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">
            {{ link ? $t('linkForm.editTitle') : $t('linkForm.createTitle') }}
          </h2>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-150"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <!-- Destination URL -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">
            {{ $t('linkForm.destinationUrl') }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
            <input
              v-model="form.destinationUrl"
              type="url"
              placeholder="https://example.com/long-url"
              class="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-600 rounded-xl py-2.5 text-sm
                     bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
            />
          </div>
        </div>

        <!-- Custom back-half -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">
            {{ $t('linkForm.customCode') }} <span v-if="!link" class="text-gray-500 dark:text-slate-400 font-normal text-xs ml-1">{{ $t('linkForm.customCodeHint') }}</span>
          </label>
          <div class="flex items-center border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200 px-3.5 py-2.5 gap-0.5">
            <span class="text-sm text-gray-500 dark:text-slate-400 select-none shrink-0">{{ shortDomain }}/</span>
            <input
              v-model="form.code"
              type="text"
              :placeholder="$t('linkForm.customCodePlaceholder')"
              class="flex-1 text-sm bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none min-w-0"
            />
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">
            {{ $t('linkForm.titleLabel') }} <span class="text-gray-500 dark:text-slate-400 font-normal text-xs ml-1">{{ $t('common.optional') }}</span>
          </label>
          <div class="relative">
            <input
              v-model="form.title"
              type="text"
              :placeholder="titleFetching ? $t('linkForm.fetchingTitle') : $t('linkForm.titlePlaceholder')"
              :disabled="titleFetching"
              class="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm
                     bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200 disabled:opacity-60"
            />
            <div v-if="titleFetching" class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Expiry Date -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1.5">
            {{ $t('linkForm.expiryDate') }} <span class="text-gray-500 dark:text-slate-400 font-normal text-xs ml-1">{{ $t('linkForm.expiryHint') }}</span>
          </label>
          <input
            v-model="form.expiresAt"
            type="datetime-local"
            :min="minDatetime"
            class="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm
                   bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200"
          />
          <button
            v-if="form.expiresAt"
            type="button"
            @click="form.expiresAt = ''"
            class="mt-1 text-xs text-gray-500 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            {{ $t('linkForm.clearExpiry') }}
          </button>
        </div>

        <!-- Active toggle -->
        <div class="flex items-center justify-between py-1">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ $t('linkForm.linkStatus') }}</p>
            <p class="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
              {{ form.isActive ? $t('linkForm.linkActive') : $t('linkForm.linkInactive') }}
            </p>
          </div>
          <button
            type="button"
            @click="form.isActive = !form.isActive"
            :class="form.isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none"
          >
            <span
              :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
            />
          </button>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-1">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? $t('linkForm.saving') : $t('linkForm.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLinksStore } from '../stores/links';
import { useToast } from '../composables/useToast';
import api from '../api';

const props = defineProps({ link: Object });
const emit = defineEmits(['close', 'saved']);
const store = useLinksStore();
const toast = useToast();
const { t } = useI18n();

const baseShortUrl = import.meta.env.VITE_BASE_SHORT_URL || '';
const shortDomain = baseShortUrl.replace(/^https?:\/\//, '');

const toDatetimeLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const form = reactive({
  title: props.link?.title || '',
  destinationUrl: props.link?.destinationUrl || '',
  code: props.link?.code || '',
  expiresAt: toDatetimeLocal(props.link?.expiresAt),
  isActive: props.link?.isActive ?? true,
});

const minDatetime = computed(() => toDatetimeLocal(new Date()));
const loading = ref(false);
const titleFetching = ref(false);

const domainFallback = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

const isValidTitle = (t) => t && t.trim().length > 1 && t.trim().toLowerCase() !== 'error';

const handleSubmit = async () => {
  loading.value = true;
  try {
    if (!form.title && form.destinationUrl) {
      titleFetching.value = true;
      try {
        const { data } = await api.get('/links/meta', { params: { url: form.destinationUrl } });
        form.title = isValidTitle(data.title) ? data.title.trim() : domainFallback(form.destinationUrl);
      } catch {
        form.title = domainFallback(form.destinationUrl);
      } finally {
        titleFetching.value = false;
      }
    }

    const expiresAt = form.expiresAt ? new Date(form.expiresAt).toISOString() : null;
    if (props.link) {
      await store.updateLink(props.link._id, {
        title: form.title,
        destinationUrl: form.destinationUrl,
        code: form.code || undefined,
        isActive: form.isActive,
        expiresAt,
      });
      toast.success(t('linkForm.updated'));
    } else {
      await store.createLink({
        title: form.title,
        destinationUrl: form.destinationUrl,
        code: form.code || undefined,
        isActive: form.isActive,
        expiresAt,
      });
      toast.success(t('linkForm.created'));
    }
    emit('saved');
  } catch (e) {
    toast.error(e.response?.data?.message || t('linkForm.errorDefault'));
  } finally {
    loading.value = false;
  }
};
</script>
