import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' – aplikacja działa z dowolnego katalogu na hostingu statycznym.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
