import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  build: {
    // The Pubky SDK inlines its WebAssembly module (about 3.5 MB) into one chunk.
    chunkSizeWarningLimit: 4500,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
