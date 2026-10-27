import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { axeViolations, expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { EmptyState, type EmptyStateHeadingLevel } from './EmptyState.js';
import * as stories from './EmptyState.stories.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EmptyState', () => {
  test.each([2, 3, 4, 5, 6] as const)(
    'renders an h%i with the title and tabIndex -1 (L07 decisions 1 and 8)',
    (level: EmptyStateHeadingLevel) => {
      render(<EmptyState headingLevel={level} title="No projects yet" />);
      const heading = screen.getByRole('heading', { level, name: 'No projects yet' });
      expect(heading.tagName).toBe(`H${String(level)}`);
      expect(heading).toHaveAttribute('tabindex', '-1');
    },
  );

  test('the root is a plain div: no role, no title attribute, not a section (L07 decisions 2, 3)', () => {
    const { container } = render(<EmptyState headingLevel={2} title="No projects yet" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('DIV');
    expect(root).not.toHaveAttribute('role');
    expect(root).not.toHaveAttribute('title');
    expect(container.querySelector('[title], section')).toBeNull();
  });

  test('the illustration is wrapped in aria-hidden="true" (L07 decision 4)', () => {
    render(
      <EmptyState
        headingLevel={2}
        title="No projects yet"
        illustration={<svg data-testid="art" />}
      />,
    );
    expect(screen.getByTestId('art').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  test('renders the description in a <p> and the actions after it; leaves out what is not given', () => {
    const { container, rerender } = render(
      <EmptyState
        headingLevel={2}
        title="No projects yet"
        description="Projects appear here."
        actions={<button type="button">Create project</button>}
      />,
    );
    expect(screen.getByText('Projects appear here.').tagName).toBe('P');
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDefined();
    rerender(<EmptyState headingLevel={2} title="No projects yet" />);
    expect(container.querySelector('p, [aria-hidden], .senui-empty-state__actions')).toBeNull();
    // An empty description (`error?.message ?? ''`) renders no empty paragraph (review).
    rerender(<EmptyState headingLevel={2} title="No projects yet" description="" />);
    expect(container.querySelector('p')).toBeNull();
  });

  describe('root ownership (CONVENTIONS rule 2)', () => {
    test('ref reaches the root div, headingRef the heading', () => {
      const ref = createRef<HTMLDivElement>();
      const headingRef = createRef<HTMLHeadingElement>();
      const { container } = render(
        <EmptyState ref={ref} headingRef={headingRef} headingLevel={3} title="No results" />,
      );
      expect(ref.current).toBe(container.firstElementChild);
      expect(headingRef.current).toBe(screen.getByRole('heading', { level: 3 }));
    });

    test('className is merged with senui-empty-state; native attributes pass through', () => {
      const { container } = render(
        <EmptyState
          className="results-empty"
          aria-live="polite"
          data-testid="empty"
          headingLevel={2}
          title="No results"
        />,
      );
      const root = container.firstElementChild;
      expect(root).toHaveClass('senui-empty-state', 'results-empty');
      expect(root).toHaveAttribute('aria-live', 'polite');
      expect(root).toHaveAttribute('data-testid', 'empty');
    });
  });

  test('never moves focus: an input keeps it through mount and re-render (L07 decision 8)', () => {
    function Filter({ query }: { query: string }) {
      return (
        <>
          <input aria-label="Filter" />
          {query !== '' && (
            <EmptyState
              headingLevel={2}
              title={`No results for ${query}`}
              actions={<button type="button">Clear</button>}
            />
          )}
        </>
      );
    }
    const { rerender } = render(<Filter query="" />);
    const input = screen.getByRole('textbox', { name: 'Filter' });
    input.focus();
    rerender(<Filter query="x" />);
    expect(document.activeElement).toBe(input);
    rerender(<Filter query="xy" />);
    expect(document.activeElement).toBe(input);
  });

  describe('development warnings', () => {
    async function load() {
      vi.resetModules();
      return (await import('./EmptyState.js')).EmptyState;
    }

    test.each([
      ['an empty string', ''],
      ['whitespace', '   '],
    ])('warns once for a title that is %s', async (_case, title) => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Fresh headingLevel={2} title={title} />);
      render(<Fresh headingLevel={2} title={title} />);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/EmptyState has an empty `title`/);
    });

    test('warns for an element title that renders no text', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Fresh headingLevel={2} title={<span />} />);
      expect(warn).toHaveBeenCalledOnce();
    });

    test('warns when the illustration contains a focusable element (L07 decision 4)', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Fresh headingLevel={2} title="No projects yet" illustration={<a href="#help">Help</a>} />,
      );
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/illustration` contains a focusable element/);
    });

    test('warns when actions contain nothing a keyboard can reach (review)', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Fresh headingLevel={2} title="No projects yet" actions={<span>Create project</span>} />,
      );
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/`actions` contains nothing a keyboard can reach/);
    });

    // The checks follow the value, not only the mount (review).
    test('warns when a valid title later turns empty', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { rerender } = render(<Fresh headingLevel={2} title="No projects yet" />);
      expect(warn).not.toHaveBeenCalled();
      rerender(<Fresh headingLevel={2} title="" />);
      expect(warn).toHaveBeenCalledOnce();
    });

    test('warns when the illustration is swapped for a focusable one', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { rerender } = render(<Fresh headingLevel={2} title="x" illustration={<svg />} />);
      expect(warn).not.toHaveBeenCalled();
      rerender(<Fresh headingLevel={2} title="x" illustration={<a href="#help">Help</a>} />);
      expect(warn).toHaveBeenCalledOnce();
    });

    test('is silent for a valid empty state', async () => {
      const Fresh = await load();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Fresh
          headingLevel={2}
          title="No projects yet"
          illustration={<svg focusable="false" />}
          actions={<button type="button">Create project</button>}
        />,
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe('stories', () => {
  const composed = composeStories(stories);

  // A story with controls must render from its args (CONVENTIONS, "File layout").
  test.each(withControls(composed))('%s renders from its args', (_name, Story) => {
    render(<Story title="Changed by a control" />);
    expect(screen.getByRole('heading', { name: 'Changed by a control' })).toBeDefined();
  });

  test.each(Object.entries(composed))('%s passes axe', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });

  // Plan: heading levels never jump by more than one in a story.
  test.each(Object.entries(composed))('%s: heading levels never skip', (_name, Story) => {
    const { container } = render(<Story />);
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'), (heading) =>
      Number(heading.tagName.slice(1)),
    );
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
  });
});

describe('axe heading-order is active for compositions (plan: page and card)', () => {
  test('a skipped level under a page heading is reported', async () => {
    const { container } = render(
      <div>
        <h1>Projects</h1>
        <EmptyState headingLevel={3} title="No projects yet" />
      </div>,
    );
    expect(await axeViolations(container)).toEqual([expect.stringMatching(/^heading-order/)]);
  });

  test('the page and card stories pass with it', async () => {
    const { InPage, InCard } = composeStories(stories);
    for (const Story of [InPage, InCard]) {
      const { container, unmount } = render(<Story />);
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
  });
});
