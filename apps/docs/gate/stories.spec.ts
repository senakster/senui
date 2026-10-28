// L08: the gate's own bookkeeping. Runs once, in the first engine only.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loadDocs } from './docs.js';
import { exceptionErrors, exceptionFor } from './exceptions.js';
import { contractFor, loadStories } from './stories.js';

const stories = loadStories();
/** The package's generated manifest, as the site serves it (main.ts copies it at build time). */
const MANIFEST = fileURLToPath(new URL('../storybook-static/components.json', import.meta.url));

test.describe('gate bookkeeping', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Static: one engine is enough');

  test('exceptions and skip tags agree, and none has expired (decision 12)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(exceptionErrors(stories, today)).toEqual([]);
  });

  test("every story is in Storybook's test set, unless excepted", () => {
    const untested = stories.filter(
      (story) => !story.tags.includes('test') && !exceptionFor(story, 'test-tag'),
    );
    expect(untested.map((story) => story.id)).toEqual([]);
  });

  test("every story's component has an a11y contract", async () => {
    const missing: string[] = [];
    for (const story of stories) {
      await contractFor(story).catch((error: unknown) => {
        missing.push(`${story.id}: ${String(error)}`);
      });
    }
    expect(missing).toEqual([]);
  });

  // L09 decision 8: the manifest's story ids are informative, and computed by the package's
  // generator from Storybook's id rules; this checks them against the real, built index.
  test("every story the package's manifest names is in the built Storybook", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      components: Record<string, { stories: { id: string }[] }>;
    };
    const built = new Set(stories.map((story) => story.id));
    const missing = Object.entries(manifest.components).flatMap(([name, component]) =>
      component.stories.filter((story) => !built.has(story.id)).map((s) => `${name}: ${s.id}`),
    );
    expect(missing).toEqual([]);
  });

  // L09 decision 9: each component has a docs page, which docs.spec.ts checks as a page.
  test('every component has a docs page', () => {
    const pages = new Set(loadDocs().map((docs) => docs.title));
    const missing = [...new Set(stories.map((story) => story.title))].filter((t) => !pages.has(t));
    expect(missing).toEqual([]);
  });

  // L09 "Storybook's own manifest": development only, never deployed (decision 1).
  test('the built site contains no Storybook manifest (storybook-static/manifests/)', () => {
    expect(
      existsSync(fileURLToPath(new URL('../storybook-static/manifests', import.meta.url))),
    ).toBe(false);
  });

  // Decision 4, `forcedColors` rows: a component that keeps states visible by border or system
  // colour has a story the forced-colours screenshots cover.
  test('every border or system-colour component has a forced-colors story', async () => {
    const components = [...new Set(stories.map((story) => story.component))];
    const missing: string[] = [];
    for (const component of components) {
      const own = stories.filter((story) => story.component === component);
      const first = own[0];
      if (!first) continue;
      const { forcedColors } = (await contractFor(first)).adaptation;
      if (forcedColors === 'no-states') continue;
      if (!own.some((story) => story.tags.includes('forced-colors'))) {
        missing.push(`${component} (${forcedColors})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
