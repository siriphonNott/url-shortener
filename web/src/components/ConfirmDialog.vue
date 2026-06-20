<template>
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
    @click.self="$emit('cancel')"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-slate-700 w-full max-w-sm animate-slide-in-modal">

      <!-- Icon + content -->
      <div class="p-7 text-center">
        <div class="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-slate-100">{{ $t('confirm.logoutTitle') }}</h3>
        <p class="text-sm text-gray-600 dark:text-slate-400 mt-2 leading-relaxed">
          {{ $t('confirm.logoutMessage') }}<br />
          <span class="text-gray-500 dark:text-slate-400 text-xs">{{ $t('confirm.logoutHint') }}</span>
        </p>
      </div>

      <!-- Buttons -->
      <div class="px-6 pb-6 flex gap-3">
        <button
          @click="$emit('cancel')"
          class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
        >
          {{ $t('confirm.cancel') }}
        </button>
        <button
          @click="$emit('confirm')"
          class="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-200"
        >
          {{ $t('confirm.logoutBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

defineEmits(['confirm', 'cancel']);
const { t } = useI18n();
</script>
