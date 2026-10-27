// L08 decision 3: axe on every story, light and dark, with rendered contrast, over the document.
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { exceptionFor } from './exceptions.js';
import { loadStories, openStory } from './stories.js';

// axe-core is the react package's dev dependency (L03); reuse its pin rather than add a second.
const AXE = createRequire(new URL('../../../packages/react/package.json', import.meta.url)).resolve(
  'axe-core/axe.min.js',
);

// The same WCAG tags as the unit layer's helper (packages/react/src/internal/testing/axe.ts).
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];
// Page-level rules: a story is a component, not a page.
const PAGE_RULES = ['region', 'landmark-one-main', 'page-has-heading-one'];
// Storybook's own markup in iframe.html, never the component's.
const STORYBOOK_OWNED = [
  '#storybook-docs',
  '.sb-preparing-story',
  '.sb-preparing-docs',
  '.sb-errordisplay',
  '.sb-nopreview',
];

interface AxeNode {
  target: string[];
}
interface AxeResult {
  id: string;
  impact: string | null;
  help: string;
  nodes: AxeNode[];
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe, ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    for (const story of loadStories()) {
      test(story.id, async ({ page }) => {
        await openStory(page, story);
        await page.addScriptTag({ path: AXE });
        const results = await page.evaluate(
          async ({ tags, pageRules, exclude }) => {
            const axe = (
              window as unknown as {
                axe: {
                  run: (
                    context: unknown,
                    options: unknown,
                  ) => Promise<{ violations: AxeResult[]; incomplete: AxeResult[] }>;
                };
              }
            ).axe;
            const rules = Object.fromEntries(pageRules.map((id) => [id, { enabled: false }]));
            const result = await axe.run(
              { include: [document], exclude: exclude.map((selector) => [selector]) },
              {
                runOnly: { type: 'tag', values: tags },
                rules: { ...rules, 'color-contrast': { enabled: true } },
                resultTypes: ['violations', 'incomplete'],
              },
            );
            // Contrast axe couldn't compute (overlaps, top layer, pseudo-element backgrounds) fails
            // like a violation: that is exactly where dialogs live. It has its own id, so an
            // exception can excuse only the incomplete result, never a real violation.
            const incompleteContrast = result.incomplete
              .filter((r) => r.id === 'color-contrast')
              .map((r) => ({ ...r, id: 'color-contrast:incomplete' }));
            return [...result.violations, ...incompleteContrast].map((r) => ({
              id: r.id,
              impact: r.impact,
              help: r.help,
              targets: r.nodes.map((node) => node.target.join(' ')),
            }));
          },
          { tags: TAGS, pageRules: PAGE_RULES, exclude: STORYBOOK_OWNED },
        );
        const excused = new Set(exceptionFor(story, 'axe')?.rules ?? []);
        const failures = results
          .filter((r) => !excused.has(r.id))
          .flatMap((r) =>
            r.targets.map((target) => `${r.id} (${r.impact ?? '?'}): ${r.help} at ${target}`),
          );
        expect(failures, `${story.id} in ${scheme}`).toEqual([]);
      });
    }
  });
}
