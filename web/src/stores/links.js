import { defineStore } from 'pinia';
import api from '../api';

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: [],
    loading: false,
    analytics: null,
    analyticsLoading: false,
  }),
  actions: {
    async fetchLinks() {
      this.loading = true;
      try {
        const { data } = await api.get('/links');
        this.links = data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchAnalytics() {
      this.analyticsLoading = true;
      try {
        const { data } = await api.get('/links/analytics');
        this.analytics = data;
      } finally {
        this.analyticsLoading = false;
      }
    },
    async createLink(payload) {
      const { data } = await api.post('/links', payload);
      await this.fetchLinks();
      return data;
    },
    async updateLink(id, payload) {
      const { data } = await api.put(`/links/${id}`, payload);
      const idx = this.links.findIndex((l) => l._id === id);
      if (idx !== -1) this.links[idx] = data.data;
      return data.data;
    },
    async deleteLink(id) {
      await api.delete(`/links/${id}`);
      this.links = this.links.filter((l) => l._id !== id);
    },
    async getLogs(id) {
      const { data } = await api.get(`/links/${id}/logs`);
      return data.data;
    },
  },
});
