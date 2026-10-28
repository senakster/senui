import type { BrowserCommand } from 'vitest/node';

// Playwright actions the browser context doesn't expose (L06). They run in Node, against the page
// that hosts the test iframe. Typed for tests in src/internal/testing/commands.d.ts.

type Context = Parameters<BrowserCommand>[0];

/**
 * A point on the backdrop, just outside the topmost modal dialog's top-left corner, in the main
 * page's coordinates. Measured, never `hover()`ed: Playwright scrolls a hover target into view,
 * which scrolls the page under the dialog even with `overflow: hidden` and would fake a scroll leak.
 */
async function backdropPoint(context: Context): Promise<{ x: number; y: number }> {
  if (context.provider.name !== 'playwright') throw new Error('backdrop commands need Playwright');
  const box = await context.iframe.locator('dialog:modal').last().boundingBox();
  if (!box) throw new Error('no modal dialog is open');
  return { x: box.x - 8, y: box.y - 8 };
}

/** Wheels over the backdrop, so the page under it would scroll if nothing contained it (ADR-0014). */
export const wheelOverBackdrop: BrowserCommand<[deltaY: number]> = async (context, deltaY) => {
  const { x, y } = await backdropPoint(context);
  await context.page.mouse.move(x, y);
  await context.page.mouse.wheel(0, deltaY);
};

/** A pointer click on the backdrop: press and release outside the dialog's box. */
export const clickBackdrop: BrowserCommand = async (context) => {
  const { x, y } = await backdropPoint(context);
  await context.page.mouse.click(x, y);
};

/**
 * One half of a pointer press, for WCAG 2.5.2 (L09): `'down'` presses on the first element matching
 * `selector`, `'up'` releases on it, `'up-outside'` moves 40 px past its inline end and releases
 * there. Real mouse events from Playwright, so the browser decides whether a click happens.
 */
export const pointer: BrowserCommand<
  [step: 'down' | 'up' | 'up-outside', selector: string]
> = async (context, step, selector) => {
  if (context.provider.name !== 'playwright') throw new Error('pointer needs Playwright');
  const box = await context.iframe.locator(selector).first().boundingBox();
  if (!box) throw new Error(`nothing matches ${selector}`);
  const y = box.y + box.height / 2;
  if (step === 'up-outside') {
    await context.page.mouse.move(box.x + box.width + 40, y, { steps: 4 });
    await context.page.mouse.up();
    return;
  }
  await context.page.mouse.move(box.x + box.width / 2, y);
  if (step === 'down') await context.page.mouse.down();
  else await context.page.mouse.up();
};

/** `prefers-reduced-motion` for every frame of the page. */
export const emulateReducedMotion: BrowserCommand<[reduce: boolean]> = async (context, reduce) => {
  if (context.provider.name !== 'playwright')
    throw new Error('emulateReducedMotion needs Playwright');
  await context.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
};
