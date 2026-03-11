import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'info',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
      'motion-dom': path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        './node_modules/motion-dom/dist/cjs/index.js'
      ),
    },
  },
});
