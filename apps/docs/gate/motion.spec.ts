// L08 decision 4, `reducedMotion` rows, and ADR-0017. Every animation is recorded from first paint
// (an init script), through the play function and a run of focus moves, then measured by pausing it
// and seeking to its start and its end. Motion is a change in a transform, an inset, a margin or a
// size; colour and opacity are not motion.
import { expect, test, type Page } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { contractFor, injectMeasure, loadStories, openStory, rootClass } from './stories.js';

// Runs in the page before anything else: keeps every animation that starts, finished or not.
function recordAnimations(): void {
  const seen = new Set<Animation>();
  (window as unknown as { __senuiAnimations: Set<Animation> }).__senuiAnimations = seen;
  const collect = () => {
    for (const animation of document.getAnimations()) seen.add(animation);
  };
  document.addEventListener('transitionrun', collect, true);
  document.addEventListener('animationstart', collect, true);
}

interface Movement {
  target: string;
  /** The root class of the component the animated element belongs to (its nearest root). */
  owner: string | null;
  property: string;
  from: string;
  to: string;
}

const stories = loadStories();
// Root class → a story of that component, to load its contract.
const byRoot = new Map(stories.map((story) => [rootClass(story.component), story]));

/** Every recorded animation that moves something, with the properties it moves. */
function movements(page: Page): Promise<Movement[]> {
  return page.evaluate(
    (roots) => {
      const MOTION = [
        'transform',
        'translate',
        'scale',
        'rotate',
        'top',
        'right',
        'bottom',
        'left',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'width',
        'height',
      ];
      const recorded = (window as unknown as { __senuiAnimations: Set<Animation> })
        .__senuiAnimations;
      const out: Movement[] = [];
      for (const animation of recorded) {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target;
        if (!effect || !target) continue;
        // Storybook's own preview UI (its loading spinner, recorded from first paint when the story is
        // slow to render: Firefox on main) sits in `.sb-wrapper`, outside every story.
        if (target.closest('.sb-wrapper')) continue;
        const pseudo = effect.pseudoElement ?? null;
        const timing = effect.getComputedTiming();
        const duration = Number(timing.duration) || 0;
        // The end of one iteration; for an infinite animation, halfway through the first.
        const end = timing.endTime === Infinity ? duration / 2 : Number(timing.endTime) - 1;
        const read = (time: number) => {
          animation.pause();
          animation.currentTime = time;
          const style = getComputedStyle(target, pseudo);
          return Object.fromEntries(MOTION.map((p) => [p, style.getPropertyValue(p)]));
        };
        const from = read(0);
        const to = read(Math.max(end, 0));
        animation.cancel();
        const name = `${window.__senuiMeasure.describe(target)}${pseudo ?? ''}`;
        // The nearest component root around the element owns its motion (a Button's spinner inside
        // a Dialog is judged by Button's contract).
        let owner: string | null = null;
        for (let node: Element | null = target; node && !owner; node = node.parentElement) {
          const classes = node.classList;
          owner = roots.find((cls) => classes.contains(cls)) ?? null;
        }
        for (const property of MOTION) {
          if (from[property] !== to[property]) {
            out.push({
              target: name,
              owner,
              property,
              from: from[property] ?? '',
              to: to[property] ?? '',
            });
          }
        }
      }
      return out;
    },
    [...byRoot.keys()],
  );
}

/** An in-place rotation: only `rotate` (or a rotation-only `transform`) changes. */
function isRotation(m: Movement): boolean {
  return m.property === 'rotate' || (m.property === 'transform' && /^(none|matrix\()/.test(m.to));
}

for (const story of stories) {
  for (const mode of ['reduce', 'no-preference'] as const) {
    test(`motion (${mode}): ${story.id}`, async ({ page }) => {
      test.skip(Boolean(exceptionFor(story, 'motion')), 'Excepted (exceptions.json)');
      const { adaptation } = await contractFor(story);
      // `motion-factor` promises nothing about the full-motion mode; `no-motion` promises both.
      test.skip(
        mode === 'no-preference' && adaptation.reducedMotion === 'motion-factor',
        'motion-factor: full motion is allowed',
      );
      await page.emulateMedia({ reducedMotion: mode });
      await page.addInitScript(recordAnimations);
      await openStory(page, story);
      await injectMeasure(page);
      // Focus moves start transitions too (rings, borders). Ten stops is enough to reach them.
      for (let i = 0; i < 10; i += 1) await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // Each movement is judged by the contract of the component that owns the animated element.
      const moving: Movement[] = [];
      for (const m of await movements(page)) {
        const ownerStory = (m.owner && byRoot.get(m.owner)) || story;
        const owner = (await contractFor(ownerStory)).adaptation;
        // `no-motion` promises both modes; `motion-factor` promises the reduced one.
        const promised = owner.reducedMotion === 'no-motion' || mode === 'reduce';
        const essential =
          mode === 'reduce' &&
          owner.reducedMotion === 'motion-factor' &&
          owner.essentialMotion === 'progress-rotation' &&
          isRotation(m);
        if (promised && !essential) moving.push(m);
      }
      expect(
        moving.map((m) => `${m.target}: ${m.property} ${m.from} → ${m.to}`),
        `${story.id} moves under ${mode} (${adaptation.reducedMotion})`,
      ).toEqual([]);
    });
  }
}
