import { defineStore } from 'pinia';

const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const useUIStore = defineStore('ui', {
  state: () => ({
    showLinkForm: false,
    editingLink: null,
    showLogModal: false,
    viewingLink: null,
    showLogoutConfirm: false,
    sidebarOpen: false,
    sidebarCollapsed: readCollapsed(),
  }),
  actions: {
    openCreate() { this.editingLink = null; this.showLinkForm = true; },
    openEdit(link) { this.editingLink = link; this.showLinkForm = true; },
    closeForm() { this.showLinkForm = false; this.editingLink = null; },
    openLogs(link) { this.viewingLink = link; this.showLogModal = true; },
    closeLogs() { this.showLogModal = false; this.viewingLink = null; },
    toggleSidebarCollapsed() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.sidebarCollapsed));
      } catch {
        /* localStorage unavailable (private mode); state stays in-memory only */
      }
    },
  },
});
