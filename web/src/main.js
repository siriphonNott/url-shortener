import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { i18n } from './i18n';
import { useTheme } from './composables/useTheme';
import { useAuthStore } from './stores/auth';
import './style.css';

useTheme().init();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);

// On a fresh load/refresh, if we have a token, always re-fetch /me so user + roles +
// permissions are current (the store hydrates from a cached snapshot first). Awaited
// before mount so route guards evaluate against fresh permissions. A 401 (expired token)
// is handled by the axios interceptor (clears token → redirects to /login).
const auth = useAuthStore();
async function boot() {
  if (auth.token) {
    try {
      await auth.fetchMe();
    } catch {
      /* ignore — interceptor handles 401; cached state covers transient errors */
    }
  }
  app.mount('#app');
}

boot();
