// L11: the Motion page's consumer example, run on the page as a reader sees it. It runs the
// stylesheet the page shows (`src/motion/motion-example.css`), so the advice is tested as given: it
// slides by default, and moves nothing under reduced motion or with the factor at 0 and no media
// query. Movement is ADR-0024's list, shared with the static check and the motion gate.
import { expect, test, type Page } from '@playwright/test';
import { MOVEMENT } from '../../../packages/react/scripts/motion.mjs';
import { loadDocs, openDocs } from './docs.js';

const found = loadDocs().find((docs) => docs.id === 'motion--docs');
const motionDocs = () => {
  if (!found) throw new Error('the build has no Motion docs page');
  return found;
};

/**
 * Shows the example's panel and lists what its entry transitions, in one step in the page: a
 * transition that has ended is gone, and a round trip per step could outlast it.
 */
function entering(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const example = document.querySelector('[data-docs-motion-example]');
    example?.querySelector('button')?.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const panel = example?.querySelector('.app-panel');
    if (!panel) throw new Error('the example showed no panel');
    return panel
      .getAnimations()
      .filter(
        (animation): animation is CSSTransition =>
          animation instanceof CSSTransition && animation.playState === 'running',
      )
      .map((transition) => transition.transitionProperty)
      .sort();
  });
}

const moving = (properties: string[]) => properties.filter((p) => MOVEMENT.includes(p));

test.describe('Motion page', () => {
  test('the table says what each pattern does, from the contracts', async ({ page }) => {
    await openDocs(page, motionDocs());
    const row = (name: string) =>
      page
        .locator('.docs-table tbody tr')
        .filter({ has: page.getByRole('rowheader', { name, exact: true }) });
    await expect(row('Switch')).toContainText('instant');
    await expect(row('Switch')).toContainText('at once, without animating');
    await expect(row('Button')).toContainText('progress-rotation');
    await expect(row('Button')).toContainText('four times slower');
    await expect(row('Dialog')).toContainText('movement is removed');
  });

  test('the consumer example slides in by default', async ({ page }) => {
    await openDocs(page, motionDocs());
    const properties = await entering(page);
    expect(properties).toContain('opacity');
    expect(moving(properties)).toEqual(['translate']);
  });

  test('the consumer example only fades under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDocs(page, motionDocs());
    const properties = await entering(page);
    expect(properties).toContain('opacity');
    expect(moving(properties)).toEqual([]);
  });

  test('the consumer example only fades with the factor at 0 and no media query', async ({
    page,
  }) => {
    await openDocs(page, motionDocs());
    await page.addStyleTag({ content: ':root, [data-theme] { --senui-motion-reduce: 0; }' });
    const properties = await entering(page);
    expect(properties).toContain('opacity');
    expect(moving(properties)).toEqual([]);
  });
});
