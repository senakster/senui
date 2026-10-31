// L08 decision 6: the focus ring against a consumer's unlayered resets. A reset that doesn't target
// focus must leave the ring; the two the `keepFocusRing` responsibility names must remove it, which
// is principle 3 working (an unlayered consumer rule beats layered CSS), and what the published
// responsibility warns about.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { injectMeasure, loadStories, openStory } from './stories.js';

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/resets/${name}`, import.meta.url), 'utf8');

const KEEPS = {
  'normalize-style reset': fixture('normalize-style.css'),
  'preflight-style reset': fixture('preflight-style.css'),
};
const REMOVES = {
  ':focus { outline: none }': ':focus { outline: none; }',
  'all: unset': 'button, input, a, dialog, [tabindex] { all: unset; }',
};

/** Whether each focus stop shows a ring: the story's own focus first, then every Tab stop. */
async function rings(page: Page): Promise<{ name: string; ring: boolean }[]> {
  const out: { name: string; ring: boolean }[] = [];
  const seen = new Set<unknown>();
  for (let presses = 0; presses < 30; presses += 1) {
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      // A stable key per element, so a modal that wraps focus ends the walk.
      const store = window as unknown as { __senuiResetKeys?: WeakMap<Element, string> };
      const keys = (store.__senuiResetKeys ??= new WeakMap());
      const key = keys.get(el) ?? String(Math.random());
      keys.set(el, key);
      const s = getComputedStyle(el);
      // Alpha read through the canvas: a string test such as "ends with ' 0)'" also matches opaque
      // black, rgb(0, 0, 0), which a probe caught.
      const ring =
        s.outlineStyle !== 'none' &&
        Number.parseFloat(s.outlineWidth) > 0 &&
        window.__senuiMeasure.rgba(s.outlineColor)[3] > 0;
      return { key, name: el.tagName.toLowerCase(), ring };
    });
    if (stop) {
      if (seen.has(stop.key)) break;
      seen.add(stop.key);
      out.push({ name: stop.name, ring: stop.ring });
    } else if (presses > 0) break;
    await page.keyboard.press('Tab');
  }
  return out;
}

for (const story of loadStories()) {
  test(`resets: ${story.id}`, async ({ page }) => {
    test.skip(Boolean(exceptionFor(story, 'resets')), 'Excepted (exceptions.json)');
    // Four story loads and up to 30 Tab presses each: a busy story (Button's forced colours) ran
    // past the default 30 s in WebKit on a loaded runner.
    test.setTimeout(90_000);
    const failures: string[] = [];
    for (const [label, css] of Object.entries(KEEPS)) {
      await openStory(page, story);
      await page.addStyleTag({ content: css });
      await injectMeasure(page);
      for (const stop of await rings(page)) {
        if (!stop.ring) failures.push(`${label}: <${stop.name}> lost its focus ring`);
      }
    }
    for (const [label, css] of Object.entries(REMOVES)) {
      await openStory(page, story);
      await page.addStyleTag({ content: css });
      await injectMeasure(page);
      for (const stop of await rings(page)) {
        if (stop.ring)
          failures.push(`${label}: <${stop.name}> still shows a ring (the docs say it won't)`);
      }
    }
    expect(failures, `${story.id}: focus ring vs resets`).toEqual([]);
  });
}
