import { defineStore } from 'pinia';
import api from '../api';

export const useApiKeysStore = defineStore('apiKeys', {
  state: () => ({
    keys: [],
    pagination: { total: 0, page: 1, limit: 5, pages: 1 },
    loading: false,
  }),
  actions: {
    async fetchKeys({ search = '', status = '', page = 1, limit = 5 } = {}) {
      this.loading = true;
      try {
        const params = { page, limit };
        if (search) params.search = search;
        if (status) params.status = status;
        const { data } = await api.get('/api-keys', { params });
        this.keys = data.keys;
        this.pagination = data.pagination;
      } finally {
        this.loading = false;
      }
    },
    async createKey(payload) {
      const { data } = await api.post('/api-keys', payload);
      return data;
    },
    async updateKey(id, payload) {
      const { data } = await api.put(`/api-keys/${id}`, payload);
      const idx = this.keys.findIndex((k) => k.id === id);
      if (idx !== -1) this.keys[idx] = data;
      return data;
    },
    async deleteKey(id) {
      await api.delete(`/api-keys/${id}`);
      this.keys = this.keys.filter((k) => k.id !== id);
      this.pagination.total = Math.max(0, this.pagination.total - 1);
    },
  },
});
