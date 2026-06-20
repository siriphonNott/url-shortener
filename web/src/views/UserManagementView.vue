<template>
  <div class="px-4 lg:px-8 py-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('users.title') }}</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">{{ $t('users.total', { n: store.pagination.total }) }}</p>
      </div>
      <button
        @click="openModal()"
        class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        {{ $t('users.addBtn') }}
      </button>
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
            :placeholder="$t('users.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div class="w-44 shrink-0">
          <AppSelect
            v-model="statusFilter"
            @change="onFilterChange"
            :options="[
              { value: '',                      label: $t('common.allStatuses') },
              { value: 'active',                label: $t('common.active'),               dot: 'bg-emerald-500' },
              { value: 'inactive',              label: $t('common.inactive'),             dot: 'bg-gray-400' },
              { value: 'suspended',             label: $t('common.suspended'),            dot: 'bg-red-500' },
              { value: 'pending_verification',  label: $t('common.pendingVerification'), dot: 'bg-amber-500' },
            ]"
            :placeholder="$t('common.allStatuses')"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <!-- Loading -->
        <div v-if="store.loading" class="p-16 flex flex-col items-center gap-3 text-gray-500 dark:text-slate-500">
          <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm">{{ $t('common.loading') }}</span>
        </div>

        <!-- Empty -->
        <div v-else-if="!store.users.length" class="p-16 flex flex-col items-center gap-3">
          <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
            <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p class="font-semibold text-gray-700 dark:text-slate-300">{{ $t('users.noUsers') }}</p>
          <p class="text-sm text-gray-500 dark:text-slate-500">{{ $t('users.noUsersHint') }}</p>
        </div>

        <!-- Table -->
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('users.userCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('users.accountTypeCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('users.rolesCol') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('common.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{{ $t('users.createdCol') }}</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-slate-700/70">
            <tr
              v-for="user in store.users"
              :key="user.id"
              class="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- User info -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    :class="avatarClass(user.email)">
                    {{ initials(user.fullName || user.email) }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-900 dark:text-slate-100 truncate">{{ user.fullName || '—' }}</p>
                    <p class="text-xs text-gray-600 dark:text-slate-400 truncate">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <!-- Account type -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg" :class="accountTypeClass(user.accountType)">
                  {{ user.accountType }}
                </span>
              </td>
              <!-- Roles -->
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span v-if="!user.roles?.length" class="text-xs text-gray-500 dark:text-slate-500">—</span>
                  <span v-for="role in user.roles" :key="role.id"
                    class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {{ role.name }}
                  </span>
                </div>
              </td>
              <!-- Status -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" :class="statusClass(user.status)">
                  <span class="w-1.5 h-1.5 rounded-full bg-current" />
                  {{ statusLabel(user.status) }}
                </span>
              </td>
              <!-- Created -->
              <td class="px-4 py-3.5 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap">
                {{ formatDate(user.createdAt) }}
              </td>
              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openModal(user)"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    :title="$t('common.edit')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(user)"
                    class="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    :title="$t('common.delete')"
                  >
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

      <!-- Pagination -->
      <div v-if="store.pagination.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-slate-700 gap-4">
        <span class="text-sm font-medium text-gray-600 dark:text-slate-400 shrink-0">
          {{ $t('users.total', { n: store.pagination.total }) }}
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
            v-for="p in pageNumbers"
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

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showModal = false">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
          >
            <div v-if="showModal" class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700">
              <div class="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700">
                <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ editTarget ? $t('users.editTitle') : $t('users.addTitle') }}</h3>
                <button @click="showModal = false" class="text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-4">
                <!-- Full Name -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('users.fullName') }}</label>
                  <input v-model="form.fullName" type="text" :placeholder="$t('users.fullNamePlaceholder')"
                    class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <!-- Email -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('auth.email') }} <span class="text-red-500">*</span></label>
                  <input v-model="form.email" type="email" required placeholder="user@example.com"
                    class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <!-- Password (add only) -->
                <div v-if="!editTarget">
                  <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('users.password') }} <span class="text-red-500">*</span></label>
                  <input v-model="form.password" type="password" required :placeholder="$t('users.passwordHint')"
                    class="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <!-- Roles -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('users.roles') }}</label>
                  <div class="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 min-h-[44px]">
                    <label v-for="role in rolesStore.roles" :key="role._id"
                      class="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" :value="role._id"
                        :checked="form.roles.includes(role._id)"
                        @change="toggleRole(role._id, $event.target.checked)"
                        class="w-3.5 h-3.5 rounded accent-blue-600" />
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        {{ role.name }}
                      </span>
                    </label>
                    <span v-if="!rolesStore.roles.length" class="text-xs text-gray-500 dark:text-slate-400">{{ $t('users.noRoles') }}</span>
                  </div>
                </div>

                <!-- Account Type + Status -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('users.accountType') }}</label>
                    <AppSelect
                      v-model="form.accountType"
                      :options="[
                        { value: 'free',       label: $t('common.free'),       dot: 'bg-gray-400' },
                        { value: 'premium',    label: $t('common.premium'),    dot: 'bg-blue-500' },
                        { value: 'enterprise', label: $t('common.enterprise'), dot: 'bg-violet-500' },
                      ]"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">{{ $t('common.status') }}</label>
                    <AppSelect
                      v-model="form.status"
                      :options="[
                        { value: 'active',               label: $t('common.active'),    dot: 'bg-emerald-500' },
                        { value: 'inactive',             label: $t('common.inactive'),  dot: 'bg-gray-400' },
                        { value: 'suspended',            label: $t('common.suspended'), dot: 'bg-red-500' },
                        { value: 'pending_verification', label: $t('common.pending'),   dot: 'bg-amber-500' },
                      ]"
                    />
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
                    {{ editTarget ? $t('common.saveChanges') : $t('users.addTitle') }}
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
              <h3 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('users.deleteTitle') }}</h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {{ $t('users.deleteConfirm', { name: deleteTarget.fullName || deleteTarget.email }) }}
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
import { useUsersStore } from '../stores/users';
import { useRolesStore } from '../stores/roles';
import { useToast } from '../composables/useToast';
import AppSelect from '../components/AppSelect.vue';

const { t } = useI18n();
const store = useUsersStore();
const rolesStore = useRolesStore();
const toast = useToast();

const search = ref('');
const statusFilter = ref('');
const perPage = ref(5);
let searchTimer;

const onFilterChange = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    store.fetchUsers({ page: 1, limit: perPage.value, search: search.value, status: statusFilter.value });
  }, 300);
};

const goPage = (p) => {
  if (p < 1 || p > store.pagination.pages) return;
  store.fetchUsers({ page: p, limit: perPage.value, search: search.value, status: statusFilter.value });
};

const pageNumbers = computed(() => {
  const { page, pages } = store.pagination;
  const range = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) range.push(i);
  return range;
});

// Modal
const showModal = ref(false);
const editTarget = ref(null);
const submitting = ref(false);
const formError = ref('');
const form = ref({ fullName: '', email: '', password: '', accountType: 'free', status: 'active', roles: [] });

const openModal = (user = null) => {
  editTarget.value = user;
  formError.value = '';
  form.value = user
    ? { fullName: user.fullName, email: user.email, password: '', accountType: user.accountType, status: user.status, roles: (user.roles || []).map((r) => r.id) }
    : { fullName: '', email: '', password: '', accountType: 'free', status: 'active', roles: [] };
  showModal.value = true;
};

const toggleRole = (roleId, checked) => {
  if (checked) {
    if (!form.value.roles.includes(roleId)) form.value.roles.push(roleId);
  } else {
    form.value.roles = form.value.roles.filter((id) => id !== roleId);
  }
};

const handleSubmit = async () => {
  formError.value = '';
  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.updateUser(editTarget.value.id, {
        fullName: form.value.fullName,
        email: form.value.email,
        accountType: form.value.accountType,
        status: form.value.status,
        roles: form.value.roles,
      });
      toast.success(t('users.updated'));
    } else {
      await store.createUser(form.value);
      await store.fetchUsers({ page: 1, search: search.value, status: statusFilter.value });
      toast.success(t('users.created'));
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

const confirmDelete = (user) => { deleteTarget.value = user; };

const handleDelete = async () => {
  deleting.value = true;
  try {
    await store.deleteUser(deleteTarget.value.id);
    toast.success(t('users.deleted'));
    deleteTarget.value = null;
  } catch {
    toast.error(t('users.deleteFailed'));
  } finally {
    deleting.value = false;
  }
};

// Helpers
const initials = (name) => name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const avatarColors = ['bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'];
const avatarClass = (email) => avatarColors[email.charCodeAt(0) % avatarColors.length];

const accountTypeClass = (type) => ({
  free: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  premium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  enterprise: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}[type] ?? '');

const statusClass = (s) => ({
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  inactive: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  suspended: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  pending_verification: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
}[s] ?? '');

const statusLabel = (s) => ({
  active: t('common.active'),
  inactive: t('common.inactive'),
  suspended: t('common.suspended'),
  pending_verification: t('common.pending'),
}[s] ?? s);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

onMounted(() => {
  store.fetchUsers();
  rolesStore.fetchRoles();
});
</script>
