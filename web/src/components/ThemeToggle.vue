<template>
  <button
    @click="toggle"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 overflow-hidden
           bg-white/80 hover:bg-white border border-gray-200 shadow-sm hover:shadow-md text-gray-600
           dark:bg-slate-800/70 dark:hover:bg-slate-700/60 dark:border-slate-700 dark:shadow-black/20"
  >
    <Transition name="theme-swap" mode="out-in">
      <svg v-if="isDark" key="sun" class="w-[18px] h-[18px] text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <svg v-else key="moon" class="w-[16px] h-[16px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </Transition>
  </button>
</template>

<script setup>
import { useTheme } from '../composables/useTheme';
const { isDark, toggle } = useTheme();
</script>

<style scoped>
.theme-swap-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-swap-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.theme-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
  filter: blur(3px);
}
.theme-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
  filter: blur(3px);
}
</style>
