<template>
  <div class="relative" ref="rootRef">
    <!-- Trigger -->
    <button
      type="button"
      ref="triggerRef"
      @click="toggle"
      class="w-full flex items-center gap-2 px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-800 transition-all text-left"
      :class="[
        open
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500',
        triggerClass,
      ]"
    >
      <span v-if="selectedOption?.dot" class="w-2 h-2 rounded-full shrink-0" :class="selectedOption.dot" />

      <span
        class="flex-1 truncate"
        :class="selectedOption ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-500 dark:text-slate-400'"
      >{{ selectedOption?.label ?? placeholder }}</span>

      <svg
        class="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown — teleported to body to bypass overflow:hidden parents -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="open"
          class="fixed z-[9999] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
          :style="dropdownStyle"
        >
          <!-- Search (only when searchable) -->
          <div v-if="searchable" class="p-2 border-b border-gray-200 dark:border-slate-700">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref="searchRef"
                v-model="query"
                type="text"
                :placeholder="searchPlaceholder || 'Search...'"
                class="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <!-- Options -->
          <div class="max-h-56 overflow-y-auto py-1">
            <button
              v-for="opt in filteredOptions"
              :key="opt.value"
              type="button"
              @click="select(opt)"
              class="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
              :class="modelValue === opt.value
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700'"
            >
              <span v-if="opt.dot" class="w-2 h-2 rounded-full shrink-0" :class="opt.dot" />
              <span class="flex-1 text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{{ opt.label }}</span>
              <svg v-if="modelValue === opt.value" class="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <p v-if="searchable && query && !filteredOptions.length" class="text-xs text-center text-gray-500 dark:text-slate-400 py-3">No results</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  modelValue: { default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: '' },
  triggerClass: { type: String, default: '' },
  dropdownClass: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const open = ref(false);
const query = ref('');
const rootRef = ref(null);
const triggerRef = ref(null);
const searchRef = ref(null);
const dropdownStyle = reactive({ top: 'auto', bottom: 'auto', left: '0px', width: '0px' });

const selectedOption = computed(() => props.options.find((o) => o.value === props.modelValue) ?? null);

const filteredOptions = computed(() => {
  if (!props.searchable || !query.value) return props.options;
  const q = query.value.toLowerCase();
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

const updatePosition = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceBelow < 200;
  if (openUpward) {
    dropdownStyle.top = 'auto';
    dropdownStyle.bottom = `${window.innerHeight - rect.top + 6}px`;
  } else {
    dropdownStyle.top = `${rect.bottom + 6}px`;
    dropdownStyle.bottom = 'auto';
  }
  dropdownStyle.left = `${rect.left}px`;
  dropdownStyle.width = `${rect.width}px`;
};

const toggle = () => {
  if (!open.value) updatePosition();
  open.value = !open.value;
};

const select = (opt) => {
  emit('update:modelValue', opt.value);
  emit('change', opt.value);
  open.value = false;
};

watch(open, (val) => {
  if (val && props.searchable) nextTick(() => searchRef.value?.focus());
  else query.value = '';
});

const onClickOutside = (e) => {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false;
};

const onScroll = () => { if (open.value) updatePosition(); };

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onScroll);
});
</script>
