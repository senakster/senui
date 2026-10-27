// L08 decision 7: forced colours. Chromium only: other engines' forced-colours emulation isn't
// relied on.
//
// - Stories tagged `forced-colors` are screenshotted in light and dark against committed baselines.
//   Pixels differ between operating systems, so the baselines come from the pinned Playwright
//   container and this part runs only there (SENUI_GATE_CONTAINER=1); elsewhere it skips, saying so.
// - Every story's focus stops get decision 6b's ring and boundary checks with forced colours on.
import { expect, test } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { injectMeasure, loadStories, openStory } from './stories.js';
import { walk } from './walk.js';

const IN_CONTAINER = process.env.SENUI_GATE_CONTAINER === '1';
const stories = loadStories();

for (const story of stories.filter((s) => s.tags.includes('forced-colors'))) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`forced colours, ${scheme}: ${story.id}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Forced-colours emulation: Chromium only');
      test.skip(
        !IN_CONTAINER,
        'Screenshots run in the pinned Playwright container only (SENUI_GATE_CONTAINER=1): baselines are Linux pixels',
      );
      await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
      await openStory(page, story);
      await expect(page).toHaveScreenshot(`${story.id}--${scheme}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      });
    });
  }
}

for (const story of stories) {
  test(`forced colours, focus ring: ${story.id}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Forced-colours emulation: Chromium only');
    test.skip(Boolean(exceptionFor(story, 'tab-walk')), 'Excepted (exceptions.json)');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, story);
    await injectMeasure(page);
    const failures = (await walk(page, browserName, true)).filter((f) => /ring|boundary/.test(f));
    expect(failures, `${story.id}: focus ring in forced colours`).toEqual([]);
  });
}
