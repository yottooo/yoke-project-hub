import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// docker-compose sets these: the API is reached by service name, and file
// events don't cross a Windows bind mount, so the watcher polls.
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:3000';
const USE_POLLING = process.env.VITE_USE_POLLING === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    watch: USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      // Both apps own /projects, so the browser calls /api/* and the prefix is stripped here.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
});
