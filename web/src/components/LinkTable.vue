<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden transition-colors duration-200">

    <!-- Loading -->
    <div v-if="loading" class="p-16 flex flex-col items-center gap-3 text-gray-500 dark:text-slate-500">
      <svg class="animate-spin w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="text-sm font-medium">กำลังโหลด...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="links.length === 0" class="p-16 flex flex-col items-center gap-3 animate-fade-in">
      <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
        <svg class="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <p class="text-gray-800 dark:text-slate-200 font-bold text-base">ยังไม่มี Short Link</p>
      <p class="text-sm text-gray-500 dark:text-slate-500">คลิก "สร้าง Link ใหม่" เพื่อเริ่มต้น</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Title</th>
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Short Link</th>
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Destination URL</th>
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Clicks</th>
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
            <th class="px-5 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">วันที่สร้าง</th>
            <th class="px-5 py-3.5 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
          <tr
            v-for="(link, index) in links"
            :key="link._id"
            :style="`animation-delay: ${index * 45}ms`"
            class="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors duration-150 animate-slide-up group"
          >
            <!-- Title -->
            <td class="px-5 py-4">
              <span class="text-sm font-semibold text-gray-900 dark:text-slate-100 max-w-[140px] block truncate">
                {{ link.title || '—' }}
              </span>
            </td>

            <!-- Short link + copy -->
            <td class="px-5 py-4">
              <div class="flex items-center gap-2">
                <a
                  :href="`${baseShortUrl}/${link.code}`"
                  target="_blank"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono text-xs font-bold bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-lg transition-colors duration-150"
                >
                  /{{ link.code }}
                </a>
                <button
                  @click="copyLink(link.code)"
                  :title="copied === link.code ? 'Copied!' : 'Copy link'"
                  class="opacity-0 group-hover:opacity-100 transition-all duration-150 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
                >
                  <svg v-if="copied !== link.code" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </td>

            <!-- Destination URL -->
            <td class="px-5 py-4 max-w-[200px]">
              <span class="text-sm text-gray-600 dark:text-slate-400 truncate block" :title="link.destinationUrl">
                {{ link.destinationUrl }}
              </span>
            </td>

            <!-- Clicks -->
            <td class="px-5 py-4">
              <span class="text-sm font-bold text-gray-900 dark:text-slate-200">{{ link.clickCount.toLocaleString() }}</span>
            </td>

            <!-- Status -->
            <td class="px-5 py-4">
              <span
                :class="link.isActive
                  ? 'bg-green-50 text-green-800 ring-1 ring-green-300 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800/50'
                  : 'bg-gray-100 text-gray-600 ring-1 ring-gray-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              >
                <span :class="link.isActive ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-slate-500'" class="w-1.5 h-1.5 rounded-full" />
                {{ link.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>

            <!-- Date -->
            <td class="px-5 py-4 text-sm text-gray-500 dark:text-slate-500 font-medium">{{ formatDate(link.createdAt) }}</td>

            <!-- Actions -->
            <td class="px-5 py-4">
              <div class="flex justify-end gap-1">
                <button @click="$emit('logs', link)" title="ดู Logs"
                  class="p-1.5 rounded-lg text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                <button @click="$emit('edit', link)" title="แก้ไข"
                  class="p-1.5 rounded-lg text-blue-500 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button @click="$emit('delete', link._id)" title="ลบ"
                  class="p-1.5 rounded-lg text-red-400 dark:text-red-500/60 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({ links: Array, loading: Boolean });
defineEmits(['edit', 'delete', 'logs']);

const baseShortUrl = import.meta.env.VITE_BASE_SHORT_URL;

const copied = ref(null);

const copyLink = async (code) => {
  await navigator.clipboard.writeText(`${baseShortUrl}/${code}`);
  copied.value = code;
  setTimeout(() => { copied.value = null; }, 2000);
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
</script>
