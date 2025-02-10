import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()], // ✅ No need to import tailwindcss here
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
