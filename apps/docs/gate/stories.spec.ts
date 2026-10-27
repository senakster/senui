// L08: the gate's own bookkeeping. Runs once, in the first engine only.
import { expect, test } from '@playwright/test';
import { exceptionErrors, exceptionFor } from './exceptions.js';
import { contractFor, loadStories } from './stories.js';

const stories = loadStories();

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
