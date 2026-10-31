import { NativeProps } from "../../internal/dom/native-props.js";
import { ReactElement, ReactNode, Ref } from "react";
//#region src/components/EmptyState/EmptyState.d.ts
/**
 * The heading's level. Required, with no default, because an empty state sits in your page's outline
 * and any default is wrong somewhere. No `1`: the page keeps its own `<h1>`.
 */
export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;
/** Root attributes EmptyState declares `never` below, so they leave the native props first. */
type Withheld = 'title' | 'tabIndex' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-description' | 'aria-roledescription';
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
export declare const EmptyState: import("react").ForwardRefExoticComponent<Omit<NativeProps<"div">, Withheld> & {
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
} & import("react").RefAttributes<HTMLDivElement>>;
//#endregion
export {};