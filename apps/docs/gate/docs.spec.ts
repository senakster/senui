// L09 decision 9: every docs entry (each component's page and each MDX page) is checked as a page,
// because consumers read it as one: landmarks, one `<h1>`, a heading outline that holds with the
// live stories in it, axe at two widths in both schemes, reflow, a tab walk, and nothing modal or
// inert after render. The stories on the page are checked by their own entries, so axe and the
// reflow check leave their canvases out. Storybook's manager frame isn't checked (L09 "Out of
// scope"); these pages are opened on their own, as the frame-free link on each page does.
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { AXE_TAGS } from './checks.js';
import { DOCS_EXCLUDE, loadDocs, openDocs, pageName, storiesRendered } from './docs.js';
import { injectMeasure } from './stories.js';
import { walk } from './walk.js';

const AXE = createRequire(new URL('../../../packages/react/package.json', import.meta.url)).resolve(
  'axe-core/axe.min.js',
);

interface AxeFinding {
  id: string;
  impact: string | null;
  help: string;
  targets: string[];
}

/**
 * Axe over the whole document (so its page-level rules run), leaving out `exclude`. Contrast axe
 * couldn't compute fails like a violation, as in axe.spec.ts. No rule is turned off: the
 * page-level rules (`region`, `landmark-one-main`, `page-has-heading-one`) and `heading-order` are
 * on, and docs pages have no exceptions.
 */
async function runAxe(
  page: Page,
  exclude: readonly string[],
  only?: readonly string[],
): Promise<string[]> {
  // Once per page: the combined test below runs axe four times on one load.
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: AXE });
  const results = await page.evaluate(
    async ({ tags, exclude: excluded, only: rules }) => {
      const axe = (
        window as unknown as {
          axe: {
            run: (
              context: unknown,
              options: unknown,
            ) => Promise<{
              violations: {
                id: string;
                impact: string | null;
                help: string;
                nodes: { target: string[] }[];
              }[];
              incomplete: {
                id: string;
                impact: string | null;
                help: string;
                nodes: { target: string[] }[];
              }[];
            }>;
          };
        }
      ).axe;
      const result = await axe.run(
        { include: [document], exclude: excluded.map((selector) => [selector]) },
        {
          runOnly: rules ? { type: 'rule', values: rules } : { type: 'tag', values: tags },
          rules: rules ? {} : { 'color-contrast': { enabled: true } },
          resultTypes: ['violations', 'incomplete'],
        },
      );
      // Axe can't compute the contrast of text scrolled out of view inside a scroll region (it
      // reports it "partially obscured"). Those elements are scrolled into view, region by region,
      // and every one visible at that scroll position is checked again in a single axe run (one run
      // per element cost several seconds a page at 320 px). Only what is still incomplete, or
      // fails, is reported.
      const incompleteContrast: typeof result.incomplete = [];
      for (const finding of result.incomplete.filter((r) => r.id === 'color-contrast')) {
        const still: { target: string[] }[] = [];
        const byRegion = new Map<Element, { node: { target: string[] }; el: Element }[]>();
        for (const node of finding.nodes) {
          const el = document.querySelector(node.target.join(' '));
          const region = el?.closest('.docs-scroll, .docs-canvas');
          if (!el || !region) {
            still.push(node);
            continue;
          }
          const items = byRegion.get(region) ?? [];
          items.push({ node, el });
          byRegion.set(region, items);
        }
        const inView = (el: Element, box: DOMRect) => {
          const r = el.getBoundingClientRect();
          return (
            r.left >= box.left - 0.5 &&
            r.right <= box.right + 0.5 &&
            r.top >= 0 &&
            r.bottom <= window.innerHeight
          );
        };
        for (const [region, items] of byRegion) {
          let left = items;
          while (left.length > 0) {
            const [first] = left;
            if (!first) break;
            first.el.scrollIntoView({ block: 'center', inline: 'nearest' });
            const box = region.getBoundingClientRect();
            const visible = left.filter(({ el }) => inView(el, box));
            const batch = visible.length > 0 ? visible : [first];
            const again = await axe.run(
              { include: batch.map(({ el }) => [el]) },
              {
                runOnly: { type: 'rule', values: ['color-contrast'] },
                resultTypes: ['violations', 'incomplete'],
              },
            );
            result.violations.push(...again.violations);
            const unresolved = new Set(
              again.incomplete.flatMap((r) =>
                r.nodes.map((n) => document.querySelector(n.target.join(' '))),
              ),
            );
            for (const item of batch) if (unresolved.has(item.el)) still.push(item.node);
            left = left.filter((item) => !batch.includes(item));
          }
          region.scrollLeft = 0;
        }
        if (still.length > 0) incompleteContrast.push({ ...finding, nodes: still });
      }
      return [
        ...result.violations,
        ...incompleteContrast.map((r) => ({ ...r, id: 'color-contrast:incomplete' })),
      ].map((r): AxeFinding => ({
        id: r.id,
        impact: r.impact,
        help: r.help,
        targets: r.nodes.map((node) => node.target.join(' ')),
      }));
    },
    { tags: [...AXE_TAGS], exclude: [...exclude], only: only ? [...only] : undefined },
  );
  return results.flatMap((r) =>
    r.targets.map((target) => `${r.id} (${r.impact ?? '?'}): ${r.help} at ${target}`),
  );
}

const docsEntries = loadDocs();
/** A package's changelog page (`Changelog/senui`), not a migration note under it. */
const CHANGELOG = /^Changelog\/(?!Migrating)/;

// One page load per docs page: each scheme and width is applied in place (the docs surface follows
// `color-scheme` live, and a resize reflows it), because loading the page and waiting for every
// inline story was most of the cost when each combination loaded it again.
for (const docs of docsEntries) {
  test(`docs page axe, light and dark, 1280 and 320 px: ${docs.id}`, async ({ page }) => {
    // Four axe runs, so four tests' worth of time.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: 'light' });
    await openDocs(page, docs);
    const failures: string[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 800 });
        // Let the new scheme and width settle before measuring: two frames.
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        for (const failure of await runAxe(page, DOCS_EXCLUDE)) {
          failures.push(`${scheme}, ${String(width)} px: ${failure}`);
        }
      }
    }
    expect(failures, docs.id).toEqual([]);
  });
}

/** Headings in the docs root, inline stories included, framed ones (their own documents) not. */
function outline(page: Page): Promise<{ level: number; text: string }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('#storybook-docs :is(h1, h2, h3, h4, h5, h6)')].map((h) => ({
      level: Number(h.tagName.slice(1)),
      text: h.textContent.trim(),
    })),
  );
}

for (const docs of docsEntries) {
  test(`docs page outline: ${docs.id}`, async ({ page }) => {
    await openDocs(page, docs);
    const failures: string[] = [];
    const landmarks = await page.evaluate(() => ({
      mains: document.querySelectorAll('main, [role="main"]').length,
      outside: [...document.querySelectorAll('#storybook-docs .sbdocs-content > *')].filter(
        (el) => !el.matches('main'),
      ).length,
    }));
    if (landmarks.mains !== 1) failures.push(`${String(landmarks.mains)} main landmarks, not 1`);
    if (landmarks.outside > 0)
      failures.push(`${String(landmarks.outside)} elements outside <main>`);
    const headings = await outline(page);
    const h1s = headings.filter((h) => h.level === 1);
    if (h1s.length !== 1) {
      failures.push(`${String(h1s.length)} <h1>s, not 1: ${h1s.map((h) => h.text).join(', ')}`);
    } else if (!docs.mdx && h1s[0]?.text !== pageName(docs)) {
      failures.push(`the <h1> reads "${h1s[0]?.text ?? ''}", not "${pageName(docs)}"`);
    } else if (CHANGELOG.test(docs.title)) {
      // L10 decision 8: a changelog page is titled after its package, not after Changesets' heading.
      const expected = `@senakster/${pageName(docs)} changelog`;
      if (h1s[0]?.text !== expected) {
        failures.push(`the <h1> reads "${h1s[0]?.text ?? ''}", not "${expected}"`);
      }
    }
    if (headings[0]?.level !== 1) failures.push('the first heading is not the <h1>');
    headings.forEach((h, i) => {
      const before = headings[i - 1];
      if (before && h.level > before.level + 1) {
        failures.push(
          `h${String(h.level)} "${h.text}" follows h${String(before.level)} "${before.text}"`,
        );
      }
    });
    // Axe's own heading rules, with the live stories in: only Storybook's chrome and framed stories
    // (other documents) are left out.
    failures.push(
      ...(await runAxe(
        page,
        DOCS_EXCLUDE.filter((selector) => !selector.endsWith('.sb-story')),
        ['heading-order', 'page-has-heading-one', 'empty-heading'],
      )),
    );
    expect(failures, `${docs.id}: outline`).toEqual([]);
  });

  // WCAG 1.4.10. At 320 px the document never scrolls sideways; only a focusable, named region
  // (a code block, a data table, a story canvas whose story is wider) may.
  test(`docs page reflow at 320 px: ${docs.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openDocs(page, docs);
    // A canvas becomes focusable when its story overflows it, after a resize observation.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const failures = await page.evaluate(() => {
      const out: string[] = [];
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth + 1) {
        out.push(
          `the document scrolls sideways (${String(root.scrollWidth)} > ${String(root.clientWidth)})`,
        );
      }
      const describe = (el: Element) =>
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''}`;
      const nameOf = (el: Element) =>
        (el.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim() || (el.getAttribute('aria-label') ?? '').trim();
      for (const el of document.querySelectorAll('#storybook-docs *')) {
        // A story's own content is checked by the story's entry.
        if (el.closest('.sb-story')) continue;
        if (!el.checkVisibility()) continue;
        const s = getComputedStyle(el);
        // Visually hidden text (a table's caption) is clipped on purpose; it is read, not seen.
        if (el.closest('.docs-visually-hidden')) continue;
        const wider = el.scrollWidth > el.clientWidth + 1;
        const scrolls = (s.overflowX === 'auto' || s.overflowX === 'scroll') && wider;
        if ((s.overflowX === 'hidden' || s.overflowX === 'clip') && wider) {
          out.push(`${describe(el)} hides content that is wider than it`);
        }
        if (!scrolls) continue;
        const problems = [
          (el as HTMLElement).tabIndex < 0 ? 'is not focusable' : '',
          el.getAttribute('role') !== 'region' ? 'is not a region' : '',
          nameOf(el) === '' ? 'has no name' : '',
        ].filter(Boolean);
        if (problems.length > 0)
          out.push(`${describe(el)} scrolls sideways and ${problems.join(', ')}`);
      }
      return out;
    });
    expect(failures, `${docs.id}: reflow`).toEqual([]);
  });

  // Decision 6a, as a page: every stop is keyboard focus, named, not covered, with a real ring;
  // no assumption that a stop belongs to one component's root. Tab must leave the page.
  test(`docs page tab walk: ${docs.id}`, async ({ page, browserName }) => {
    await openDocs(page, docs);
    await injectMeasure(page);
    const failures = await walk(page, browserName, true, { maxPresses: 800, mustFinish: true });
    expect(failures, `${docs.id}: tab walk`).toEqual([]);
  });

  // Docs pages never run a play function, and no story may leave the page modal or inert: nothing
  // has focus, no modal dialog is open, and nothing outside a story's own canvas is inert.
  test(`docs page state: ${docs.id}`, async ({ page }) => {
    await openDocs(page, docs);
    const state = await page.evaluate(() => ({
      focus:
        document.activeElement === document.body
          ? null
          : document.activeElement?.outerHTML.slice(0, 120),
      modal: document.querySelectorAll('dialog:modal').length,
      inert: [...document.querySelectorAll('[inert]')]
        .filter((el) => !el.closest('.sb-story'))
        .map((el) => el.outerHTML.slice(0, 120)),
      mainInert: Boolean(document.querySelector('main')?.closest('[inert]')),
      autoplayFrames: [
        ...document.querySelectorAll<HTMLIFrameElement>('iframe[data-senui-docs-story]'),
      ]
        .filter((frame) => new URL(frame.src).searchParams.get('embed') !== 'true')
        .map((frame) => frame.src),
    }));
    expect(state, `${docs.id}: state after render`).toEqual({
      focus: null,
      modal: 0,
      inert: [],
      mainInert: false,
      autoplayFrames: [],
    });
  });

  // The surface follows the colour scheme, and each framed story gets the page's scheme passed in
  // (Safari doesn't pass `color-scheme` into an iframe).
  test(`docs page colour scheme: ${docs.id}`, async ({ page }) => {
    // Twice over, every modal story's frame loads its own Storybook.
    test.setTimeout(120_000);
    const measured: Record<string, { surface: string; frames: string[] }> = {};
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await openDocs(page, docs);
      // A modal story's frame loads when the reader asks for it (DocsStory): ask for every one.
      await page.evaluate(() => {
        for (const button of document.querySelectorAll<HTMLElement>('[data-senui-docs-show]')) {
          button.click();
        }
      });
      await storiesRendered(page);
      measured[scheme] = await page.evaluate(() => {
        const wrapper = document.querySelector('#storybook-docs .sbdocs-wrapper');
        const surface = wrapper ? getComputedStyle(wrapper).backgroundColor : '';
        const frames = [
          ...document.querySelectorAll<HTMLIFrameElement>('iframe[data-senui-docs-story]'),
        ].map((frame) => {
          const doc = frame.contentDocument;
          if (!doc) return 'no document';
          return `${doc.documentElement.style.colorScheme} ${getComputedStyle(doc.body).backgroundColor}`;
        });
        return { surface, frames };
      });
    }
    const { light, dark } = measured;
    test.info().annotations.push({
      type: 'surface',
      description: `light ${light?.surface ?? '?'}, dark ${dark?.surface ?? '?'}`,
    });
    expect(light?.surface, 'the surface has a background').toBeTruthy();
    expect(dark?.surface, 'the surface differs between light and dark').not.toBe(light?.surface);
    for (const scheme of ['light', 'dark'] as const) {
      const m = measured[scheme];
      expect(
        m?.frames.filter((frame) => frame !== `${scheme} ${m.surface}`),
        `framed stories take the page's ${scheme} scheme and surface`,
      ).toEqual([]);
    }
  });
}
