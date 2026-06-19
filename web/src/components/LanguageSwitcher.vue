<template>
  <button
    @click="toggle"
    :title="locale === 'en' ? 'Switch to Thai' : 'Switch to English'"
    class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 overflow-hidden
           bg-white/80 hover:bg-white border border-gray-200 shadow-sm hover:shadow-md text-gray-700
           dark:bg-slate-800/70 dark:hover:bg-slate-700/60 dark:border-slate-700 dark:text-slate-300 dark:shadow-black/20"
  >
    <Transition name="lang-swap" mode="out-in">
      <span :key="locale" class="text-[12px] font-extrabold tracking-widest select-none">
        {{ locale === 'en' ? 'TH' : 'EN' }}
      </span>
    </Transition>
  </button>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const toggle = () => {
  locale.value = locale.value === 'en' ? 'th' : 'en';
  localStorage.setItem('lang', locale.value);
};
</script>

<style scoped>
.lang-swap-enter-active {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lang-swap-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.lang-swap-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.6);
  filter: blur(4px);
}
.lang-swap-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.6);
  filter: blur(4px);
}
</style>
