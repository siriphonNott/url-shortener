<template>
  <div class="px-4 lg:px-8 py-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('roles.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-slate-500">{{ $t('roles.total', { n: store.roles.length }) }}</p>
      </div>
      <button
        @click="openModal()"
        class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        {{ $t('roles.addBtn') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Empty -->
    <div v-else-if="!store.roles.length"
      class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 p-12 text-center">
      <svg class="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <p class="text-sm text-gray-500 dark:text-slate-400 font-medium">{{ $t('roles.noRoles') }}</p>
      <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">{{ $t('roles.noRolesHint') }}</p>
    </div>

    <!-- Role cards -->
    <div v-else class="space-y-4">
      <div
        v-for="role in store.roles"
        :key="role._id"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <!-- Role header -->
        <div class="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700/60">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-gray-900 dark:text-slate-100">{{ role.name }}</p>
              <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ role.description || $t('roles.noDescription') }} · {{ $t('roles.userCount', { n: role.userCount || 0 }) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="openModal(role)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="deleteTarget = role"
              class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Permission matrix (read-only) -->
        <div class="px-6 py-4 overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr>
                <th class="text-left text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider pb-2 pr-4 w-32 whitespace-nowrap">{{ $t('roles.menu') }}</th>
                <th v-for="action in ACTIONS" :key="action.key"
                  class="text-center text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider pb-2 px-3 w-16 whitespace-nowrap">
                  {{ action.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-slate-800">
              <tr v-for="menu in MENUS" :key="menu.key">
                <td class="py-2 pr-4 text-gray-600 dark:text-slate-400 font-medium">{{ menu.label }}</td>
                <td v-for="action in ACTIONS" :key="action.key" class="py-2 px-3 text-center">
                  <span v-if="role.permissions?.[menu.key]?.[action.key]"
                    class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <svg class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span v-else class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-slate-800">
                    <svg class="w-3 h-3 text-gray-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showModal = false">
          <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
            <div v-if="showModal" class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700">

              <!-- Modal header -->
              <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-700">
                <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ editTarget ? $t('roles.editTitle') : $t('roles.addTitle') }}</h3>
                <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
                <!-- Name + Description -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('roles.roleName') }} <span class="text-red-500">*</span></label>
                    <input v-model="form.name" required type="text" :placeholder="$t('roles.roleNamePlaceholder')"
                      class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('roles.description') }}</label>
                    <input v-model="form.description" type="text" :placeholder="$t('roles.descriptionPlaceholder')"
                      class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>

                <!-- Permission matrix -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-slate-300">{{ $t('roles.permissions') }}</label>
                    <div class="flex gap-2">
                      <button type="button" @click="selectAll(true)"
                        class="text-xs text-blue-600 dark:text-blue-400 hover:underline">{{ $t('roles.selectAll') }}</button>
                      <span class="text-gray-300 dark:text-slate-600">·</span>
                      <button type="button" @click="selectAll(false)"
                        class="text-xs text-gray-500 dark:text-slate-400 hover:underline">{{ $t('roles.clearAll') }}</button>
                    </div>
                  </div>

                  <div class="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-700">
                          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{{ $t('roles.menu') }}</th>
                          <th v-for="action in ACTIONS" :key="action.key" class="px-4 py-3 text-center whitespace-nowrap">
                            <div class="flex flex-col items-center gap-1.5">
                              <label class="inline-flex items-center justify-center cursor-pointer" :title="`Toggle all ${action.label}`">
                                <input type="checkbox" :checked="allActionChecked(action.key)"
                                  @change="toggleAction(action.key)" class="sr-only peer" />
                                <div class="w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center
                                  peer-checked:bg-blue-600 peer-checked:border-blue-600
                                  border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800
                                  hover:border-blue-400 dark:hover:border-blue-500">
                                  <svg class="w-3 h-3 text-white transition-all" :class="allActionChecked(action.key) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </label>
                              <span class="text-xs font-semibold uppercase tracking-wider"
                                :class="allActionChecked(action.key) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'">
                                {{ action.label }}
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-slate-700/60">
                        <tr v-for="menu in MENUS" :key="menu.key"
                          class="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <svg class="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="menu.d" />
                              </svg>
                              <span class="font-medium text-gray-700 dark:text-slate-300">{{ menu.label }}</span>
                            </div>
                          </td>
                          <td v-for="action in ACTIONS" :key="action.key" class="px-4 py-3 text-center">
                            <label class="inline-flex items-center justify-center cursor-pointer">
                              <input type="checkbox"
                                :checked="form.permissions[menu.key]?.[action.key] || false"
                                @change="togglePerm(menu.key, action.key, $event.target.checked)"
                                class="sr-only peer" />
                              <div class="w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center
                                peer-checked:bg-blue-600 peer-checked:border-blue-600
                                border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800
                                hover:border-blue-400 dark:hover:border-blue-500">
                                <svg class="w-3 h-3 text-white transition-all"
                                  :class="form.permissions[menu.key]?.[action.key] ? 'opacity-100 scale-100' : 'opacity-0 scale-0'"
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Error -->
                <div v-if="formError" class="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 rounded-xl">
                  <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  {{ formError }}
                </div>

                <div class="flex gap-3 pt-1">
                  <button type="button" @click="showModal = false"
                    class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200">
                    {{ $t('common.cancel') }}
                  </button>
                  <button type="submit" :disabled="submitting"
                    class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                    <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {{ editTarget ? $t('common.saveChanges') : $t('roles.addTitle') }}
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirmation -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="deleteTarget = null">
          <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div class="text-center">
              <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('roles.deleteTitle') }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {{ $t('roles.deleteConfirm', { name: deleteTarget?.name }) }}
              </p>
            </div>
            <div class="flex gap-3">
              <button @click="deleteTarget = null"
                class="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200">
                {{ $t('common.cancel') }}
              </button>
              <button @click="handleDelete" :disabled="deleting"
                class="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                <svg v-if="deleting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRolesStore } from '../stores/roles';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const store = useRolesStore();
const toast = useToast();

const MENUS = computed(() => [
  { key: 'dashboard', label: t('roles.menuDashboard'), d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'urls',      label: t('roles.menuUrls'),      d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' },
  { key: 'users',     label: t('roles.menuUsers'),     d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'docs',      label: t('roles.menuDocs'),      d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'api_key',   label: t('roles.menuApiKey'),   d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { key: 'api_keys',  label: t('roles.menuApiKeyMgmt'), d: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { key: 'roles',     label: t('roles.menuRoles'),     d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
]);
const ACTION_KEYS = ['view', 'edit', 'delete'];
const ACTIONS = computed(() => ACTION_KEYS.map((key) => ({
  key,
  label: t(`roles.${key}`),
})));

// Modal state
const showModal = ref(false);
const editTarget = ref(null);
const submitting = ref(false);
const formError = ref('');

const emptyPermissions = () =>
  Object.fromEntries(MENUS.value.map((m) => [m.key, { view: false, edit: false, delete: false }]));

const form = ref({ name: '', description: '', permissions: emptyPermissions() });

const openModal = (role = null) => {
  editTarget.value = role;
  formError.value = '';
  if (role) {
    const perms = emptyPermissions();
    for (const m of MENUS.value) {
      if (role.permissions?.[m.key]) {
        perms[m.key] = { ...perms[m.key], ...role.permissions[m.key] };
      }
    }
    form.value = { name: role.name, description: role.description || '', permissions: perms };
  } else {
    form.value = { name: '', description: '', permissions: emptyPermissions() };
  }
  showModal.value = true;
};

const togglePerm = (menu, action, val) => {
  if (!form.value.permissions[menu]) form.value.permissions[menu] = {};
  form.value.permissions[menu][action] = val;
};

const selectAll = (val) => {
  for (const m of MENUS.value) {
    for (const a of ACTION_KEYS) form.value.permissions[m.key][a] = val;
  }
};

const allActionChecked = (action) => MENUS.value.every((m) => form.value.permissions[m.key]?.[action]);
const allMenuChecked = (menuKey) => ACTION_KEYS.every((a) => form.value.permissions[menuKey]?.[a]);

const toggleAction = (action) => {
  const all = allActionChecked(action);
  for (const m of MENUS.value) form.value.permissions[m.key][action] = !all;
};

const toggleMenu = (menuKey, val) => {
  for (const a of ACTION_KEYS) form.value.permissions[menuKey][a] = val;
};

const handleSubmit = async () => {
  formError.value = '';
  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.updateRole(editTarget.value._id, form.value);
      toast.success(t('roles.updated'));
    } else {
      await store.createRole(form.value);
      toast.success(t('roles.created'));
    }
    showModal.value = false;
  } catch (e) {
    formError.value = e.response?.data?.message || 'Something went wrong';
  } finally {
    submitting.value = false;
  }
};

// Delete
const deleteTarget = ref(null);
const deleting = ref(false);

const handleDelete = async () => {
  deleting.value = true;
  try {
    await store.deleteRole(deleteTarget.value._id);
    toast.success(t('roles.deleted'));
    deleteTarget.value = null;
  } catch {
    toast.error(t('roles.deleteFailed'));
  } finally {
    deleting.value = false;
  }
};

onMounted(() => store.fetchRoles());
</script>
