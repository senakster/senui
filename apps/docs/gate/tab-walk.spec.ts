// L08 decisions 6a and 6b: Tab through every story. At each stop, focus is keyboard focus, on
// something named and reachable, not covered (2.4.11), and its ring is real: drawn, not
// transparent, not clipped, not painted over, and at least 3:1 against what's behind it (1.4.11).
import { expect, test } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { injectMeasure, loadStories, openStory } from './stories.js';
import { walk } from './walk.js';

for (const story of loadStories()) {
  test(`tab walk: ${story.id}`, async ({ page, browserName }) => {
    test.skip(Boolean(exceptionFor(story, 'tab-walk')), 'Excepted (exceptions.json)');
    await openStory(page, story);
    await injectMeasure(page);
    const failures = await walk(page, browserName, true);
    expect(failures, `${story.id}: tab walk`).toEqual([]);
  });

  // 2.4.11 again on a short viewport, where sticky headers and footers take most of the height.
  test(`tab walk, short viewport: ${story.id}`, async ({ page, browserName }) => {
    test.skip(Boolean(exceptionFor(story, 'tab-walk')), 'Excepted (exceptions.json)');
    await page.setViewportSize({ width: 1280, height: 320 });
    await openStory(page, story);
    await injectMeasure(page);
    const failures = (await walk(page, browserName, false)).filter((f) => f.includes('covered'));
    expect(failures, `${story.id}: focus obscured at 1280 × 320`).toEqual([]);
  });
}
