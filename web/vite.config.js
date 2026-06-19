import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['test.dev'],
    proxy: {
      // Forward API calls to the local Worker (`wrangler dev` on :8787). The Worker routes
      // by hostname, so rewrite Host to api.* — otherwise a bare localhost falls through to
      // the redirect/landing path and the API is unreachable.
      '/api/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Host', 'api.eraflow.dev');
          });
        },
      },
    },
  },
});
