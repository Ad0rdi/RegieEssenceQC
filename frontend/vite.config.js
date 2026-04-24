import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./src/testSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: [
        'src/main.jsx',
        'src/App.jsx',
        '**/__tests__/**',
        '**/*.test.js',
        '**/*.test.jsx',
      ],
    },
  },
  base: '/RegieEssenceQC/',
})
