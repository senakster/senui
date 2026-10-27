// L08 decision 4: the contract's `adaptation` values, checked on every story of the component.
// Target size, reflow at 320 px, text spacing, and right-to-left mirroring. Motion has its own spec.
import { expect, test, type Page } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import {
  contractFor,
  injectMeasure,
  loadStories,
  openStory,
  rootClass,
  type GateStory,
} from './stories.js';

const stories = loadStories();
const ROOTS = [...new Set(stories.map((story) => rootClass(story.component)))];

async function open(page: Page, story: GateStory): Promise<void> {
  await openStory(page, story);
  await injectMeasure(page);
}

for (const story of stories) {
  test.describe(story.id, () => {
    // Decision 4, `targetSize`: targets have activation behaviour; a target's box includes its labels.
    test('target size', async ({ page }) => {
      test.skip(Boolean(exceptionFor(story, 'target-size')), 'Excepted (exceptions.json)');
      const { adaptation } = await contractFor(story);
      await open(page, story);
      const failures: string[] = [];
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 800 });
        failures.push(
          ...(await page.evaluate(
            ({ root, others, mode, width: viewport }) => {
              const m = window.__senuiMeasure;
              const targets = [
                ...new Set(
                  [...document.querySelectorAll(`.${root}`)].flatMap((r) => [
                    r,
                    ...r.querySelectorAll('*'),
                  ]),
                ),
              ].filter((el) => m.isTarget(el));
              const out: string[] = [];
              if (mode === 'not-a-target') {
                // Every target belongs to another component, measured under its own contract.
                for (const el of targets) {
                  const owner = others.find((cls) => el.closest(`.${cls}`));
                  if (!owner)
                    out.push(`${String(viewport)}px: ${m.describe(el)} is a target of its own`);
                }
                return out;
              }
              const boxes = targets.map((el) => ({ el, box: m.targetBox(el) }));
              const small = boxes.filter(({ box }) => box.width < 23.5 || box.height < 23.5);
              if (mode === 'min-24') {
                return small.map(
                  ({ el, box }) =>
                    `${String(viewport)}px: ${m.describe(el)} is ${box.width.toFixed(1)} × ${box.height.toFixed(1)}`,
                );
              }
              // spacing-exception: a 24 px circle on each small target touches no other target or circle.
              const centre = (b: Required<SenuiRect>) => [
                (b.left + b.right) / 2,
                (b.top + b.bottom) / 2,
              ];
              for (const { el, box } of small) {
                const [x = 0, y = 0] = centre(box);
                for (const other of boxes) {
                  if (other.el === el) continue;
                  const b = other.box;
                  const dx = Math.max(b.left - x, 0, x - b.right);
                  const dy = Math.max(b.top - y, 0, y - b.bottom);
                  const isSmall = small.some((s) => s.el === other.el);
                  const [ox = 0, oy = 0] = centre(b);
                  const tooClose = isSmall
                    ? Math.hypot(ox - x, oy - y) < 24
                    : Math.hypot(dx, dy) < 12;
                  if (tooClose)
                    out.push(
                      `${String(viewport)}px: ${m.describe(el)} is too close to ${m.describe(other.el)}`,
                    );
                }
              }
              return out;
            },
            {
              root: rootClass(story.component),
              others: ROOTS.filter((cls) => cls !== rootClass(story.component)),
              mode: adaptation.targetSize,
              width,
            },
          )),
        );
      }
      expect(failures, `${story.id}: target size (${adaptation.targetSize})`).toEqual([]);
    });

    // Decision 8: at 320 px the component fits its container and nothing in it scrolls sideways,
    // except a truncating control's own value. Measured per component, not per document: a story
    // may lay several components side by side in fixed-width scaffolding.
    test('reflow at 320 px', async ({ page }) => {
      test.skip(Boolean(exceptionFor(story, 'reflow')), 'Excepted (exceptions.json)');
      const { adaptation } = await contractFor(story);
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, story);
      const failures = await page.evaluate(
        ({ root, truncates }) => {
          const m = window.__senuiMeasure;
          const out: string[] = [];
          for (const r of document.querySelectorAll(`.${root}`)) {
            if (!r.checkVisibility()) continue;
            const style = getComputedStyle(r);
            const fixed = r.matches(':modal') || style.position === 'fixed';
            const container = fixed
              ? { left: 0, right: innerWidth }
              : (r.parentElement ?? document.body).getBoundingClientRect();
            const box = r.getBoundingClientRect();
            // A component may be wider than a container narrower than its own content (a word and
            // its padding); that fails reflow only when it pushes past a container that fits the
            // viewport, so the page would scroll sideways.
            const containerFits = container.left >= -1 && container.right <= innerWidth + 1;
            if (
              containerFits &&
              (box.left < Math.max(container.left, 0) - 1 || box.right > innerWidth + 1)
            ) {
              out.push(
                `${m.describe(r)} is ${box.width.toFixed(0)}px and scrolls the page sideways`,
              );
            }
            for (const el of [r, ...r.querySelectorAll('*')]) {
              if (!el.checkVisibility()) continue;
              const s = getComputedStyle(el);
              const scrollsSideways =
                s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1;
              const isValue = truncates && el.matches('input, textarea');
              if (scrollsSideways && !isValue) {
                out.push(
                  `${m.describe(el)} scrolls sideways (${String(el.scrollWidth)} > ${String(el.clientWidth)})`,
                );
              }
              const b = el.getBoundingClientRect();
              if (b.width < 2 || el === r) continue;
              // Content stays within the component, or within a clipping box inside it (whose own
              // sideways scroll is caught above). The viewport doesn't count: stories may be wider.
              const clip = m.clipRect(el);
              const clipper = m.clipAncestor(el);
              const inside =
                clipper && r.contains(clipper)
                  ? { left: Math.max(clip.left, box.left), right: Math.min(clip.right, box.right) }
                  : { left: box.left, right: box.right };
              if (b.right > inside.right + 1 || b.left < inside.left - 1) {
                out.push(`${m.describe(el)} sticks out of ${m.describe(r)}`);
              }
            }
          }
          return [...new Set(out)];
        },
        { root: rootClass(story.component), truncates: adaptation.textOverflow === 'truncates' },
      );
      expect(failures, `${story.id}: reflow`).toEqual([]);
    });

    // Decision 8: WCAG 1.4.12's spacing overrides. No text clipped by an ancestor that hides
    // overflow, none spilling out of its box, none overlapping another text element.
    test('text spacing', async ({ page }) => {
      test.skip(Boolean(exceptionFor(story, 'text-spacing')), 'Excepted (exceptions.json)');
      const { adaptation } = await contractFor(story);
      await open(page, story);
      await page.addStyleTag({
        content:
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }',
      });
      const failures = await page.evaluate(
        ({ root, truncates }) => {
          const m = window.__senuiMeasure;
          const out: string[] = [];
          for (const r of document.querySelectorAll(`.${root}`)) {
            if (!r.checkVisibility()) continue;
            const all = [r, ...r.querySelectorAll('*')].filter((el) => el.checkVisibility());
            for (const el of all) {
              const s = getComputedStyle(el);
              const clips = ['hidden', 'clip'];
              const isValue = truncates && el.matches('input, textarea');
              if (
                !isValue &&
                ((clips.includes(s.overflowX) && el.scrollWidth > el.clientWidth + 1) ||
                  (clips.includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1)) &&
                el.textContent.trim() !== ''
              ) {
                out.push(`${m.describe(el)} clips its text`);
              }
              if (
                s.overflowY === 'visible' &&
                m.hasOwnText(el) &&
                el.scrollHeight > el.clientHeight + 1 &&
                el.clientHeight > 0
              ) {
                out.push(`${m.describe(el)}'s text spills out of its box`);
              }
            }
            // Overlap counts within one layer only: a sticky header or footer covers the content
            // that scrolls under it by design (a dialog's), and its background hides that text.
            const layerOf = (el: Element) => {
              for (let node: Element | null = el; node && node !== r; node = node.parentElement) {
                if (['sticky', 'fixed'].includes(getComputedStyle(node).position)) return node;
              }
              return r;
            };
            const texts = all.filter((el) => m.hasOwnText(el));
            for (const [i, a] of texts.entries()) {
              for (const b of texts.slice(i + 1)) {
                if (a.contains(b) || b.contains(a) || layerOf(a) !== layerOf(b)) continue;
                const x = a.getBoundingClientRect();
                const y = b.getBoundingClientRect();
                const overlapX = Math.min(x.right, y.right) - Math.max(x.left, y.left);
                const overlapY = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
                if (overlapX > 1 && overlapY > 1) {
                  out.push(`${m.describe(a)} overlaps ${m.describe(b)}`);
                }
              }
            }
          }
          return [...new Set(out)];
        },
        { root: rootClass(story.component), truncates: adaptation.textOverflow === 'truncates' },
      );
      expect(failures, `${story.id}: text spacing`).toEqual([]);
    });

    // Decision 10, runtime half: under `dir="rtl"` on <html>, the component's boxes mirror around
    // its own box, and a pseudo-element's horizontal `translate` flips sign (a switch thumb).
    test('right-to-left mirroring', async ({ page }) => {
      const { adaptation } = await contractFor(story);
      test.skip(adaptation.rtl !== 'mirrors', 'rtl: direction-neutral (static check only)');
      test.skip(Boolean(exceptionFor(story, 'rtl')), 'Excepted (exceptions.json)');
      const snapshot = () =>
        page.evaluate((root) => {
          if (document.querySelector('#storybook-root [dir]')) return null; // sets its own direction
          // An infinite animation (a spinner) changes its box every frame: compare both
          // directions at its first frame.
          for (const a of document.getAnimations()) {
            if (a.effect?.getComputedTiming().endTime === Infinity) {
              a.pause();
              a.currentTime = 0;
            }
          }
          const rootEl = document.querySelector(`.${root}`);
          if (!rootEl?.checkVisibility()) return null;
          const frame = rootEl.getBoundingClientRect();
          const translateX = (el: Element, pseudo: string) => {
            const s = getComputedStyle(el, pseudo);
            if (s.content === 'none' || s.translate === 'none') return 0;
            return Number.parseFloat(s.translate.split(' ')[0] ?? '0');
          };
          return [rootEl, ...rootEl.querySelectorAll('*')].map((el) => {
            const b = el.getBoundingClientRect();
            return {
              name: window.__senuiMeasure.describe(el),
              start: b.left - frame.left,
              end: frame.right - b.right,
              full: b.width >= frame.width - 2 || b.width === 0,
              before: translateX(el, '::before'),
              after: translateX(el, '::after'),
            };
          });
        }, rootClass(story.component));

      await open(page, story);
      const ltr = await snapshot();
      test.skip(ltr === null, 'Not rendered, or the story sets its own direction');
      // Flip the page's direction; `:dir()` restyles live. A thumb's `translate` may transition, so
      // wait for it to finish before measuring (rule 42).
      await page.evaluate(async () => {
        document.documentElement.setAttribute('dir', 'rtl');
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        );
      });
      const rtl = await snapshot();
      const failures: string[] = [];
      for (const [i, a] of (ltr ?? []).entries()) {
        const b = rtl?.[i];
        if (!b) continue;
        if (!a.full && Math.abs(a.start - b.end) > 1.5) {
          failures.push(
            `${a.name}: ${a.start.toFixed(1)}px from the start, but ${b.end.toFixed(1)}px from the end in RTL`,
          );
        }
        for (const pseudo of ['before', 'after'] as const) {
          if (Math.abs(a[pseudo]) > 0.5 && Math.abs(a[pseudo] + b[pseudo]) > 0.5) {
            failures.push(
              `${a.name}::${pseudo}: translate ${String(a[pseudo])}px does not flip in RTL (${String(b[pseudo])}px)`,
            );
          }
        }
      }
      expect(failures, `${story.id}: right-to-left mirroring`).toEqual([]);
    });
  });
}
