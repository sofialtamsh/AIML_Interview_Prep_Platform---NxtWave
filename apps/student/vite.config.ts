import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API is reached same-origin through /api, so session cookies stay first-party.
// API_PROXY_TARGET lets a second, isolated stack (e.g. browser checks) use another API.
const api = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5310,
    strictPort: true,
    proxy: { '/api': { target: api, changeOrigin: false } },
  },
  preview: { port: 4310, proxy: { '/api': api } },
  build: { sourcemap: true },
});
