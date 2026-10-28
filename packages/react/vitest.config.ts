import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import {
  clickBackdrop,
  emulateReducedMotion,
  pointer,
  wheelOverBackdrop,
} from './vitest.commands.js';

declare const process: { env: { SENUI_BROWSERS?: string; SENUI_EXPECT_REACT?: string } };

// The browser project runs in Chromium (what CI installs). For a cross-browser run, install the
// others once (`pnpm --filter @senakster/senui exec playwright install firefox webkit`), then run it
// with the ssr project, whose markup the hydration test reads:
//   SENUI_BROWSERS=chromium,firefox,webkit pnpm --filter @senakster/senui exec vitest run --project ssr --project browser
const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
const browsers = (process.env.SENUI_BROWSERS ?? 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is (typeof BROWSERS)[number] =>
    (BROWSERS as readonly string[]).includes(name),
  );

// L08 decision 9: one id for this run, the same in every project. The ssr project stamps its fixtures
// with it, and the hydration test refuses fixtures from another run. Vitest evaluates this file more
// than once per process (found by the first full run), so the id lives on the process's globalThis.
const shared = globalThis as { __senuiSsrRun?: string };
shared.__senuiSsrRun ??= `${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
const ssrRun = shared.__senuiSsrRun;

declare module 'vitest' {
  export interface ProvidedContext {
    ssrRun: string;
    /** Decision 9a: the React version a run must resolve (`SENUI_EXPECT_REACT`), or `''`. */
    expectReact: string;
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    passWithNoTests: true,
    provide: { ssrRun, expectReact: process.env.SENUI_EXPECT_REACT ?? '' },
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
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}', 'src/**/*.ssr.test.{ts,tsx}'],
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
        // L08 decision 9: every story rendered in Node, as a server would. It writes the markup the
        // browser project's hydration test reads, so it runs in an earlier group. No setup file: the
        // DOM testing setup has no place on a server.
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['src/**/*.ssr.test.{ts,tsx}'],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // L03: what jsdom can't do (layout, real focus, computed styles) runs in Chromium. Name the
        // file `*.browser.test.tsx` and import the CSS it measures.
        extends: true,
        test: {
          name: 'browser',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.browser.test.{ts,tsx}'],
          sequence: { groupOrder: 1 },
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: browsers.map((browser) => ({ browser })),
            // L06: Playwright actions the browser context lacks (backdrop pointer, reduced motion).
            // L09: a pointer press split into down and up, for WCAG 2.5.2.
            commands: { clickBackdrop, emulateReducedMotion, pointer, wheelOverBackdrop },
          },
        },
      },
    ],
  },
});
