import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// axe wiring lands in L03; type tests (`*.test-d.tsx`) are switched on in L02.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
