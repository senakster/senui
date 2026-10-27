// L08 decision 4, `semantics` rows: the element and role the contract names are what renders, and a
// required name is in the accessibility tree.
import { expect, test, type Page } from '@playwright/test';
import type { A11yContract } from '../../../packages/react/src/internal/a11y/a11y-contract.js';
import { exceptionFor } from './exceptions.js';
import { contractFor, loadStories, openStory, rootClass, type GateStory } from './stories.js';

const stories = loadStories();

/**
 * The component's elements in the open story: its root when the root is that element (a Button),
 * or the element inside its root (a Checkbox's `<input>` inside `.senui-checkbox`).
 */
function selectorFor(story: GateStory, contract: A11yContract): string {
  const root = rootClass(story.component);
  return `${contract.semantics.element}.${root}, .${root} ${contract.semantics.element}`;
}

async function elementsOf(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((el) => ({
      role: el.getAttribute('role'),
      rendered: (el as HTMLElement).checkVisibility(),
      html: el.outerHTML.slice(0, 80),
    })),
  );
}

// Wherever the component renders, it matches its contract. A story may not render it at first: a
// scenario story (EmptyState's NoResults) shows it only after an interaction.
for (const story of stories) {
  test(`semantics: ${story.id}`, async ({ page, browserName }) => {
    test.skip(Boolean(exceptionFor(story, 'semantics')), 'Excepted (exceptions.json)');
    const contract = await contractFor(story);
    await openStory(page, story);

    const { role, name } = contract.semantics;
    const selector = selectorFor(story, contract);
    const found = await elementsOf(page, selector);
    for (const item of found) {
      expect(item.role, `${story.id}: role of ${item.html}`).toBe(role ?? null);
    }

    // A required name, read from the accessibility tree, not the DOM. Chromium only: the tree comes
    // from the DevTools protocol. Elements that aren't rendered (a closed dialog) aren't in it.
    if (browserName !== 'chromium' || name === 'none' || !name.required || found.length === 0)
      return;
    const cdp = await page.context().newCDPSession(page);
    const { root: documentNode } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
      nodeId: documentNode.nodeId,
      selector,
    });
    const unnamed: string[] = [];
    for (const [index, nodeId] of nodeIds.entries()) {
      const item = found[index];
      if (!item?.rendered) continue;
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
        nodeId,
        fetchRelatives: false,
      });
      const accessibleName: unknown = nodes[0]?.name?.value;
      if (typeof accessibleName !== 'string' || accessibleName.trim() === '')
        unnamed.push(item.html);
    }
    expect(unnamed, `${story.id}: required name missing`).toEqual([]);
  });
}

// And each component's first story renders it, so a contract naming the wrong element can't pass
// by matching nothing.
const firstStories = stories.filter(
  (story, index) => stories.findIndex((other) => other.component === story.component) === index,
);
for (const story of firstStories) {
  test(`semantics: ${story.component} renders its element in ${story.id}`, async ({ page }) => {
    const contract = await contractFor(story);
    await openStory(page, story);
    const found = await elementsOf(page, selectorFor(story, contract));
    expect(
      found.length,
      `no <${contract.semantics.element}> for .${rootClass(story.component)}`,
    ).toBeGreaterThan(0);
  });
}
