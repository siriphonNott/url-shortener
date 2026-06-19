<template>
  <div class="px-4 lg:px-8 py-6 space-y-5">

    <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ $t('profile.title') }}</h1>

    <!-- Profile Information Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 bg-gray-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center shrink-0">
          <svg class="w-7 h-7 text-gray-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('profile.infoSection') }}</h2>
          <p class="text-sm text-gray-500 dark:text-slate-500">{{ $t('profile.infoDesc') }}</p>
        </div>
      </div>

      <!-- Fields -->
      <div class="space-y-3">
        <!-- Full Name -->
        <div class="relative border border-gray-200 dark:border-slate-700 rounded-xl px-4 pt-5 pb-3 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
          <label class="absolute top-2 left-4 text-xs text-gray-400 dark:text-slate-500 font-medium">{{ $t('profile.fullName') }}</label>
          <input
            v-model="profileForm.fullName"
            type="text"
            :disabled="!editing"
            placeholder="ชื่อ-นามสกุล"
            class="w-full text-sm text-gray-800 dark:text-slate-200 bg-transparent focus:outline-none disabled:cursor-default placeholder-gray-300 dark:placeholder-slate-600"
          />
        </div>

        <!-- Email (read-only) -->
        <div class="relative border border-gray-200 dark:border-slate-700 rounded-xl px-4 pt-5 pb-3 bg-gray-50 dark:bg-slate-800/50">
          <label class="absolute top-2 left-4 text-xs text-gray-400 dark:text-slate-500 font-medium">{{ $t('auth.email') }}</label>
          <input
            :value="auth.user?.email"
            type="email"
            disabled
            class="w-full text-sm text-gray-500 dark:text-slate-400 bg-transparent cursor-default focus:outline-none"
          />
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex justify-end gap-3 mt-5">
        <template v-if="!editing">
          <button
            @click="startEdit"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            {{ $t('profile.editBtn') }}
          </button>
        </template>
        <template v-else>
          <button
            @click="cancelEdit"
            class="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            @click="saveProfile"
            :disabled="profileLoading"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <svg v-if="profileLoading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ $t('profile.saveBtn') }}
          </button>
        </template>
      </div>
    </div>

    <!-- Change Password Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
      <div class="mb-5">
        <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">{{ $t('profile.passwordSection') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-500">{{ $t('profile.passwordDesc') }}</p>
      </div>

      <template v-if="!changingPassword">
        <p class="text-sm text-gray-500 dark:text-slate-500 mb-5">{{ $t('profile.passwordNote') }}</p>
        <div class="flex justify-end">
          <button
            @click="changingPassword = true"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            {{ $t('profile.changePasswordBtn') }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <!-- Current Password -->
          <div class="relative border border-gray-200 dark:border-slate-700 rounded-xl px-4 pt-5 pb-3 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
            <label class="absolute top-2 left-4 text-xs text-gray-400 dark:text-slate-500 font-medium">{{ $t('profile.currentPassword') }}</label>
            <div class="flex items-center gap-2">
              <input
                v-model="pwForm.current"
                :type="showCurrent ? 'text' : 'password'"
                class="flex-1 text-sm text-gray-800 dark:text-slate-200 bg-transparent focus:outline-none"
              />
              <button type="button" @click="showCurrent = !showCurrent" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showCurrent" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div class="relative border border-gray-200 dark:border-slate-700 rounded-xl px-4 pt-5 pb-3 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
            <label class="absolute top-2 left-4 text-xs text-gray-400 dark:text-slate-500 font-medium">{{ $t('profile.newPassword') }}</label>
            <div class="flex items-center gap-2">
              <input
                v-model="pwForm.newPw"
                :type="showNew ? 'text' : 'password'"
                class="flex-1 text-sm text-gray-800 dark:text-slate-200 bg-transparent focus:outline-none"
              />
              <button type="button" @click="showNew = !showNew" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showNew" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end gap-3 mt-5">
          <button
            @click="cancelPassword"
            class="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            @click="submitPassword"
            :disabled="pwLoading"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <svg v-if="pwLoading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ $t('profile.updatePasswordBtn') }}
          </button>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const auth = useAuthStore();
const toast = useToast();

// --- Profile ---
const editing = ref(false);
const profileLoading = ref(false);

const profileForm = reactive({ fullName: '' });

const startEdit = () => {
  profileForm.fullName = auth.user?.fullName || '';
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
};

const saveProfile = async () => {
  profileLoading.value = true;
  try {
    await auth.updateProfile(profileForm.fullName);
    editing.value = false;
    toast.success(t('profile.updated'));
  } catch (e) {
    toast.error(e.response?.data?.message || t('profile.updateFailed'));
  } finally {
    profileLoading.value = false;
  }
};

// --- Password ---
const changingPassword = ref(false);
const pwLoading = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);
const pwForm = reactive({ current: '', newPw: '' });

const cancelPassword = () => {
  changingPassword.value = false;
  pwForm.current = '';
  pwForm.newPw = '';
};

const submitPassword = async () => {
  if (!pwForm.current || !pwForm.newPw) {
    toast.error(t('profile.fillAllFields'));
    return;
  }
  pwLoading.value = true;
  try {
    await auth.changePassword(pwForm.current, pwForm.newPw);
    pwForm.current = '';
    pwForm.newPw = '';
    changingPassword.value = false;
    toast.success(t('profile.passwordChanged'));
  } catch (e) {
    toast.error(e.response?.data?.message || t('profile.passwordChangeFailed'));
  } finally {
    pwLoading.value = false;
  }
};

onMounted(async () => {
  if (auth.token && !auth.user) {
    await auth.fetchMe();
  }
  profileForm.fullName = auth.user?.fullName || '';
});
</script>
