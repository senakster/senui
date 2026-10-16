import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// axe wiring lands in L03.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    // a11y-contracts.test.ts finds components with import.meta.glob. The persistent module cache
    // keys a file on its own content, not on what its globs match, so a new component would go
    // unchecked locally until the test file itself changed. Found by probe in L02.
    fsModuleCache: false,
    // Type tests (L02): `*.test-d.tsx` files are type-checked by tsc, never executed. A wrong
    // prop, or an `@ts-expect-error` that no longer errors, fails `pnpm test`.
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.{ts,tsx}'],
      tsconfig: './tsconfig.json',
    },
  },
});
