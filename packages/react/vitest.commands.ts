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

/** `prefers-reduced-motion` for every frame of the page. */
export const emulateReducedMotion: BrowserCommand<[reduce: boolean]> = async (context, reduce) => {
  if (context.provider.name !== 'playwright')
    throw new Error('emulateReducedMotion needs Playwright');
  await context.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
};
