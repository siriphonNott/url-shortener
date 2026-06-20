<template>
  <div class="px-4 lg:px-8 py-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('apiKeyMgmt.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">{{ $t('apiKeyMgmt.total', { n: store.pagination.total }) }}</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        {{ $t('apiKeyMgmt.newBtn') }}
      </button>
    </div>

    <!-- Info banner -->
    <div class="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl px-4 py-3.5 mb-4">
      <svg class="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <p class="text-sm text-blue-700 dark:text-blue-300">{{ $t('apiKeyMgmt.infoNote') }}</p>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden">

      <!-- Search + Filter -->
      <div class="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <div class="relative flex-1 max-w-sm">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            @input="onFilterChange"
            type="text"
            :placeholder="$t('apiKeyMgmt.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div class="w-44 shrink-0">
          <AppSelect
            v-model="statusFilter"
            @change="onFilterChange"
            :options="[
              { value: '', label: $t('common.allStatuses') },
              { value: 'active',   label: $t('common.active'),   dot: 'bg-emerald-500' },
              { value: 'inactive', label: $t('common.inactive'), dot: 'bg-amber-500' },
              { value: 'expired',  label: $t('common.expired'),  dot: 'bg-orange-500' },
              { value: 'revoked',  label: $t('common.revoked'),  dot: 'bg-red-500' },
            ]"
            :placeholder="$t('common.allStatuses')"
          />
        </div>
      </div>

      <div v-if="store.loading" class="flex items-center justify-center py-16">
        <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="!store.keys.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <svg class="w-7 h-7 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-600 dark:text-slate-400">{{ $t('apiKeyMgmt.noKeys') }}</p>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">{{ $t('apiKeyMgmt.noKeysHint') }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.keyNameCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.apiKeyCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.userCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.scopesCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('common.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.expiresCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('apiKeyMgmt.lastUsedCol') }}</th>
              <th class="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-slate-700/70">
            <tr
              v-for="key in store.keys"
              :key="key.id"
              class="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- Key Name + date -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 dark:text-slate-100 leading-tight">{{ key.keyName }}</p>
                    <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ formatDate(key.createdAt) }}</p>
                  </div>
                </div>
              </td>

              <!-- API Key (truncated + copy) -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1.5">
                  <code class="text-xs font-mono bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    {{ key.apiKey ? key.apiKey.slice(0, 20) + '…' : '—' }}
                  </code>
                  <button
                    @click="copyApiKey(key)"
                    class="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-blue-500 transition-all"
                    :title="copiedId === key.id ? $t('common.copied') : $t('apiKeyMgmt.copyFullKey')"
                  >
                    <svg v-if="copiedId === key.id" class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>

              <!-- User -->
              <td class="px-4 py-3.5">
                <div v-if="key.user" class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase">
                    {{ (key.user.fullName || key.user.email || '?').charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-slate-200 leading-tight">{{ key.user.fullName || key.user.email?.split('@')[0] }}</p>
                    <p class="text-xs text-gray-500 dark:text-slate-400">{{ key.user.email }}</p>
                  </div>
                </div>
                <span v-else class="text-xs text-gray-500 dark:text-slate-400">—</span>
              </td>

              <!-- Scopes -->
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="(val, ns) in key.scopes"
                    :key="ns"
                    class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                    :class="val === 'write'
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : val === 'none'
                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 line-through'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'"
                  >
                    {{ ns }}<span class="opacity-50">·</span>{{ val }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" :class="statusClass(key.status)">
                  <span class="w-1.5 h-1.5 rounded-full bg-current" />
                  {{ key.status }}
                </span>
              </td>

              <!-- Expires -->
              <td class="px-4 py-3.5">
                <span v-if="key.expiresAt" class="text-xs text-gray-600 dark:text-slate-300">{{ formatDate(key.expiresAt) }}</span>
                <span v-else class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Never
                </span>
              </td>

              <!-- Last Used -->
              <td class="px-4 py-3.5">
                <span v-if="key.lastUsedAt" class="text-xs text-gray-600 dark:text-slate-300">{{ formatRelative(key.lastUsedAt) }}</span>
                <span v-else class="text-xs text-gray-500 dark:text-slate-400">—</span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1 justify-end">
                  <button
                    @click="openStats(key)"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    :title="$t('apiKeyMgmt.analyticsTitle')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  <button
                    @click="openEdit(key)"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    :title="$t('common.edit')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="openDelete(key)"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    :title="$t('common.delete')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="store.pagination.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-slate-700 gap-4">
        <span class="text-sm font-medium text-gray-600 dark:text-slate-400 shrink-0">
          {{ $t('apiKeyMgmt.total', { n: store.pagination.total }) }}
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="goPage(store.pagination.page - 1)"
            :disabled="store.pagination.page <= 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            v-for="p in apiKeyPageNumbers"
            :key="p"
            @click="goPage(p)"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
            :class="p === store.pagination.page
              ? 'bg-indigo-100 dark:bg-blue-900/40 text-indigo-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700'"
          >{{ p }}</button>
          <button
            @click="goPage(store.pagination.page + 1)"
            :disabled="store.pagination.page >= store.pagination.pages"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-sm text-gray-600 dark:text-slate-400">{{ $t('common.showPerPage') }}</span>
          <div class="w-20">
            <AppSelect
              v-model="perPage"
              @change="goPage(1)"
              :options="[{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 25, label: '25' }]"
              trigger-class="!py-1.5 !text-sm !px-2.5"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create / Edit Modal ── -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeModal">
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-slate-700">
            <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ editing ? $t('apiKeyMgmt.editTitle') : $t('apiKeyMgmt.newTitle') }}</h3>
            <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-5 space-y-4">
            <!-- Key Name -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('apiKeyMgmt.keyName') }} <span class="text-red-500">*</span></label>
              <input
                v-model="form.keyName"
                type="text"
                :placeholder="$t('apiKeyMgmt.keyNamePlaceholder')"
                class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <!-- User (create only) -->
            <div v-if="!editing" class="relative" ref="userDropdownRef">
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('apiKeyMgmt.userLabel') }}</label>

              <!-- Trigger -->
              <button
                type="button"
                @click="userDropdownOpen = !userDropdownOpen"
                class="w-full flex items-center gap-3 px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-800 transition-all text-left"
                :class="userDropdownOpen
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'"
              >
                <div v-if="selectedUser" class="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase">
                  {{ (selectedUser.fullName || selectedUser.email).charAt(0) }}
                </div>
                <div v-else class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p v-if="selectedUser" class="text-sm font-medium text-gray-800 dark:text-slate-200 truncate leading-tight">{{ selectedUser.fullName || selectedUser.email?.split('@')[0] }}</p>
                  <p v-else class="text-sm text-gray-500 dark:text-slate-400">{{ $t('apiKeyMgmt.selfOption') }}</p>
                  <p v-if="selectedUser" class="text-xs text-gray-500 dark:text-slate-400 truncate">{{ selectedUser.email }}</p>
                </div>
                <svg class="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0 transition-transform duration-200" :class="userDropdownOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown panel -->
              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div v-if="userDropdownOpen" class="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                  <!-- Search -->
                  <div class="p-2 border-b border-gray-200 dark:border-slate-700">
                    <div class="relative">
                      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        v-model="userSearch"
                        ref="userSearchInput"
                        type="text"
                        :placeholder="$t('apiKeyMgmt.searchUsers')"
                        class="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <!-- Options list -->
                  <div class="max-h-52 overflow-y-auto">
                    <!-- Self option -->
                    <button
                      type="button"
                      @click="selectUser(null)"
                      class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      :class="!form.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''"
                    >
                      <div class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <svg class="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span class="text-sm font-medium text-gray-700 dark:text-slate-300">{{ $t('apiKeyMgmt.selfOption') }}</span>
                      <svg v-if="!form.userId" class="w-4 h-4 text-blue-500 ml-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>

                    <!-- User options -->
                    <button
                      v-for="u in filteredUsers"
                      :key="u.id"
                      type="button"
                      @click="selectUser(u)"
                      class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      :class="form.userId === u.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''"
                    >
                      <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase">
                        {{ (u.fullName || u.email).charAt(0) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 dark:text-slate-200 truncate leading-tight">{{ u.fullName || u.email?.split('@')[0] }}</p>
                        <p class="text-xs text-gray-500 dark:text-slate-400 truncate">{{ u.email }}</p>
                      </div>
                      <svg v-if="form.userId === u.id" class="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>

                    <p v-if="filteredUsers.length === 0 && userSearch" class="text-xs text-center text-gray-500 dark:text-slate-400 py-4">No users found</p>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Scopes -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">{{ $t('apiKeyMgmt.scopes') }}</label>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="ns in SCOPES" :key="ns.key" class="space-y-1.5">
                  <p class="text-xs font-medium text-gray-600 dark:text-slate-400 capitalize">{{ ns.label }}</p>
                  <div class="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    <button
                      v-for="opt in ns.options"
                      :key="opt.value"
                      type="button"
                      @click="form.scopes[ns.key] = opt.value"
                      class="flex-1 text-xs py-1.5 font-medium transition-colors"
                      :class="form.scopes[ns.key] === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'"
                    >{{ opt.label }}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status (edit only) -->
            <div v-if="editing">
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('common.status') }}</label>
              <AppSelect
                v-model="form.status"
                :options="[
                  { value: 'active',   label: $t('common.active'),   dot: 'bg-emerald-500' },
                  { value: 'inactive', label: $t('common.inactive'), dot: 'bg-amber-500' },
                  { value: 'revoked',  label: $t('common.revoked'),  dot: 'bg-red-500' },
                ]"
              />
            </div>

            <!-- Expires At -->
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('apiKeyMgmt.expiryDate') }} <span class="text-gray-500 dark:text-slate-400 font-normal">{{ $t('common.optional') }}</span></label>
              <input
                v-model="form.expiresAt"
                type="date"
                :min="today"
                class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <p v-if="modalError" class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2">{{ modalError }}</p>
          </div>

          <div class="px-6 pb-6 flex gap-3">
            <button @click="closeModal" class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200">{{ $t('common.cancel') }}</button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ saving ? $t('common.saving') : (editing ? $t('common.saveChanges') : $t('apiKeyMgmt.newTitle')) }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Analytics Modal ── -->
      <div v-if="statsModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="statsModal.open = false">
        <div class="bg-gray-50 dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">

          <!-- Modal Header -->
          <div class="bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                <svg class="w-4.5 h-4.5 text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">{{ statsModal.key?.keyName }}</h3>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ $t('apiKeyMgmt.analyticsOwner', { email: statsModal.key?.user?.email }) }}</p>
              </div>
            </div>
            <button @click="statsModal.open = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="overflow-y-auto flex-1 p-5 space-y-4">

            <!-- Loading -->
            <div v-if="statsModal.loading" class="flex items-center justify-center py-16">
              <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <template v-else-if="statsModal.data">

              <!-- Key Info Row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                  <p class="text-xs text-gray-700 dark:text-slate-300 font-medium mb-1">Status</p>
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(statsModal.data.key.status)">
                    <span class="w-1.5 h-1.5 rounded-full bg-current" />{{ statsModal.data.key.status }}
                  </span>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                  <p class="text-xs text-gray-700 dark:text-slate-300 font-medium mb-1">Created</p>
                  <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ formatDate(statsModal.data.key.createdAt) }}</p>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                  <p class="text-xs text-gray-700 dark:text-slate-300 font-medium mb-1">Last Used</p>
                  <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ statsModal.data.key.lastUsedAt ? formatRelative(statsModal.data.key.lastUsedAt) : '—' }}</p>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4">
                  <p class="text-xs text-gray-700 dark:text-slate-300 font-medium mb-1">Expires</p>
                  <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ statsModal.data.key.expiresAt ? formatDate(statsModal.data.key.expiresAt) : 'Never' }}</p>
                </div>
              </div>

              <!-- Scopes -->
              <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 px-4 py-3 flex items-center gap-3">
                <p class="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider shrink-0">Scopes</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(val, ns) in statsModal.data.key.scopes" :key="ns"
                    class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                    :class="val === 'write' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : val === 'none' ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'"
                  >{{ ns }}<span class="opacity-40">·</span>{{ val }}</span>
                </div>
              </div>

              <!-- Stat Cards (owner's links) -->
              <div class="grid grid-cols-3 gap-3">
                <div v-for="card in [
                  { label: $t('dashboard.totalLinks'), value: statsModal.data.stats.totalLinks, color: 'from-emerald-500 to-teal-500', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
                  { label: $t('dashboard.activeLinks'), value: statsModal.data.stats.activeLinks, color: 'from-blue-500 to-indigo-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: $t('dashboard.totalClicks'), value: statsModal.data.stats.totalClicks, color: 'from-violet-500 to-purple-500', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' },
                ]" :key="card.label"
                  class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-4"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-xs text-gray-700 dark:text-slate-300 font-medium">{{ card.label }}</p>
                      <p class="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{{ card.value.toLocaleString() }}</p>
                    </div>
                    <div :class="`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm shrink-0`">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.icon" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Timeline Bar Chart -->
              <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100">{{ $t('apiKeyMgmt.analyticsTitle') }}</h4>
                  <span class="text-xs text-gray-500 dark:text-slate-400">{{ $t('dashboard.last7Days') }}</span>
                </div>
                <div class="h-40">
                  <Bar v-if="statsChartData" :data="statsChartData" :options="chartOptions" />
                  <div v-else class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-slate-500">{{ $t('common.noData') }}</div>
                </div>
              </div>

              <!-- Devices -->
              <div v-if="statsModal.data.devices?.length" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 p-5">
                <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-4">{{ $t('dashboard.trafficByDevice') }}</h4>
                <div class="space-y-2.5">
                  <div v-for="d in statsModal.data.devices" :key="d.name" class="flex items-center gap-3">
                    <span class="text-xs font-medium text-gray-600 dark:text-slate-400 w-16 shrink-0">{{ d.name }}</span>
                    <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                      <div class="h-2 rounded-full bg-blue-500" :style="{ width: (d.count / statsModal.data.devices.reduce((s, x) => s + x.count, 0) * 100).toFixed(0) + '%' }" />
                    </div>
                    <span class="text-xs text-gray-600 dark:text-slate-400 w-8 text-right">{{ d.count }}</span>
                  </div>
                </div>
              </div>

            </template>
          </div>
        </div>
      </div>

      <!-- ── Delete Confirm Modal ── -->
      <div v-if="deleteTarget" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="deleteTarget = null">
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-slate-700">
          <div class="px-6 pt-6 pb-4 text-center">
            <div class="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('apiKeyMgmt.deleteTitle') }}</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-slate-400">
              {{ $t('apiKeyMgmt.deleteConfirm', { name: deleteTarget?.name || deleteTarget?.keyName }) }}
            </p>
          </div>
          <div class="px-6 pb-6 flex gap-3">
            <button @click="deleteTarget = null" class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200">{{ $t('common.cancel') }}</button>
            <button
              @click="handleDelete"
              :disabled="deleting"
              class="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >{{ deleting ? $t('apiKeyMgmt.deleting') : $t('common.delete') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { useApiKeysStore } from '../stores/apiKeys';
import { useUsersStore } from '../stores/users';
import { useToast } from '../composables/useToast';
import api from '../api';
import AppSelect from '../components/AppSelect.vue';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const { t } = useI18n();
const store = useApiKeysStore();
const usersStore = useUsersStore();
const toast = useToast();

const SCOPES = computed(() => [
  { key: 'links', label: t('apiKeyMgmt.links'), options: [
    { value: 'read', label: t('common.read') },
    { value: 'write', label: t('common.write') },
  ]},
  { key: 'stats', label: t('apiKeyMgmt.stats'), options: [
    { value: 'read', label: t('common.read') },
    { value: 'none', label: t('common.none') },
  ]},
]);

const search = ref('');
const statusFilter = ref('');
const perPage = ref(5);
const showModal = ref(false);

const apiKeyPageNumbers = computed(() => {
  const { page, pages } = store.pagination;
  const range = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) range.push(i);
  return range;
});
const editing = ref(null);
const saving = ref(false);
const modalError = ref('');
const deleteTarget = ref(null);
const deleting = ref(false);
const copiedId = ref(null);
const statsModal = reactive({ open: false, loading: false, key: null, data: null });

const statsChartData = computed(() => {
  const t = statsModal.data?.timeline;
  if (!t) return null;
  return {
    labels: t.map((d) => d.date.slice(5)),
    datasets: [
      { label: 'Clicks', data: t.map((d) => d.clicks), backgroundColor: '#06b6d4', borderRadius: 4, barPercentage: 0.6 },
      { label: 'Links Created', data: t.map((d) => d.linksCreated), backgroundColor: '#8b5cf6', borderRadius: 4, barPercentage: 0.6 },
    ],
  };
});

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } } },
};

const openStats = async (key) => {
  statsModal.key = key;
  statsModal.data = null;
  statsModal.open = true;
  statsModal.loading = true;
  try {
    const { data } = await api.get(`/api-keys/${key.id}/stats`);
    statsModal.data = data;
  } finally {
    statsModal.loading = false;
  }
};

const copyApiKey = async (key) => {
  if (!key.apiKey) return;
  await navigator.clipboard.writeText(key.apiKey);
  copiedId.value = key.id;
  setTimeout(() => { copiedId.value = null; }, 2000);
};

const users = computed(() => usersStore.users);
const today = new Date().toISOString().split('T')[0];

const userDropdownOpen = ref(false);
const userSearch = ref('');
const userDropdownRef = ref(null);
const userSearchInput = ref(null);

const selectedUser = computed(() => users.value.find((u) => u.id === form.userId) || null);
const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase();
  if (!q) return users.value;
  return users.value.filter((u) =>
    (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  );
});

const selectUser = (u) => {
  form.userId = u ? u.id : '';
  userDropdownOpen.value = false;
  userSearch.value = '';
};

const onClickOutside = (e) => {
  if (userDropdownRef.value && !userDropdownRef.value.contains(e.target)) {
    userDropdownOpen.value = false;
  }
};

watch(userDropdownOpen, (val) => {
  if (val) nextTick(() => userSearchInput.value?.focus());
  else userSearch.value = '';
});

onMounted(async () => {
  document.addEventListener('mousedown', onClickOutside);
  await Promise.all([
    store.fetchKeys(),
    usersStore.fetchUsers({ page: 1 }),
  ]);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside);
});

const defaultForm = () => ({
  keyName: '',
  userId: '',
  scopes: { links: 'read', stats: 'read' },
  status: 'active',
  expiresAt: '',
});
const form = reactive(defaultForm());

const statusClass = (s) => ({
  active:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  inactive: 'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400',
  expired:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  revoked:  'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400',
}[s] ?? 'bg-gray-100 text-gray-600');

const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const formatRelative = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

let searchTimer = null;
const onFilterChange = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => store.fetchKeys({ search: search.value, status: statusFilter.value, limit: perPage.value }), 350);
};

const goPage = (p) => store.fetchKeys({ search: search.value, status: statusFilter.value, page: p, limit: perPage.value });

const openCreate = () => {
  Object.assign(form, defaultForm());
  editing.value = null;
  modalError.value = '';
  showModal.value = true;
};

const openEdit = (key) => {
  Object.assign(form, {
    keyName: key.keyName,
    userId: key.user?.id || '',
    scopes: { ...key.scopes },
    status: key.status,
    expiresAt: key.expiresAt ? key.expiresAt.split('T')[0] : '',
  });
  editing.value = key;
  modalError.value = '';
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; editing.value = null; };
const openDelete = (key) => { deleteTarget.value = key; };

const handleSave = async () => {
  if (!form.keyName.trim()) { modalError.value = t('apiKeyMgmt.nameRequired'); return; }
  saving.value = true;
  modalError.value = '';
  try {
    if (editing.value) {
      await store.updateKey(editing.value.id, {
        keyName: form.keyName,
        scopes: form.scopes,
        status: form.status,
        expiresAt: form.expiresAt || null,
      });
      toast.success(t('apiKeyMgmt.updated'));
    } else {
      await store.createKey({
        keyName: form.keyName,
        userId: form.userId || undefined,
        scopes: form.scopes,
        expiresAt: form.expiresAt || null,
      });
      await store.fetchKeys({ search: search.value, status: statusFilter.value });
      toast.success(t('apiKeyMgmt.created'));
    }
    closeModal();
  } catch (e) {
    modalError.value = e.response?.data?.message || 'Failed to save';
  } finally {
    saving.value = false;
  }
};

const handleDelete = async () => {
  deleting.value = true;
  try {
    await store.deleteKey(deleteTarget.value.id);
    toast.success(t('apiKeyMgmt.deleted'));
    deleteTarget.value = null;
  } catch {
    toast.error(t('apiKeyMgmt.deleteFailed'));
  } finally {
    deleting.value = false;
  }
};
</script>
