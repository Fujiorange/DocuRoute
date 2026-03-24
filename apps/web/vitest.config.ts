import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@docuroute/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@docuroute/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@docuroute/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@docuroute/emails': path.resolve(__dirname, '../../packages/emails/src/index.ts'),
    },
  },
})
