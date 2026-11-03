import { onTestFinished } from 'vitest';
import { commands } from 'vitest/browser';

/**
 * The two ways reduced motion reaches a component (ADR-0024): the user's setting, through the media
 * query the tokens read, and a consumer's own `--senui-motion-reduce: 0` with no media query at all.
 * Every motion test runs both, because a component that read the media query itself would pass only
 * the first.
 */
export const REDUCED = ['reduced motion', 'the factor at 0'] as const;
export type Reduced = (typeof REDUCED)[number];

/** Applies one of the two for the rest of the test. */
export async function reduceMotion(how: Reduced): Promise<void> {
  if (how === 'reduced motion') {
    await commands.emulateReducedMotion(true);
    onTestFinished(() => commands.emulateReducedMotion(false));
  } else {
    // As a consumer would set it (ADR-0010): on the root and every themed subtree.
    addStyle(':root, [data-theme] { --senui-motion-reduce: 0; }');
  }
}

/** Adds unlayered CSS, as a consumer's stylesheet, for the rest of the test. */
export function addStyle(css: string): void {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = css;
  onTestFinished(() => {
    style.remove();
  });
}
