import { defineConfig, devices } from '@playwright/test';

// L08: the gate over the built static Storybook. `pnpm test:gate` builds the packages and the
// Storybook first; this config only serves and checks what was built.
//
// Engines come from SENUI_GATE_BROWSERS (comma-separated chromium, firefox, webkit), Chromium by
// default: PRs run Chromium. All three run locally, or in gate-full.yml when it is enabled (it is
// disabled for budget reasons; L08 decision 11).
const ENGINES = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};
type Engine = keyof typeof ENGINES;
const engines = (process.env.SENUI_GATE_BROWSERS ?? 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is Engine => name in ENGINES);

const PORT = 6107;

export default defineConfig({
  testDir: './gate',
  fullyParallel: true,
  // CI's runner has 4 vCPUs and Playwright defaults to half. The docs pages (L09) pushed the gate
  // step past its 15-minute timeout on 2 workers; 4 keeps it within the 10-minute budget (Emil,
  // 2026-10-28). Locally the default stays.
  ...(process.env.CI ? { workers: 4 } : {}),
  // L08 decision 7: one baseline per story and scheme, with no platform in the name, because they
  // are generated and compared only in the pinned Linux container. CI never writes a missing one.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${String(PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: engines.map((name) => ({
    name,
    // An explicit viewport, never the device default (L08 "Viewport").
    use: { ...devices[ENGINES[name]], viewport: { width: 1280, height: 800 } },
  })),
  webServer: {
    command: `pnpm exec vite preview --outDir storybook-static --port ${String(PORT)} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${String(PORT)}/iframe.html`,
    // Never adopt a server that was already running: it may serve another build (rule 22).
    reuseExistingServer: false,
  },
});
