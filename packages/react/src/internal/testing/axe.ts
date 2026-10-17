import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * The unit axe gate (principle 6), without a wrapper package (L03 scope decision). Runs axe-core on
 * `container` and returns one line per violation, so a failure reads as rule, impact and element:
 *
 * ```ts
 * const { container } = render(<Button>Save</Button>);
 * await expectNoAxeViolations(container);
 * ```
 *
 * jsdom has no layout or computed colours, so `color-contrast` is off here; the token build checks
 * contrast pairs (L01), and Storybook and L08 check rendered contrast in a browser.
 */
export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} at ${node.target.join(' ')}`,
    ),
  );
}

export async function expectNoAxeViolations(container: Element): Promise<void> {
  expect(await axeViolations(container)).toEqual([]);
}
