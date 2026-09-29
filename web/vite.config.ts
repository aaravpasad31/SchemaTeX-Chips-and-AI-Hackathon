import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Forward API calls to the Python server (server/app.py).
    proxy: {
      '/api': process.env.SCHEMATEX_API ?? 'http://127.0.0.1:3001',
    },
    // examples/ lives outside the web root.
    fs: {
      allow: ['..'],
    },
  },
})
