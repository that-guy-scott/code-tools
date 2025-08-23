import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/helpers/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    },
    testTimeout: 10000, // 10s timeout for integration tests
    hookTimeout: 10000,
    pool: 'threads', // Use threads instead of forks to reduce memory overhead
    poolOptions: {
      threads: {
        singleThread: true // Use a single thread to minimize memory usage
      }
    }
  }
});