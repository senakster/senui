import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { axeViolations, expectNoAxeViolations } from '../../internal/testing/axe.js';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { EmptyState } from './EmptyState.js';
import * as stories from './EmptyState.stories.js';

const { InPage, InTableCell, NoResults, DeletedLastItem, NoData } = composeStories(stories);

/** The element matching `selector` in `root`; fails the test if there is none. */
function get(root: Element, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`No ${selector}`);
  return element;
}
const body = (root: Element) => get(root, '.senui-empty-state__body');

afterEach(async () => {
  await page.viewport(414, 896);
});

// Real layout, container queries and focus (Chromium). jsdom has none of them.
describe('EmptyState in a browser', () => {
  describe('layout follows the container, not a prop (L07 decision 9)', () => {
    test('the page story is stacked and centred', async () => {
      // A page is wider than the runner's default 414 px viewport, which is below the breakpoint.
      await page.viewport(1024, 768);
      const { container } = render(<InPage />);
      const style = getComputedStyle(body(get(container, '.senui-empty-state')));
      expect(style.flexDirection).toBe('column');
      expect(style.alignItems).toBe('center');
      expect(style.textAlign).toBe('center');
    });

    test('the table-cell story is compact, with a root wider than zero (decision 10)', () => {
      const { container } = render(<InTableCell />);
      const root = get(container, '.senui-empty-state');
      const style = getComputedStyle(body(root));
      expect(style.flexDirection).toBe('row');
      expect(style.textAlign).toBe('start');
      expect(root.getBoundingClientRect().width).toBeGreaterThan(0);
    });

    // Inline-size containment means content can't size the root. In a parent that sizes its items
    // to fit (start-aligned grid, flex row), an `auto` width would collapse to 0; 100% fills it.
    test.each([
      ['a start-aligned grid', { display: 'grid', justifyItems: 'start' }],
      ['a flex row', { display: 'flex' }],
    ] as const)('fills %s rather than collapsing (L07 decision 10)', (_case, layout) => {
      const { container } = render(
        <div style={{ ...layout, inlineSize: '25rem' }}>
          <EmptyState headingLevel={2} title="No projects yet" />
        </div>,
      );
      const parent = get(container, ':scope > div');
      const root = get(parent, '.senui-empty-state');
      expect(root.getBoundingClientRect().width).toBe(parent.getBoundingClientRect().width);
    });

    test('switches at 30rem of container width', () => {
      const at = (width: string) => {
        const { container, unmount } = render(
          <div style={{ inlineSize: width }}>
            <EmptyState headingLevel={2} title="No projects yet" />
          </div>,
        );
        const direction = getComputedStyle(body(container)).flexDirection;
        unmount();
        return direction;
      };
      expect(at('29.9rem')).toBe('row');
      expect(at('30rem')).toBe('column');
    });

    test('the illustration takes the compact and stacked sizes', () => {
      const size = (width: string) => {
        const { container, unmount } = render(
          <div style={{ inlineSize: width }}>
            <EmptyState headingLevel={2} title="No projects yet" illustration={<svg />} />
          </div>,
        );
        const box = get(container, '.senui-empty-state__illustration');
        const { width: measured } = box.getBoundingClientRect();
        unmount();
        return measured;
      };
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      expect(size('20rem')).toBe(2.5 * rem);
      expect(size('40rem')).toBe(5 * rem);
    });
  });

  test('no-results story: the status region exists first, empty and outside; typing updates it and keeps focus', async () => {
    const { container } = render(<NoResults />);
    const status = screen.getByRole('status');
    // Before anything is typed: in the page, empty, and not inside an EmptyState.
    expect(status.textContent).toBe('');
    expect(status.closest('.senui-empty-state')).toBeNull();
    expect(container.querySelector('.senui-empty-state')).toBeNull();

    const input = screen.getByRole('searchbox', { name: 'Filter products' });
    await userEvent.click(input);
    await userEvent.type(input, 'xyz');
    // Typing quickly: one update, after the story's one-second pause, not one per letter.
    expect(status.textContent).toBe('');
    await expect.poll(() => status.textContent, { timeout: 3000 }).toBe('No results for “xyz”');
    // The same region, not a new one rendered with the empty state.
    expect(screen.getByRole('status')).toBe(status);
    expect(status.closest('.senui-empty-state')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  test('deleted-last-item story: focus goes to the first action, not <body> (L07 decision 8)', async () => {
    render(<DeletedLastItem />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Quarterly report' }));
    const action = await screen.findByRole('button', { name: 'Create report' });
    await expect.poll(() => document.activeElement).toBe(action);
  });

  // Real key presses (Playwright). Emil's NVDA run reported "Space does nothing" (2026-10-26); with
  // no screen reader running, both keys delete and move focus.
  test.each([
    ['Space', ' '],
    ['Enter', '{Enter}'],
  ])('deleted-last-item story by keyboard: %s deletes and moves focus', async (_key, key) => {
    render(<DeletedLastItem />);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Delete Quarterly report' }),
    );
    await userEvent.keyboard(key);
    const action = await screen.findByRole('button', { name: 'Create report' });
    await expect.poll(() => document.activeElement).toBe(action);
  });

  // Review: set together, NVDA read the status before and again after the focus move. The status
  // must still be empty at the moment focus lands, and filled after.
  test('deleted-last-item story: the status is set after the focus move', async () => {
    render(<DeletedLastItem />);
    const status = screen.getByRole('status');
    let statusAtFocus: string | null = null;
    const listening = new AbortController();
    document.addEventListener(
      'focusin',
      (event) => {
        if ((event.target as Element).textContent === 'Create report') {
          statusAtFocus = status.textContent;
        }
      },
      { signal: listening.signal },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete Quarterly report' }));
    await expect.poll(() => status.textContent).toBe('Quarterly report deleted');
    listening.abort();
    expect(statusAtFocus).toBe('');
  });

  test('the heading shows the focus ring when script focuses it after keyboard use', async () => {
    const { container } = render(<NoData />);
    await userEvent.keyboard('{Tab}');
    const heading = get(container, '.senui-empty-state__title');
    heading.focus();
    expect(heading.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(heading).outlineStyle).toBe('solid');
  });

  test('the illustration is inert: a link in it is never a tab stop (review)', async () => {
    const { container } = render(
      <>
        <button type="button">Before</button>
        <EmptyState
          headingLevel={2}
          title="No projects yet"
          illustration={<a href="#help">Help</a>}
          actions={<button type="button">Create project</button>}
        />
      </>,
    );
    const wrapper = get(container, '.senui-empty-state__illustration');
    expect(wrapper.inert).toBe(true);
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    screen.getByRole('button', { name: 'Before' }).focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create project' }));
  });

  test('illustrations of any shape fit the box without distortion (review)', async () => {
    const { IllustrationShapes } = composeStories(stories);
    const { container } = render(<IllustrationShapes />);
    const [imageBox, iconBox] = container.querySelectorAll<HTMLElement>(
      '.senui-empty-state__illustration',
    );
    if (!imageBox || !iconBox) throw new Error('No illustrations');
    const image = imageBox.querySelector('img');
    if (!image) throw new Error('No img');
    await image.decode();
    const box = imageBox.getBoundingClientRect();
    expect(box.width).toBe(box.height);
    expect(image.getBoundingClientRect().width).toBeLessThanOrEqual(box.width);
    expect(image.getBoundingClientRect().height).toBeLessThanOrEqual(box.height);
    expect(getComputedStyle(image).objectFit).toBe('contain');
    // The icon's SVG sits in a <span>, and still fills the box.
    expect(get(iconBox, 'svg').getBoundingClientRect().width).toBe(
      iconBox.getBoundingClientRect().width,
    );
  });

  test('a <picture> illustration fits the box too', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600"/></svg>';
    const { container } = render(
      <EmptyState
        headingLevel={2}
        title="No projects yet"
        illustration={
          <picture>
            <img src={`data:image/svg+xml,${encodeURIComponent(svg)}`} alt="" />
          </picture>
        }
      />,
    );
    const wrapper = get(container, '.senui-empty-state__illustration');
    const image = wrapper.querySelector('img');
    if (!image) throw new Error('No img');
    await image.decode();
    const box = wrapper.getBoundingClientRect();
    expect(get(wrapper, 'picture').getBoundingClientRect().width).toBe(box.width);
    expect(image.getBoundingClientRect().width).toBeLessThanOrEqual(box.width);
  });

  describe('aria-hidden-focus (L07 decision 4)', () => {
    // Before the review this asserted the violation; `inert` now takes the link out of the tab
    // order, so even a consumer's mistake passes. Without inert this fails (probed).
    test('a link in the illustration is no violation: the wrapper is inert', async () => {
      const { container } = render(
        <EmptyState
          headingLevel={2}
          title="No projects yet"
          illustration={<a href="#help">Help</a>}
        />,
      );
      expect(await axeViolations(container)).toEqual([]);
    });
  });

  // Every story, with the real CSS: rendered contrast (the muted description), and
  // aria-hidden-focus for every story with an illustration.
  describe('axe with rendered contrast, every story', () => {
    test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
      const { container } = render(<Story />);
      await expectNoAxeViolations(container, { contrast: true });
    });
  });
});
