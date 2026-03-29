import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://ai-job-automation-system.onrender.com',
        changeOrigin: true,
        secure: true,
        timeout: 60000,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn('Proxy error:', err.message);
          });
        },
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'https://ai-job-automation-system.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})