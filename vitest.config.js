import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom replaces Buffer with its own implementation, but ethers expects a
    // Buffer class that inherits from Uint8Array. The easiest known workaround
    // for this issue is to use happy-dom.
    // https://github.com/ethers-io/ethers.js/issues/4365#issuecomment-1852935136
    // https://github.com/jestjs/jest/issues/9983
    environment: 'happy-dom',
    exclude: [...configDefaults.exclude, 'contracts/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
