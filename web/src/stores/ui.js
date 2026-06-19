import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    showLinkForm: false,
    editingLink: null,
    showLogModal: false,
    viewingLink: null,
    showLogoutConfirm: false,
    sidebarOpen: false,
  }),
  actions: {
    openCreate() { this.editingLink = null; this.showLinkForm = true; },
    openEdit(link) { this.editingLink = link; this.showLinkForm = true; },
    closeForm() { this.showLinkForm = false; this.editingLink = null; },
    openLogs(link) { this.viewingLink = link; this.showLogModal = true; },
    closeLogs() { this.showLogModal = false; this.viewingLink = null; },
  },
});
