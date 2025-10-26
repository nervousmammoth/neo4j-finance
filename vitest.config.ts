import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/unit/**/*.test.ts', '__tests__/integration/**/*.test.ts'],
    exclude: ['node_modules', '__tests__/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        '**/*.d.ts',
        '.next/',
        'coverage/',
        'issues/',
        'app/**', // Exclude app skeleton for Issue 001
        'lib/utils.ts', // Exclude utils boilerplate for Issue 001
        'components/ui/**', // Exclude shadcn components
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
