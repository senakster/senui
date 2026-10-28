import { forwardRef, useCallback, type ReactElement, type ReactNode, type Ref } from 'react';
import { warnOnce } from '../../internal/dev/dev.js';
import { firstFocusable } from '../../internal/dom/focusable.js';
import type { NativeProps } from '../../internal/dom/native-props.js';
import { useComposedRefs } from '../../internal/dom/refs.js';

/**
 * The heading's level. Required, with no default, because an empty state sits in your page's outline
 * and any default is wrong somewhere. No `1`: the page keeps its own `<h1>`.
 */
export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** Root attributes EmptyState declares `never` below, so they leave the native props first. */
type Withheld =
  | 'title'
  | 'tabIndex'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-description'
  | 'aria-roledescription';

export type EmptyStateProps = Omit<NativeProps<'div'>, Withheld> & {
  /**
   * What is empty, as a heading: "No projects yet", "No results for 'xyz'". Text or one element;
   * never `null` or `false`, which would render an empty heading (WCAG 2.4.6).
   */
  title: string | ReactElement;
  /** The heading's level in your page outline, one below the heading the empty state sits under. */
  headingLevel: EmptyStateHeadingLevel;
  /**
   * Why it is empty, or what to do next. Rendered in a `<p>`, so pass phrasing content only: text,
   * links, `<strong>`. Never a paragraph or a list. An empty string renders nothing.
   */
  description?: ReactNode;
  /**
   * A decorative picture or icon, hidden from assistive technology and inert: it can't be focused
   * or clicked. Put its meaning in `title` or `description`, and links in `actions`.
   * Fitted into a square box sized by `--senui-empty-state-illustration-size-*`; an SVG drawn in
   * `currentColor` takes the theme's colour.
   */
  illustration?: ReactNode;
  /**
   * Up to two actions, primary first: your own Buttons or links, as one element or a fragment.
   * Not text: a label alone renders nothing to activate. For a conditional action, pass
   * `undefined` rather than `false`.
   */
  actions?: ReactElement | undefined;
  /**
   * The heading element. It has `tabindex="-1"`, so you can move focus to it, for example after the
   * last item was deleted and no action is rendered. EmptyState never moves focus.
   */
  headingRef?: Ref<HTMLHeadingElement>;
  /** The root is a plain `<div>` with no name. The heading is what a screen-reader user finds. */
  'aria-label'?: never;
  /** The root is a plain `<div>` with no name. The heading is what a screen-reader user finds. */
  'aria-labelledby'?: never;
  /** Never read on an unnamed, unfocusable `<div>`: put it in `description`. */
  'aria-describedby'?: never;
  /** Never read on an unnamed, unfocusable `<div>`: put it in `description`. */
  'aria-description'?: never;
  /** Prohibited on an element with no role (ARIA 1.2). */
  'aria-roledescription'?: never;
  /** The root is never a tab stop. To move focus to the empty state, focus `headingRef`. */
  tabIndex?: never;
};

/**
 * Says there is nothing here, why, and what you can do: a heading, a description, a decorative
 * illustration and your actions. A plain `<div>` with no role and no live region. It adapts to the
 * width of its container, compact below 30rem and stacked above, so it takes the full inline size
 * of its parent: give a shrink-to-fit parent a width, and put inline margin on a wrapper.
 * `className`, native attributes and the ref go on the root.
 * See `EmptyState.a11y.ts` for its accessibility contract, including what your app must announce.
 *
 * ```tsx
 * <EmptyState
 *   headingLevel={2}
 *   title="No projects yet"
 *   description="Projects you create or join appear here."
 *   actions={<Button onClick={create}>Create project</Button>}
 * />
 * ```
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { title, headingLevel, description, illustration, actions, headingRef, className, ...rest },
  forwardedRef,
) {
  const Heading = `h${String(headingLevel)}` as `h${EmptyStateHeadingLevel}`;
  // The title check is keyed to `title`, so a title that later turns empty still warns (review),
  // without reattaching the consumer's `headingRef` on every render.
  const titleCheck = useCallback(
    (node: HTMLElement | null) => {
      checkTitle(node, title);
    },
    [title],
  );
  const heading = useComposedRefs(headingRef, titleCheck);
  const hasDescription =
    description !== undefined &&
    description !== null &&
    description !== false &&
    description !== '';
  const hasIllustration =
    illustration !== undefined && illustration !== null && illustration !== false;

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then the component's.
  return (
    <div
      {...rest}
      ref={forwardedRef}
      className={className ? `senui-empty-state ${className}` : 'senui-empty-state'}
    >
      {/* The root is the container (L07 decision 9); it can't query itself, so the body lays out. */}
      <div className="senui-empty-state__body">
        {hasIllustration && (
          <div
            ref={(node) => {
              prepareIllustration(node);
            }}
            className="senui-empty-state__illustration"
            aria-hidden="true"
          >
            {illustration}
          </div>
        )}
        <div className="senui-empty-state__content">
          <Heading ref={heading} className="senui-empty-state__title" tabIndex={-1}>
            {title}
          </Heading>
          {hasDescription && <p className="senui-empty-state__description">{description}</p>}
          {actions !== undefined && (
            <div
              ref={(node) => {
                checkActions(node);
              }}
              className="senui-empty-state__actions"
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

/*
 * Development checks the type can't make (principle 1). They run from ref callbacks, not effects,
 * so server rendering is untouched. The illustration and actions refs are inline on purpose: a new
 * function each render makes React run them after every commit, so swapped content is checked
 * again (review). Nothing outside holds those refs, so the churn costs one DOM query.
 */

function checkTitle(node: HTMLElement | null, title: EmptyStateProps['title']): void {
  if (!node) return;
  // A string is checked as given; an element by the text it rendered.
  const text = typeof title === 'string' ? title : node.textContent;
  if (text.trim() === '') {
    warnOnce(
      'empty-state-title',
      'EmptyState has an empty `title`, so its heading has no text and screen-reader users hear an empty heading. Pass the text that says what is empty.',
    );
  }
}

/**
 * Warns about focusable content, then makes the wrapper inert (review): the browser keeps it out of
 * the tab order and the pointer's reach for everyone, not just out of the accessibility tree. Set
 * here because React 18 drops a boolean `inert` prop. The check runs first, since `firstFocusable`
 * skips inert subtrees.
 */
function prepareIllustration(node: HTMLDivElement | null): void {
  if (!node) return;
  node.inert = false;
  if (firstFocusable(node)) {
    warnOnce(
      'empty-state-illustration-focus',
      'EmptyState: the `illustration` contains a focusable element. The illustration is inert and hidden from assistive technology, so the element can be neither reached nor activated (WCAG 4.1.2). Put links and buttons in `actions`.',
    );
  }
  node.inert = true;
}

function checkActions(node: HTMLDivElement | null): void {
  if (node && !firstFocusable(node)) {
    warnOnce(
      'empty-state-actions-focus',
      'EmptyState: `actions` contains nothing a keyboard can reach. Pass Buttons or links; a label on its own renders text with nothing to activate.',
    );
  }
}
