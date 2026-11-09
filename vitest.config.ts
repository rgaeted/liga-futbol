import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}', 'packages/*/tests/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
