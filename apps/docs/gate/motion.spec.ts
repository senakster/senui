// L08 decision 4, `reducedMotion` rows, ADR-0017 and ADR-0024. Every animation is recorded from
// first paint (an init script), through the play function and a run of focus moves, then measured by
// pausing it and seeking. Movement is a change in any property of ADR-0024's list (shared with the
// static check); colour and opacity are not movement.
//
// What each contract value promises:
// - `no-motion`: nothing moves, in either mode;
// - `motion-factor` and `instant`: nothing moves under reduced motion (for `instant`, the element
//   reaches its end position at once; a zero-duration transition records nothing, so the end
//   position is the browser tests' job). Full motion is allowed;
// - `essentialMotion: 'progress-rotation'`: one in-place rotation keeps turning under reduced motion.
// Any other value fails the story: a new value must be taught here before it ships.
import { expect, test, type Page } from '@playwright/test';
import { MOVEMENT } from '../../../packages/react/scripts/motion.mjs';
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
  /**
   * For an infinite animation, samples at 0, ⅛, ¼ and ½ of its period: the box centre (none on a
   * pseudo-element, which has no box of its own), `transform`, `rotate`, and whether
   * `transform-origin` is the centre of the element's own (untransformed) size.
   */
  samples:
    | { centre: [number, number] | null; transform: string; rotate: string; centred: boolean }[]
    | null;
  /** For an infinite animation: its period, and the rotation token's, in ms (NaN if unreadable). */
  period: { duration: number; token: number } | null;
  /** Every movement property this animation changes. */
  moves: string[];
}

const stories = loadStories();
// Root class → a story of that component, to load its contract.
const byRoot = new Map(stories.map((story) => [rootClass(story.component), story]));

/** Every recorded animation that moves something, with the properties it moves. */
function movements(page: Page): Promise<Movement[]> {
  return page.evaluate(
    ([roots, MOTION]) => {
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
        const infinite = timing.endTime === Infinity;
        // One iteration; for an infinite animation, its first half (a full turn ends where it began).
        const span = infinite ? duration / 2 : Math.max(Number(timing.endTime) - 1, 0);
        const seek = (time: number) => {
          animation.pause();
          animation.currentTime = time;
        };
        const read = (time: number) => {
          seek(time);
          const style = getComputedStyle(target, pseudo);
          return Object.fromEntries(MOTION.map((p) => [p, style.getPropertyValue(p)]));
        };
        // Start and end alone miss a shake or a pulse that returns to where it began.
        const reads = [0, 1 / 4, 1 / 2, 3 / 4, 1].map((f) => read(span * f));
        const from = reads[0] ?? {};
        const toFor = (p: string) => reads.find((r) => r[p] !== from[p])?.[p];
        const ms = (value: string) => {
          const m = /^\s*([\d.]+)(ms|s)\s*$/.exec(value);
          return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : Number.NaN;
        };
        const samples = infinite
          ? [0, duration / 8, duration / 4, duration / 2].map((time) => {
              seek(time);
              const style = getComputedStyle(target, pseudo);
              const box = pseudo ? null : target.getBoundingClientRect();
              const [ox = Number.NaN, oy = Number.NaN] = style
                .getPropertyValue('transform-origin')
                .split(' ')
                .map(Number.parseFloat);
              const width = Number.parseFloat(style.width);
              const height = Number.parseFloat(style.height);
              return {
                centre: box
                  ? ([box.x + box.width / 2, box.y + box.height / 2] as [number, number])
                  : null,
                transform: style.getPropertyValue('transform'),
                rotate: style.getPropertyValue('rotate'),
                centred: Math.abs(ox - width / 2) < 0.5 && Math.abs(oy - height / 2) < 0.5,
              };
            })
          : null;
        const period = infinite
          ? {
              duration,
              token: ms(
                getComputedStyle(target).getPropertyValue('--senui-motion-duration-rotation'),
              ),
            }
          : null;
        animation.cancel();
        const name = `${window.__senuiMeasure.describe(target)}${pseudo ?? ''}`;
        // The nearest component root around the element owns its motion (a Button's spinner inside
        // a Dialog is judged by Button's contract).
        let owner: string | null = null;
        for (let node: Element | null = target; node && !owner; node = node.parentElement) {
          const classes = node.classList;
          owner = roots.find((cls) => classes.contains(cls)) ?? null;
        }
        const moves = MOTION.filter((p) => toFor(p) !== undefined);
        for (const property of moves) {
          out.push({
            target: name,
            owner,
            property,
            from: from[property] ?? '',
            to: toFor(property) ?? '',
            samples,
            period,
            moves,
          });
        }
      }
      return out;
    },
    [[...byRoot.keys()], [...MOVEMENT]] as const,
  );
}

/** `none`, or a 2D matrix that only rotates: a = d, b = −c, a² + b² = 1, no translation. */
function isPureRotation(transform: string): boolean {
  if (transform === 'none') return true;
  const m = /^matrix\(([^)]*)\)$/.exec(transform);
  if (!m) return false;
  const values = (m[1] ?? '').split(',').map(Number);
  if (values.length !== 6 || values.some(Number.isNaN)) return false;
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = values;
  const near = (x: number, y: number, tolerance = 1e-3) => Math.abs(x - y) < tolerance;
  return near(a, d) && near(b, -c) && near(a * a + b * b, 1) && near(e, 0, 0.5) && near(f, 0, 0.5);
}

/** `rotate` about the z-axis only: an angle, no axis (`x 90deg` is a flip, not a spin). */
const isZRotate = (rotate: string) => /^(none|-?[\d.]+(e-?\d+)?(deg|rad|grad|turn))$/.test(rotate);

/**
 * ADR-0017's allowance, as ADR-0024 tightens it: an in-place rotation, slowed four times under
 * reduced motion. It moves only `rotate` and `transform`; at every sample `rotate` turns about the
 * z-axis, `transform` is a pure rotation, the origin is the element's centre (so it doesn't orbit),
 * and the box centre stays within half a pixel (⅛ and ¼ catch a translation that is back at zero by
 * ½); and its period is four times `--senui-motion-duration-rotation`.
 */
function isRotation(m: Movement): boolean {
  if (!m.samples || !m.period) return false;
  if (!m.moves.every((p) => p === 'rotate' || p === 'transform')) return false;
  if (!m.samples.every((s) => isZRotate(s.rotate) && isPureRotation(s.transform) && s.centred)) {
    return false;
  }
  if (!(Math.abs(m.period.duration - 4 * m.period.token) < 1)) return false;
  const centres = m.samples.flatMap((s) => (s.centre ? [s.centre] : []));
  const [x0, y0] = centres[0] ?? [0, 0];
  return centres.every(([x, y]) => Math.hypot(x - x0, y - y0) < 0.5);
}

const KNOWN = new Set(['motion-factor', 'instant', 'no-motion']);

for (const story of stories) {
  for (const mode of ['reduce', 'no-preference'] as const) {
    test(`motion (${mode}): ${story.id}`, async ({ page }) => {
      test.skip(Boolean(exceptionFor(story, 'motion')), 'Excepted (exceptions.json)');
      const { adaptation } = await contractFor(story);
      expect(
        KNOWN.has(adaptation.reducedMotion),
        `${story.id}: unknown reducedMotion '${adaptation.reducedMotion}' (ADR-0024)`,
      ).toBe(true);
      // `motion-factor` and `instant` promise nothing about the full-motion mode.
      test.skip(
        mode === 'no-preference' && adaptation.reducedMotion !== 'no-motion',
        `${adaptation.reducedMotion}: full motion is allowed`,
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
        expect(
          KNOWN.has(owner.reducedMotion),
          `${ownerStory.component}: unknown reducedMotion '${owner.reducedMotion}' (ADR-0024)`,
        ).toBe(true);
        // Every value promises the reduced mode; only `no-motion` promises full motion too.
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
