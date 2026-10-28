import type { ForwardRefExoticComponent } from 'react';
import type * as Entry from '../../index.js';
import type { NonEmpty } from '../a11y/a11y-contract.js';

/**
 * The usage guidance every component ships as `<Name>.docs.ts` (L09 decision 3):
 *
 * ```ts
 * import type { ButtonProps } from './Button.js';
 * import type * as stories from './Button.stories.js';
 *
 * export const docs = defineComponentDocs<ButtonProps, typeof stories>()({ component: 'Button', … });
 * ```
 *
 * One object feeds the docs page, `components.json` and `llms.txt`. Import the props and the stories
 * module with `import type` only: the generator loads this file, and a value import would pull
 * React and CSS in with it.
 *
 * Write it for someone choosing between components: what it is for, when not to use it and what
 * to use instead, and how it combines with others. Accessibility claims belong in the contract
 * (`<Name>.a11y.ts`), never here; the check rejects them.
 */
export interface ComponentDocs<P, S, Self extends ComponentName> {
  /** The component's public name; must equal its directory name. */
  readonly component: Self;
  /** One sentence: what the component is for. At most 160 characters, no Markdown. */
  readonly summary: string;
  /** A short paragraph after the summary. Inline code (backticks) is the only Markdown allowed. */
  readonly description: string;
  /** Situations it's the right choice for. */
  readonly useWhen: NonEmpty<string>;
  /** Situations it's the wrong choice for, each with what to use instead. */
  readonly dontUseWhen: NonEmpty<{
    readonly when: string;
    readonly alternative: Alternative<Self>;
  }>;
  /** Other components a reader of this one should know about. */
  readonly related: readonly Exclude<ComponentName, Self>[];
  /** Stories that show it in use, by export name. Not a story that needs its play function. */
  readonly examples: NonEmpty<StoryName<S>>;
  /** How it behaves inside another component, when that changes which props apply. */
  readonly composition: readonly Composition<P, Self>[];
}

/** What to use instead: another component, a native element, an ARIA pattern, or nothing. */
export type Alternative<Self extends ComponentName> =
  | { readonly component: Exclude<ComponentName, Self>; readonly note?: string }
  | { readonly element: keyof HTMLElementTagNameMap; readonly note: string }
  | {
      readonly pattern: `https://www.w3.org/WAI/ARIA/apg/patterns/${string}`;
      readonly note: string;
    }
  | { readonly none: string };

export interface Composition<P, Self extends ComponentName> {
  /** The component this one is placed inside. */
  readonly parent: Exclude<ComponentName, Self>;
  /** Props that have no effect there. */
  readonly ignored?: readonly PropName<P>[];
  /** Props that become required there. */
  readonly required?: readonly PropName<P>[];
  readonly note: string;
}

type EntryExports = typeof Entry;

/** The entry's component exports: every value export that is a `forwardRef` component. */
export type ComponentName = {
  [K in keyof EntryExports]: EntryExports[K] extends ForwardRefExoticComponent<never> ? K : never;
}[keyof EntryExports];

type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type PropName<P> = Extract<KeysOfUnion<P>, string>;
/** A story export of the stories module: every export except the default `meta`. */
type StoryName<S> = Exclude<Extract<keyof S, string>, 'default'>;

/** Binds the guidance to the component's props and stories. */
export function defineComponentDocs<P, S>(): <const Self extends ComponentName>(
  docs: ComponentDocs<P, S, Self>,
) => ComponentDocs<P, S, Self> {
  return (docs) => docs;
}
