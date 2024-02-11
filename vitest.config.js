import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'contracts/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
