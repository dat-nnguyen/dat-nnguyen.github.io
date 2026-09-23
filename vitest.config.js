import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/frontend/**', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: [
        'backend/**/*.js',
        'api-gateway/**/*.js',
        'scripts/**/*.js',
        'frontend/utils.js',
      ],
      exclude: [
        '**/node_modules/**',
        'dist/**',
        'frontend/dist/**',
        '**/*.test.js',
        'vitest.config.js',
        'frontend/vite.config.js',
        'backend/package.json',
      ],
    },
  },
});
