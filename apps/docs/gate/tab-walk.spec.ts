// L08 decisions 6a and 6b: Tab through every story. At each stop, focus is keyboard focus, on
// something named and reachable, not covered (2.4.11), and its ring is real: drawn, not
// transparent, not clipped, not painted over, and at least 3:1 against what's behind it (1.4.11).
import { expect, test, type Page } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { injectMeasure, loadStories, openStory } from './stories.js';

interface Stop {
  name: string;
  problems: string[];
  backendNodeId?: number;
}

/** Checks the element that has focus now. Null when focus has left the document or is on <body>. */
function checkStop(page: Page, checkRing: boolean): Promise<Stop | null> {
  return page.evaluate((ring) => {
    const m = window.__senuiMeasure;
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    const problems: string[] = [];
    if (!el.matches(':focus-visible')) problems.push('focus is not :focus-visible');
    if (el.closest('[aria-hidden="true"], [inert]'))
      problems.push('focus is inside aria-hidden or inert');

    // 2.4.11: not entirely covered by other content (a sticky header, a fixed bar).
    const box = el.getBoundingClientRect();
    const visible = {
      left: Math.max(box.left, 0),
      top: Math.max(box.top, 0),
      right: Math.min(box.right, innerWidth),
      bottom: Math.min(box.bottom, innerHeight),
    };
    let shown = 0;
    let samples = 0;
    for (let i = 1; i <= 5; i += 1) {
      for (let j = 1; j <= 3; j += 1) {
        const x = visible.left + ((visible.right - visible.left) * i) / 6;
        const y = visible.top + ((visible.bottom - visible.top) * j) / 4;
        if (visible.right <= visible.left || visible.bottom <= visible.top) continue;
        samples += 1;
        const top = document.elementFromPoint(x, y);
        if (top && (top === el || el.contains(top))) shown += 1;
      }
    }
    if (samples === 0 || shown === 0) problems.push('focus is entirely covered or off screen');

    if (ring) {
      const s = getComputedStyle(el);
      const width = Number.parseFloat(s.outlineWidth);
      const offset = Number.parseFloat(s.outlineOffset);
      const colour = m.rgba(s.outlineColor);
      if (s.outlineStyle === 'none' || width <= 0) problems.push('no focus ring');
      else if (colour[3] === 0) problems.push('the focus ring is transparent');
      else {
        // The ring's outer edge, inside the nearest clipping box.
        const outer = {
          left: box.left - offset - width,
          top: box.top - offset - width,
          right: box.right + offset + width,
          bottom: box.bottom + offset + width,
        };
        const clip = m.clipRect(el);
        if (
          outer.left < clip.left - 0.5 ||
          outer.top < clip.top - 0.5 ||
          outer.right > clip.right + 0.5 ||
          outer.bottom > clip.bottom + 0.5
        ) {
          problems.push('the focus ring is clipped by its container');
        }
        // Points on the ring's middle line: nothing unrelated may be painted there.
        const mid = offset + width / 2;
        const points = [
          [box.left - mid, (box.top + box.bottom) / 2],
          [box.right + mid, (box.top + box.bottom) / 2],
          [(box.left + box.right) / 2, box.top - mid],
          [(box.left + box.right) / 2, box.bottom + mid],
        ];
        for (const [x = 0, y = 0] of points) {
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          const top = document.elementFromPoint(x, y);
          if (top && m.paintsOver(top, el)) {
            problems.push(`the focus ring is painted over by ${m.describe(top)}`);
            break;
          }
        }
        // 1.4.11: the ring against the colour behind it, outside the element (or inside it, for a
        // ring drawn inward).
        const behind =
          offset + width / 2 < 0
            ? m.backgroundOf(el)
            : m.backgroundOf(el.parentElement ?? document.body);
        const ratio = m.contrast(m.over(colour, behind), behind);
        if (ratio < 3)
          problems.push(`the focus ring is ${ratio.toFixed(2)}:1 against its background`);
      }
      // 1.4.11: a control's boundary, by its border or its fill, against what's behind it. A
      // control with neither (a ghost button) is identified by its text; disabled ones are exempt.
      // Controls only: a focused container (a dialog, a heading focused by script) isn't one.
      if (m.isTarget(el) && el.getAttribute('aria-disabled') !== 'true') {
        const behind = m.backgroundOf(el.parentElement ?? document.body);
        const fill = m.rgba(s.backgroundColor);
        const borders = ['top', 'right', 'bottom', 'left']
          .filter((side) => Number.parseFloat(s.getPropertyValue(`border-${side}-width`)) > 0)
          .map((side) => m.rgba(s.getPropertyValue(`border-${side}-color`)))
          .filter((c) => c[3] > 0);
        if (fill[3] > 0 || borders.length > 0) {
          const byFill = fill[3] > 0 ? m.contrast(m.over(fill, behind), behind) : 0;
          const byBorder = Math.max(
            0,
            ...borders.map((c) => m.contrast(m.over(c, behind), behind)),
          );
          const best = Math.max(byFill, byBorder);
          if (best < 3)
            problems.push(`its boundary is ${best.toFixed(2)}:1 against its background`);
        }
      }
    }
    return { name: m.describe(el), problems };
  }, checkRing);
}

/** The focused element's accessible name from the accessibility tree (Chromium). */
async function accessibleName(page: Page): Promise<string | null> {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: ':focus',
  });
  const nodeId = nodeIds[0];
  if (nodeId === undefined) return null;
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: false,
  });
  const value: unknown = nodes[0]?.name?.value;
  await cdp.detach();
  return typeof value === 'string' ? value : '';
}

async function walk(page: Page, browserName: string, checkRing: boolean): Promise<string[]> {
  const failures: string[] = [];
  const visited = new Set<string>();
  // A story may already have put focus somewhere (a play function, a dialog opening): first stop.
  let stop = await checkStop(page, checkRing);
  for (let presses = 0; presses < 40; presses += 1) {
    if (stop) {
      const key = await page.evaluate(() => {
        const el = document.activeElement as Element & { __senuiStop?: string };
        el.__senuiStop ??= String(Math.random());
        return el.__senuiStop;
      });
      if (visited.has(key)) break; // a modal wraps focus: the walk is done
      visited.add(key);
      for (const problem of stop.problems) failures.push(`${stop.name}: ${problem}`);
      if (browserName === 'chromium') {
        const name = await accessibleName(page);
        if (name !== null && name.trim() === '') failures.push(`${stop.name}: no accessible name`);
      }
    } else if (presses > 0) {
      break; // focus left the document
    }
    await page.keyboard.press('Tab');
    stop = await checkStop(page, checkRing);
  }
  return failures;
}

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
