import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

declare const process: { env: { SENUI_BROWSERS?: string } };

// The browser project runs in Chromium (what CI installs). For a cross-browser run, install the
// others once (`pnpm --filter @senakster/react exec playwright install firefox webkit`), then:
//   SENUI_BROWSERS=chromium,firefox,webkit pnpm --filter @senakster/react exec vitest run --project browser
const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
const browsers = (process.env.SENUI_BROWSERS ?? 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is (typeof BROWSERS)[number] =>
    (BROWSERS as readonly string[]).includes(name),
  );

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
    // a11y-contracts.test.ts finds components with import.meta.glob. The persistent module cache
    // keys a file on its own content, not on what its globs match, so a new component would go
    // unchecked locally until the test file itself changed. Found by probe in L02.
    fsModuleCache: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
          // Type tests (L02): `*.test-d.tsx` files are type-checked by tsc, never executed. A wrong
          // prop, or an `@ts-expect-error` that no longer errors, fails `pnpm test`.
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.{ts,tsx}'],
            tsconfig: './tsconfig.json',
          },
        },
      },
      {
        // L03: what jsdom can't do (layout, real focus, computed styles) runs in Chromium. Name the
        // file `*.browser.test.tsx` and import the CSS it measures.
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: browsers.map((browser) => ({ browser })),
          },
        },
      },
    ],
  },
});
