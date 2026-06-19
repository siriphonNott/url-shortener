import { defineStore } from 'pinia';
import api from '../api';

export const useRolesStore = defineStore('roles', {
  state: () => ({
    roles: [],
    loading: false,
  }),
  actions: {
    async fetchRoles() {
      this.loading = true;
      try {
        const { data } = await api.get('/roles');
        this.roles = data.data;
      } finally {
        this.loading = false;
      }
    },
    async createRole(payload) {
      const { data } = await api.post('/roles', payload);
      this.roles.push(data.data);
      return data.data;
    },
    async updateRole(id, payload) {
      const { data } = await api.put(`/roles/${id}`, payload);
      const idx = this.roles.findIndex((r) => r._id === id);
      if (idx !== -1) this.roles[idx] = data.data;
      return data.data;
    },
    async deleteRole(id) {
      await api.delete(`/roles/${id}`);
      this.roles = this.roles.filter((r) => r._id !== id);
    },
  },
});
