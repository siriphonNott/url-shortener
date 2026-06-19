import { defineStore } from 'pinia';
import api from '../api';

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    pagination: { total: 0, page: 1, limit: 5, pages: 1 },
    loading: false,
  }),
  actions: {
    async fetchUsers({ page = 1, limit = 5, search = '', status = '' } = {}) {
      this.loading = true;
      try {
        const { data } = await api.get('/users', { params: { page, limit, search, status } });
        this.users = data.data;
        this.pagination = data.pagination;
      } finally {
        this.loading = false;
      }
    },
    async createUser(payload) {
      const { data } = await api.post('/users', payload);
      return data.data;
    },
    async updateUser(id, payload) {
      const { data } = await api.put(`/users/${id}`, payload);
      const idx = this.users.findIndex((u) => u.id === id);
      if (idx !== -1) this.users[idx] = data.data;
      return data.data;
    },
    async deleteUser(id) {
      await api.delete(`/users/${id}`);
      this.users = this.users.filter((u) => u.id !== id);
      this.pagination.total -= 1;
    },
  },
});
