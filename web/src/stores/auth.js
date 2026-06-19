import { defineStore } from 'pinia';
import api from '../api';

const buildPermissions = (roles = []) => {
  const perms = {};
  for (const role of roles) {
    for (const [menu, actions] of Object.entries(role.permissions || {})) {
      if (!perms[menu]) perms[menu] = { view: false, edit: false, delete: false };
      for (const [action, val] of Object.entries(actions)) {
        if (val) perms[menu][action] = true;
      }
    }
  }
  return perms;
};

const loadCache = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};

const saveCache = (user, permissions) => {
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_permissions', JSON.stringify(permissions));
};

const clearCache = () => {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_permissions');
};

export const useAuthStore = defineStore('auth', {
  state: () => {
    const user = loadCache('auth_user');
    const permissions = loadCache('auth_permissions');
    return {
      token: localStorage.getItem('token') || null,
      user,
      permissions,
      authReady: !!(user && permissions),
      hasKey: false,
      apiKeyId: null,
      apiKey: null,
      apiKeyPrefix: null,
      apiKeyStatus: null,
      apiKeyExpiresAt: null,
    };
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
    },
    async register(email, password) {
      const { data } = await api.post('/auth/register', { email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
    },
    async fetchMe() {
      const { data } = await api.get('/auth/me');
      this.user = data.user;
      this.permissions = buildPermissions(data.user?.roles || []);
      this.authReady = true;
      saveCache(this.user, this.permissions);
    },
    async updateProfile(fullName) {
      const { data } = await api.put('/auth/profile', { fullName });
      this.user = data.user;
      saveCache(this.user, this.permissions);
      return data.user;
    },
    async changePassword(currentPassword, newPassword) {
      await api.put('/auth/change-password', { currentPassword, newPassword });
    },
    async fetchApiKey() {
      const { data } = await api.get('/auth/api-key');
      // getApiKey returns { hasKey, keyId, keyPrefix, ... } — the full key is show-once
      // (never returned here), so display the stored prefix masked. Clear any stale full key.
      this.hasKey = !!data.hasKey;
      this.apiKeyId = data.keyId || null;
      this.apiKeyPrefix = data.keyPrefix || null;
      this.apiKeyStatus = data.apiKeyStatus || null;
      this.apiKeyExpiresAt = data.apiKeyExpiresAt || null;
      this.apiKey = null;
    },
    async regenerateApiKey() {
      const { data } = await api.post('/auth/api-key/regenerate');
      this.hasKey = true;
      this.apiKeyId = data.keyId;
      this.apiKey = data.apiKey; // full key — shown once, right after generation
      this.apiKeyPrefix = data.keyPrefix;
      this.apiKeyStatus = data.apiKeyStatus;
      this.apiKeyExpiresAt = data.apiKeyExpiresAt;
    },
    logout() {
      this.token = null;
      this.user = null;
      this.permissions = null;
      this.authReady = false;
      this.hasKey = false;
      this.apiKeyId = null;
      this.apiKey = null;
      this.apiKeyPrefix = null;
      this.apiKeyStatus = null;
      this.apiKeyExpiresAt = null;
      localStorage.removeItem('token');
      clearCache();
    },
  },
});
