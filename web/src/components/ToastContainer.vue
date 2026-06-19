<template>
  <Teleport to="body">
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-4 scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0 scale-100"
        leave-to-class="opacity-0 translate-x-4 scale-95"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-lg border min-w-[260px] max-w-sm"
          :class="styles[toast.type].wrap"
        >
          <!-- Icon -->
          <span class="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center" :class="styles[toast.type].icon">
            <!-- success -->
            <svg v-if="toast.type === 'success'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <!-- error -->
            <svg v-else-if="toast.type === 'error'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <!-- info -->
            <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </span>

          <!-- Message -->
          <p class="flex-1 text-sm font-medium leading-snug" :class="styles[toast.type].text">{{ toast.message }}</p>

          <!-- Close -->
          <button
            @click="remove(toast.id)"
            class="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
            :class="styles[toast.type].text"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, remove } = useToast();

const styles = {
  success: {
    wrap: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/50',
    icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    text: 'text-gray-800 dark:text-slate-100',
  },
  error: {
    wrap: 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50',
    icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    text: 'text-gray-800 dark:text-slate-100',
  },
  info: {
    wrap: 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/50',
    icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    text: 'text-gray-800 dark:text-slate-100',
  },
};
</script>
