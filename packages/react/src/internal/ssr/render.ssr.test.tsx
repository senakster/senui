import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from 'react';
import { renderToString, version as serverVersion } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, expect, inject, test, vi } from 'vitest';
import { expectReactVersion } from '../testing/react-version.js';
import { allStories, FIXTURES, MANIFEST, type Manifest } from './stories.js';

// L08 decision 9: every story renders in Node, without a warning, and its markup is written for
// hydrate.browser.test.tsx. The `ssr` project runs in an earlier group than the browser project
// (vitest.config.ts), and stamps the fixtures with this run's id, so the hydration test can refuse
// fixtures an earlier run left. A component that reads `window` or `document` during render throws
// here; one that renders differently on the client fails hydration.
const dir = fileURLToPath(new URL(`../../../${FIXTURES}`, import.meta.url));
const components = fileURLToPath(new URL('../../components', import.meta.url));
const stories = allStories();
const written: string[] = [];

beforeAll(() => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Written last, and only listing what rendered: a story that failed here has no fixture to hydrate.
afterAll(() => {
  const manifest: Manifest = { run: inject('ssrRun'), ids: written };
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest));
});

test('resolves the React the run expects', () => {
  expectReactVersion({ react: version, 'react-dom/server': serverVersion });
});

// An empty glob would make every test below vanish and the project pass.
test('finds the stories of every component that has them', () => {
  const withStories = readdirSync(components).filter((name) =>
    existsSync(join(components, name, `${name}.stories.tsx`)),
  );
  const found = new Set(stories.map(([id]) => id.split('--')[0]));
  expect(withStories.length).toBeGreaterThan(0);
  expect([...found].sort()).toEqual(withStories.sort());
});

test.each(stories)('%s renders on the server', (id, Story) => {
  const logged: unknown[][] = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => logged.push(args));
  vi.spyOn(console, 'warn').mockImplementation((...args) => logged.push(args));

  const markup = renderToString(<Story />);

  expect(logged).toEqual([]);
  writeFileSync(join(dir, `${id}.html`), markup);
  written.push(id);
});
