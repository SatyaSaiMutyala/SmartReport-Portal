import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API_PROXY lets the dev server target another backend (e.g. one wired to the mock LIMS)
      '/api': process.env.API_PROXY || 'http://localhost:5000',
    },
  },
})
