import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['localhost', '127.0.0.1', '.ngrok-free.dev', '.ngrok.app'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3100',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
