import axe from 'axe-core';
import { expect } from 'vitest';

export interface AxeOptions {
  /**
   * Check rendered colour contrast. Only meaningful in the browser project (`*.browser.test.tsx`),
   * with the real CSS loaded: jsdom has no layout or computed colours, so it stays off there.
   */
  contrast?: boolean;
}

/**
 * The unit axe gate (principle 6), without a wrapper package (L03 scope decision). Runs axe-core on
 * `container` against the WCAG 2.2 A and AA rules and returns one line per violation, so a failure
 * reads as rule, impact and element:
 *
 * ```ts
 * const { container } = render(<Button>Save</Button>);
 * await expectNoAxeViolations(container);                       // jsdom
 * await expectNoAxeViolations(container, { contrast: true });   // browser, real CSS
 * ```
 */
export async function axeViolations(
  container: Element,
  { contrast = false }: AxeOptions = {},
): Promise<string[]> {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'],
    },
    rules: { 'color-contrast': { enabled: contrast } },
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} at ${node.target.join(' ')}`,
    ),
  );
}

export async function expectNoAxeViolations(
  container: Element,
  options?: AxeOptions,
): Promise<void> {
  expect(await axeViolations(container, options)).toEqual([]);
}
