import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';

// The project's single version lives in the ROOT package.json (one level up from web/).
// Expose it through the standard VITE_ env channel so the client reads it via
// `import.meta.env.VITE_APP_VERSION`, like every other build-time value in this app.
process.env.VITE_APP_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
).version;

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
            proxyReq.setHeader('Host', 'api.blly.to');
          });
        },
      },
    },
  },
});
