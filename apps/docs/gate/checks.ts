// L08's gate, as data: every check its specs run, what it checks, and the WCAG 2.2 criteria it
// tests. The package's docs generator (packages/react/scripts/build-docs.mjs) publishes this as the
// gate's automated run, which a component's `automated` evidence can rest on (L09 decision 5).
//
// It can't drift from the specs: the generator reads every `test(…)` and `test.describe(…)` title
// in `gate/*.spec.ts`, and fails the build when a title's fixed start matches no `title` below, or
// a check below matches no title in its spec.
//
// List a criterion only where the check really tests it. The axe check's criteria aren't listed:
// the generator reads them from axe-core's own rule tags, for the rules `AXE_TAGS` selects.

/** One check of the gate. */
export interface GateCheck {
  /** The fixed start of its test titles (the text before the first `${…}`), exactly. */
  readonly title: string;
  /** The spec file that runs it, in `apps/docs/gate/`. */
  readonly spec: string;
  /** What it checks, in one sentence: published. */
  readonly checks: string;
  /** The WCAG 2.2 criteria it tests. `'axe'`: those of the axe rules it runs. */
  readonly criteria: readonly string[] | 'axe';
}

/** The axe rules the gate runs: these tags (the same as the unit layer's `AXE_TAGS`). */
export const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
  'best-practice',
] as const;

/** Page-level rules, off for stories: a story is a component, not a page. Docs pages turn them on. */
export const PAGE_RULES = ['region', 'landmark-one-main', 'page-has-heading-one'] as const;

export const GATE_CHECKS: readonly GateCheck[] = [
  {
    title: 'axe, ',
    spec: 'axe.spec.ts',
    checks:
      'axe-core on every story in light and dark colour schemes, with rendered contrast; contrast axe cannot compute fails too',
    criteria: 'axe',
  },
  {
    title: 'semantics: ',
    spec: 'semantics.spec.ts',
    checks:
      "the contract's element and role are what renders, and a required accessible name is in the accessibility tree",
    criteria: ['4.1.2'],
  },
  {
    title: 'target size',
    spec: 'adaptation.spec.ts',
    checks:
      'every target is at least 24 by 24 CSS px, or meets the spacing exception, at 1280 and 320 px wide',
    criteria: ['2.5.8'],
  },
  {
    title: 'reflow at 320 px',
    spec: 'adaptation.spec.ts',
    checks: 'at 320 px wide nothing scrolls sideways or pushes the page past the viewport',
    criteria: ['1.4.10'],
  },
  {
    title: 'text spacing',
    spec: 'adaptation.spec.ts',
    checks:
      "with WCAG's text-spacing overrides, no text is clipped, spills out of its box or overlaps",
    criteria: ['1.4.12'],
  },
  {
    title: 'right-to-left mirroring',
    spec: 'adaptation.spec.ts',
    checks:
      'a component that mirrors does so, boxes and pseudo-elements, when the page direction flips',
    criteria: [],
  },
  {
    title: 'motion (',
    spec: 'motion.spec.ts',
    checks:
      'every animation from first paint, through the play function and focus moves: under reduced motion only an essential one moves',
    criteria: ['2.3.3'],
  },
  {
    title: 'tab walk: ',
    spec: 'tab-walk.spec.ts',
    checks:
      'Tab through every story: each stop has keyboard focus, is named, is not inside aria-hidden or inert, is not covered, and has a real focus ring of at least 3:1, with a control boundary of at least 3:1',
    criteria: ['1.4.11', '2.4.7', '2.4.11', '4.1.2'],
  },
  {
    title: 'tab walk, short viewport: ',
    spec: 'tab-walk.spec.ts',
    checks:
      'at 1280 by 320 px, where sticky headers and footers take most of the height, no focus stop is covered',
    criteria: ['2.4.11'],
  },
  {
    title: 'resets: ',
    spec: 'resets.spec.ts',
    checks:
      "the focus ring survives common resets that don't target focus, and the two resets the focus-ring responsibility names remove it",
    criteria: ['2.4.7'],
  },
  {
    title: 'forced colours, ',
    spec: 'forced-colors.spec.ts',
    checks:
      'stories tagged forced-colors match their screenshots with forced colours on, in light and dark (Chromium, in the pinned container)',
    criteria: [],
  },
  {
    title: 'forced colours, focus ring: ',
    spec: 'forced-colors.spec.ts',
    checks: 'the tab walk’s ring and boundary checks again, with forced colours on (Chromium)',
    criteria: ['1.4.11', '2.4.7'],
  },
  {
    title: 'gate bookkeeping',
    spec: 'stories.spec.ts',
    checks:
      "exceptions are tagged, dated and unexpired, every story is tested, every component has a contract, the stories its contract needs and a docs page, every story the package's manifest names is in the built site, and the site contains no Storybook manifest",
    criteria: [],
  },
  // L09 decision 9: every docs page (each component's and each MDX page), checked as a page.
  {
    title: 'docs page axe, light and dark, 1280 and 320 px: ',
    spec: 'docs.spec.ts',
    checks:
      "axe-core on every docs page, at 1280 and 320 px in light and dark colour schemes, with the page-level rules on and rendered contrast; the page's story canvases are left to the stories' own checks",
    criteria: 'axe',
  },
  {
    title: 'docs page outline: ',
    spec: 'docs.spec.ts',
    checks:
      'every docs page has one main landmark holding its content and one h1, and its headings never skip a level, with the live stories in the outline',
    criteria: [],
  },
  {
    title: 'docs page reflow at 320 px: ',
    spec: 'docs.spec.ts',
    checks:
      'at 320 px wide no docs page scrolls sideways, and only a focusable, named region (a code block, a table, a wide story) scrolls inside it',
    criteria: ['1.4.10'],
  },
  {
    title: 'docs page tab walk: ',
    spec: 'docs.spec.ts',
    checks:
      'Tab through every docs page to its end: each stop has keyboard focus, is named, is not covered, and has a real focus ring of at least 3:1, and Tab never stays inside a framed story',
    criteria: ['1.4.11', '2.4.7', '2.4.11', '4.1.2'],
  },
  {
    title: 'docs page state: ',
    spec: 'docs.spec.ts',
    checks:
      'after a docs page renders, nothing has focus, no modal dialog is open, nothing outside a story is inert, and no framed story runs its play function',
    criteria: [],
  },
  {
    title: 'docs page colour scheme: ',
    spec: 'docs.spec.ts',
    checks:
      "every docs page's surface changes between light and dark, and each framed story takes the page's colour scheme",
    criteria: [],
  },
];
