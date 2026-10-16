import type { WcagCriterion } from './wcag.js';

export type { WcagCriterion } from './wcag.js';

/**
 * The accessibility contract every component ships as `<Name>.a11y.ts` (L02 decision 7):
 *
 * ```ts
 * export const a11y = defineA11yContract<ButtonProps>()({ component: 'Button', … });
 * ```
 *
 * One source feeds the Storybook a11y block and, from L09, `components.json` and `llms.txt`, so
 * every claim in it is published as fact. The type rejects malformed claims; the runtime check in
 * `a11y-contracts.test.ts` rejects the rest (component name, dates, evidence, baseline criteria).
 *
 * Write it for someone who will build an app with the component and has never seen its source:
 * what it is, how to drive it without a mouse, what it announces, and what the app still has to do.
 */
export type A11yContract<P = Record<string, unknown>> = {
  /** The component's public name, e.g. `'Button'`. Must equal its directory name. */
  readonly component: string;
  /** What the component is to assistive technology. */
  readonly semantics: Semantics;
  /** What reaches a screen reader, by what mechanism, and who owns it. */
  readonly announcements: NonEmpty<Announcement>;
  /** Props required for accessibility. Each is enforced by the type and locked by a type test. */
  readonly requiredProps: readonly RequiredProp<P>[];
  /** What the consuming app must still do. See `RESPONSIBILITIES` for the ones the check requires. */
  readonly consumerResponsibilities: readonly string[];
  /** How the component adapts to the user's settings and input (ADR-0008). */
  readonly adaptation: Adaptation;
  /** The WCAG 2.2 criteria this component meets or enables. */
  readonly wcag: NonEmpty<WcagClaim>;
  /** How the contract was verified. Needs at least an automated and a screen-reader run. */
  readonly testedWith: NonEmpty<TestRun>;
  /** Known gaps, each with a workaround or a tracking reference. Empty when there are none. */
  readonly knownIssues: readonly { readonly issue: string; readonly workaround: string }[];
} & Interaction;

/** Binds a contract to the component's props: `defineA11yContract<ButtonProps>()({ … })`. */
export function defineA11yContract<P>(): (contract: A11yContract<P>) => A11yContract<P> {
  return (contract) => contract;
}

/**
 * Responsibilities the runtime check requires, word for word, so the published docs say the same
 * thing for every component.
 */
export const RESPONSIBILITIES = {
  /** Required for every focusable component (L02 review: consumer resets beat layered CSS). */
  keepFocusRing:
    "Don't remove the outline on this component's focus state. A global reset such as `:focus { outline: none }` or `all: unset` removes its only focus indicator (WCAG 2.4.7).",
  /** Required for every focusable component named by its content. */
  labelInName:
    'If you add `aria-label` to a component that shows text, start the label with that text, so voice-control users can say what they see (WCAG 2.5.3).',
} as const;

// ---------------------------------------------------------------------------------------------

/** At least one entry. */
export type NonEmpty<T> = readonly [T, ...T[]];

type KeysOfUnion<T> = T extends unknown ? keyof T : never;

export interface Semantics {
  /** The one element rendered (ADR-0006). */
  readonly element: keyof HTMLElementTagNameMap;
  /** An explicit role, only where the element's native role is not enough (principle 2). */
  readonly role?: AriaRole;
  /** The ARIA Authoring Practices pattern followed, when one applies. */
  readonly pattern?: `https://www.w3.org/WAI/ARIA/apg/patterns/${string}`;
  /** Where the accessible name comes from. `required: false` only for components with no name. */
  readonly name: {
    readonly sources: NonEmpty<'content' | 'aria-label' | 'aria-labelledby' | 'label-element'>;
    readonly required: boolean;
  };
  /** States the component exposes, and when each is set. */
  readonly states: readonly {
    readonly attribute:
      | `aria-${string}`
      | 'disabled'
      | 'checked'
      | 'indeterminate'
      | 'required'
      | 'readonly'
      | 'open';
    readonly when: string;
  }[];
  /** Id references, and whether the component or the consumer wires them. */
  readonly relationships: readonly {
    readonly attribute: `aria-${string}` | 'for' | 'popovertarget' | 'commandfor';
    readonly target: string;
    readonly owner: 'component' | 'consumer';
  }[];
  /** Parts rendered but hidden from assistive technology, e.g. `'the loading spinner'`. */
  readonly hiddenFromAT: readonly string[];
  readonly notes?: string;
}

/** `keyboard` may be empty only for a component that is never focused. */
type Interaction =
  | { readonly focus: { readonly tabStop: 'none' }; readonly keyboard: readonly KeyBinding[] }
  | { readonly focus: FocusableFocus; readonly keyboard: NonEmpty<KeyBinding> };

export interface FocusableFocus {
  /** How the component is reached: the native tab order, a roving tabindex, `aria-activedescendant`, or only by script. */
  readonly tabStop: 'native' | 'roving' | 'activedescendant' | 'programmatic';
  /** Always the token focus ring (ADR-0005), unless an ADR grants an exception. */
  readonly indicator:
    'focus-ring' | { readonly exception: `ADR-${number}`; readonly description: string };
  /** Focus moves the component makes itself. */
  readonly management?: {
    readonly onOpen?: 'first-focusable' | 'container' | 'named-element';
    readonly trap?: boolean;
    readonly restore?: 'trigger' | 'trigger-or-fallback';
  };
}

export interface KeyBinding {
  readonly keys: NonEmpty<Key>;
  readonly action: string;
}

type NamedKey =
  | 'Enter'
  | 'Space'
  | 'Escape'
  | 'Tab'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Backspace'
  | 'Delete';

/**
 * A key, in the names Playwright's `keyboard.press` accepts, so L08's keyboard spec can press every
 * key a contract lists. `'printable character'` covers type-ahead and is tested separately.
 */
export type Key =
  NamedKey | `${'Shift' | 'Control' | 'Alt' | 'Meta'}+${NamedKey}` | 'printable character';

export type Announcement = {
  /** The trigger, e.g. `'On focus'`, `'When loading finishes'`. */
  readonly when: string;
  /** Whether the component produces it, or the consumer must. */
  readonly owner: 'component' | 'consumer';
  /** An example of what was heard, with the assistive technology named in `testedWith`. */
  readonly announces: string;
} & (
  | { readonly mechanism: 'live-region'; readonly politeness: 'polite' | 'assertive' }
  | { readonly mechanism: 'focus' | 'focus-move' | 'state-change' | 'name-change' | 'reading' }
);

export interface RequiredProp<P> {
  /** The props, one of which is required (several means alternatives, e.g. `aria-label` or `aria-labelledby`). */
  readonly props: NonEmpty<Extract<KeysOfUnion<P>, string>>;
  /** The condition, when it isn't always, e.g. `'iconOnly'`. */
  readonly when?: string;
  readonly why: string;
}

/** ADR-0008: how the component adapts. Every field is closed so docs and checks can rely on it. */
export interface Adaptation {
  /** WCAG 2.5.8: at least 24×24 CSS px, or meets the spacing exception. */
  readonly targetSize: 'min-24' | 'spacing-exception' | 'not-a-target';
  /** WCAG 2.5.2: activation happens on the up event (`click` qualifies). */
  readonly activatesOn: 'click' | 'pointerup' | 'not-activatable';
  /** How states stay visible in forced-colours mode, where backgrounds are replaced. */
  readonly forcedColors: 'border' | 'system-colour' | 'no-states';
  /** ADR-0005: movement is scaled by `--senui-motion-reduce`, or there is none. */
  readonly reducedMotion: 'motion-factor' | 'no-motion';
  /** Whether layout and arrow keys mirror in right-to-left text. */
  readonly rtl: 'mirrors' | 'direction-neutral';
  /** WCAG 1.4.10 / 1.4.12: whether text wraps or is truncated when space runs out. */
  readonly textOverflow: 'wraps' | 'truncates';
}

export interface WcagClaim {
  readonly criterion: WcagCriterion;
  /** `meets`: the component satisfies it alone. `enables`: the app can satisfy it by using the component as documented. */
  readonly claim: 'meets' | 'enables';
  readonly how: string;
  /** The test methods behind the claim. Each must appear in `testedWith`. */
  readonly evidence: NonEmpty<TestMethod>;
}

/** `YYYY-MM-DD`. The runtime check rejects malformed and future dates. */
export type IsoDate = `${number}-${number}-${number}`;

type Result = 'pass' | 'pass-with-known-issues';

/**
 * One verification run. Product names of assistive technology, browsers and operating systems are
 * compatibility facts and are written out in contract data (scope decision, L02).
 */
export type TestRun =
  | { readonly method: 'automated'; readonly tool: string; readonly date: IsoDate }
  | {
      readonly method: 'screen reader';
      readonly at: string;
      readonly atVersion: string;
      readonly browser: string;
      readonly browserVersion: string;
      readonly os: string;
      readonly packageVersion: string;
      readonly result: Result;
      readonly date: IsoDate;
    }
  | {
      readonly method: 'keyboard';
      readonly browser: string;
      readonly os: string;
      readonly result: Result;
      readonly date: IsoDate;
    }
  | {
      readonly method:
        | 'forced colours'
        | 'resize-200'
        | 'reflow-320'
        | 'text-spacing'
        | 'reduced-motion'
        | 'pointer-touch'
        | 'voice control';
      readonly detail: string;
      readonly result: Result;
      readonly date: IsoDate;
    };

export type TestMethod = TestRun['method'];

/** WAI-ARIA 1.2 concrete roles. React's own `AriaRole` also accepts any string, so it can't be used. */
export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'blockquote'
  | 'button'
  | 'caption'
  | 'cell'
  | 'checkbox'
  | 'code'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'deletion'
  | 'dialog'
  | 'document'
  | 'emphasis'
  | 'feed'
  | 'figure'
  | 'form'
  | 'generic'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'insertion'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'meter'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'paragraph'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'strong'
  | 'subscript'
  | 'superscript'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'time'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';
