import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    __DEV__: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: false,
  },
  resolve: {
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: '@', replacement: path.resolve(__dirname, '.') },
      {
        find: '@liga/mobile-contracts/schemas',
        replacement: path.resolve(
          __dirname,
          '../../packages/mobile-contracts/src/schemas/index.ts',
        ),
      },
      {
        find: '@liga/mobile-contracts',
        replacement: path.resolve(__dirname, '../../packages/mobile-contracts/src/index.ts'),
      },
      {
        find: '@liga/mobile-core',
        replacement: path.resolve(__dirname, '../../packages/mobile-core/src/index.ts'),
      },
    ],
  },
})
