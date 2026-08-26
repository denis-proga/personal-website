import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Django REST API работает на http://127.0.0.1:8000/api/
// Проксируем запросы в dev-режиме, чтобы не думать про CORS
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
