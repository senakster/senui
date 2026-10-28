import { createRef } from 'react';
import { describe, expectTypeOf, test } from 'vitest';
import { EmptyState, type EmptyStateHeadingLevel, type EmptyStateProps } from './EmptyState.js';

describe('EmptyState types', () => {
  test('title is required, and never null or false (WCAG 2.4.6)', () => {
    void (<EmptyState headingLevel={2} title="No projects yet" />);
    void (<EmptyState headingLevel={2} title={<span lang="da">Ingen projekter</span>} />);
    // @ts-expect-error -- no title
    void (<EmptyState headingLevel={2} />);
    // @ts-expect-error -- null renders an empty heading
    void (<EmptyState headingLevel={2} title={null} />);
    // @ts-expect-error -- false renders an empty heading
    void (<EmptyState headingLevel={2} title={false} />);
    const maybeTitle = undefined as string | undefined;
    // @ts-expect-error -- a title that may be undefined
    void (<EmptyState headingLevel={2} title={maybeTitle} />);
  });

  test('headingLevel is required, 2 to 6 (L07 decision 1)', () => {
    expectTypeOf<EmptyStateHeadingLevel>().toEqualTypeOf<2 | 3 | 4 | 5 | 6>();
    // @ts-expect-error -- no heading level
    void (<EmptyState title="No projects yet" />);
    // @ts-expect-error -- the page keeps its own h1
    void (<EmptyState headingLevel={1} title="No projects yet" />);
    // @ts-expect-error -- not a heading level
    void (<EmptyState headingLevel={7} title="No projects yet" />);
  });

  test('the illustration takes no alt: it is decorative (L07 decision 4)', () => {
    void (<EmptyState headingLevel={2} title="No projects yet" illustration={<svg />} />);
    void (
      <EmptyState
        headingLevel={2}
        title="No projects yet"
        illustration={<svg />}
        // @ts-expect-error -- meaning goes in title or description
        alt="An empty folder"
      />
    );
  });

  test('the root takes no name, role or children', () => {
    // @ts-expect-error -- naming is prohibited on a role-less div
    void (<EmptyState headingLevel={2} title="No projects yet" aria-label="Projects" />);
    // @ts-expect-error -- naming is prohibited on a role-less div
    void (<EmptyState headingLevel={2} title="No projects yet" aria-labelledby="projects" />);
    // @ts-expect-error -- never read on an unnamed, unfocusable div: use description (review)
    void (<EmptyState headingLevel={2} title="No projects yet" aria-describedby="hint" />);
    // @ts-expect-error -- never read on an unnamed, unfocusable div (review)
    void (<EmptyState headingLevel={2} title="No projects yet" aria-description="Empty" />);
    // @ts-expect-error -- prohibited on an element with no role (review)
    void (<EmptyState headingLevel={2} title="No projects yet" aria-roledescription="panel" />);
    // @ts-expect-error -- the role is fixed (L02, Emil 2026-10-26)
    void (<EmptyState headingLevel={2} title="No projects yet" role="region" />);
    // @ts-expect-error -- never a tab stop: focus headingRef instead (review)
    void (<EmptyState headingLevel={2} title="No projects yet" tabIndex={-1} />);
    void (
      (
        // @ts-expect-error -- content goes in title, description and actions
        <EmptyState headingLevel={2} title="No projects yet">
          Nothing here
        </EmptyState>
      )
    );
  });

  test('actions is an element: a button, a link or a fragment, never text (review)', () => {
    void (
      <EmptyState headingLevel={2} title="x" actions={<button type="button">Create</button>} />
    );
    void (
      <EmptyState
        headingLevel={2}
        title="x"
        actions={
          <>
            <button type="button">Create</button>
            <a href="#import">Import</a>
          </>
        }
      />
    );
    const canCreate = true as boolean;
    void (
      <EmptyState
        headingLevel={2}
        title="x"
        actions={canCreate ? <button type="button">Create</button> : undefined}
      />
    );
    // @ts-expect-error -- a label renders nothing to activate
    void (<EmptyState headingLevel={2} title="x" actions="Create project" />);
    // @ts-expect-error -- pass undefined, not null
    void (<EmptyState headingLevel={2} title="x" actions={null} />);
    void (
      <EmptyState
        headingLevel={2}
        title="x"
        // @ts-expect-error -- pass undefined, not false
        actions={canCreate && <button type="button" />}
      />
    );
    // @ts-expect-error -- an array, empty when the list is
    void (<EmptyState headingLevel={2} title="x" actions={[<button type="button" key="a" />]} />);
  });

  test('the native title attribute is gone; aria-live, handlers and data pass through', () => {
    expectTypeOf<EmptyStateProps['title']>().not.toEqualTypeOf<string | undefined>();
    void (
      <EmptyState
        headingLevel={3}
        title="No results"
        aria-live="polite"
        onClick={() => undefined}
        data-testid="empty"
        id="empty"
        className="results-empty"
      />
    );
  });

  test('ref reaches the root div, headingRef the heading', () => {
    void (
      <EmptyState
        ref={createRef<HTMLDivElement>()}
        headingRef={createRef<HTMLHeadingElement>()}
        headingLevel={2}
        title="No projects yet"
      />
    );
    // @ts-expect-error -- the root is a div
    void (<EmptyState ref={createRef<HTMLButtonElement>()} headingLevel={2} title="x" />);
  });
});
