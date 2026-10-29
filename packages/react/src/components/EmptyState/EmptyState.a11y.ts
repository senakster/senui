import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { EmptyStateProps } from './EmptyState.js';

export const a11y = defineA11yContract<EmptyStateProps>()({
  component: 'EmptyState',
  semantics: {
    element: 'div',
    name: 'none',
    states: [],
    relationships: [],
    hiddenFromAT: ['the illustration (always inside aria-hidden="true" and inert)'],
    notes:
      'A plain <div> with no role, so no landmark: an empty state in every table and card would flood the landmark list. The heading (h2 to h6, from headingLevel) is what a screen-reader user finds by heading navigation, and the only focusable part, by script only (tabindex="-1"). No live region and no focus moves of its own. The root takes no `role`, `tabIndex`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description` or `aria-roledescription`; `aria-live` and event handlers pass through.',
  },
  keyboard: [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'EmptyState adds no tab stop: Tab reaches the controls in `actions` in order. The heading is reached only when your script focuses it',
    },
  ],
  focus: {
    tabStop: 'programmatic',
    indicator: 'focus-ring',
  },
  announcements: [
    {
      when: 'When a screen reader reads or navigates to it',
      mechanism: 'reading',
      owner: 'component',
      announces:
        'Heard (NVDA Speech Viewer, NVDA in Danish, Chrome, 2026-10-26, NoData story). Reading line by line: "overskrift niveau 2 No projects yet", "Projects you create or are invited to appear here.", "knap Create project" ("overskrift" means heading, "knap" means button); nothing from the illustration. By heading navigation (H): "No projects yet overskrift niveau 2". Tabbing reaches only the actions, so it announces "Create project knap" alone, by design.',
      language: 'da',
    },
    {
      when: 'When your script focuses the heading (headingRef)',
      mechanism: 'focus-move',
      owner: 'consumer',
      announces:
        'Heard (NVDA Speech Viewer, in Danish, Chrome, 2026-10-26, FocusVisible story): "No projects yet overskrift niveau 2".',
      language: 'da',
    },
    {
      when: 'When the last item is deleted and your app moves focus to the first action',
      mechanism: 'focus-move',
      owner: 'consumer',
      announces:
        'Heard (NVDA Speech Viewer, in Danish, Chrome, 2026-10-27, DeletedLastItem story, which sets the status after the focus move): "Create report knap", then "Quarterly report deleted" once. Before that change (2026-10-26) the status was read twice, before and after the focus move.',
      language: 'da',
    },
    {
      when: 'When the view becomes empty after a user action (a filter that matches nothing, the last item deleted)',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'consumer',
      announces:
        'Nothing from EmptyState. Update your own `role="status"` region, already in the page before the change, with the result, updated once the user has stopped typing for about a second. Heard with an earlier 300 ms debounce (NVDA Speech Viewer, in Danish, Chrome, 2026-10-26), typing x, y, z: "No results for “x”", "No results for “xy”", "No results for “xyz”", with focus staying in the field. With key echo, a screen-reader user types slower than 300 ms, so every intermediate result was read. At the NoResults story’s 1,000 ms, typing x, y, z by hand: "x", "y", "z", then one "No results for “xyz”" after the pause.',
      language: 'da',
    },
  ],
  requiredProps: [
    {
      props: ['title'],
      why: 'The heading says what is empty. `null` and `false` are type errors, and an empty string warns in development (WCAG 2.4.6).',
    },
    {
      props: ['headingLevel'],
      why: 'Only you know where the empty state sits in the page outline, so there is no default; 1 is a type error (WCAG 1.3.1).',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    'Pick `headingLevel` one below the heading the empty state sits under, so heading navigation never skips a level.',
    'Announce the change yourself: a `role="status"` region that exists before the view empties, outside EmptyState, updated with the result (debounced for type-to-filter). A live region rendered together with its content is not reliably announced (WCAG 4.1.3).',
    'If the control that emptied the view is removed (the last item deleted), move focus to the first action, or to the heading through `headingRef`, or focus falls to the start of the page (WCAG 2.4.3). When the user is filtering, leave focus in the input. If you also update a status message, do it after the focus move, or a screen reader may read it twice.',
    'Keep the illustration decorative. It is hidden from assistive technology and inert, so a link or button in it can be neither reached nor activated: put its meaning in `title` or `description`, and links or buttons in `actions`.',
    'Put every action in `actions`, as Buttons or links. Event handlers pass through to the root (for delegation, such as analytics), but never make the root the only way to trigger an action: it can’t be reached from the keyboard (WCAG 2.1.1).',
    'EmptyState fills its parent’s inline size. In a shrink-to-fit parent (an auto-layout table cell, a non-stretched flex item, `fit-content`), give the parent a width, or the text can’t wrap. Put inline margin on a wrapper, not on EmptyState, or it overflows by the margin (WCAG 1.4.10).',
    'To make an empty state a landmark, wrap it in your own `<section aria-label="…">`. Setting `aria-live` on EmptyState is your call; it announces only changes made while it stays mounted.',
  ],
  adaptation: {
    targetSize: 'not-a-target',
    activatesOn: 'not-activatable',
    // Nothing to lose in forced colours: no border or fill marks a state, and the heading's focus
    // ring is an outline, which forced colours keep (review).
    forcedColors: 'no-states',
    reducedMotion: 'no-motion',
    rtl: 'mirrors',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '1.3.1',
      claim: 'enables',
      how: 'The title is a real heading at the level you choose, and the description a paragraph. The outline is right when headingLevel fits the page.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '2.4.6',
      claim: 'enables',
      how: 'The heading says what is empty; it can’t be null or false, and an empty one warns in development.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '2.4.3',
      claim: 'enables',
      how: 'EmptyState never moves focus. The heading is focusable by script (headingRef) for when the control that emptied the view is gone.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '4.1.3',
      claim: 'enables',
      how: 'No live region of its own, so it never double-announces; your pre-existing status region carries the message.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '2.1.1',
      claim: 'enables',
      how: 'Nothing in it needs a pointer, and the root is never a tab stop; the actions are your own native controls, in the tab order. Handlers you put on the root are yours to make keyboard-operable.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.7',
      claim: 'meets',
      how: 'When your script focuses the heading after keyboard use, it shows the token focus ring under :focus-visible.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'enables',
      how: 'EmptyState doesn’t cover anything; a sticky header of yours could, which is your layout.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'enables',
      how: 'It has no pointer target of its own; senui Buttons in `actions` are at least 24 × 24 px.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The heading’s focus ring has 3:1 pairs against the background tokens; the illustration is decorative and exempt.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Native heading and paragraph roles. The illustration is hidden and inert, so nothing in it is reached unannounced; a development warning fires when it contains a focusable element.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '1.4.10',
      claim: 'enables',
      how: 'Compact layout below 30rem of container width; text wraps, long words break. Needs a parent width in shrink-to-fit layouts, and inline margin on a wrapper.',
      evidence: ['automated'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium)',
      date: '2026-10-26',
    },
    {
      method: 'keyboard',
      browser: 'Chrome 155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      result: 'pass',
      date: '2026-10-26',
      sourceHash: 'fb8e655e4c5cf799',
    },
    {
      method: 'screen reader',
      at: 'NVDA',
      atVersion: '2026.3 (2026.3.0.58174)',
      language: 'da',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-26',
      sourceHash: 'fb8e655e4c5cf799',
    },
    {
      method: 'forced colours',
      detail:
        'Chrome, DevTools Rendering forced-colors: active, EmptyState ForcedColors story: text and illustration visible in the compact and stacked layouts.',
      result: 'pass',
      date: '2026-10-26',
      sourceHash: 'fb8e655e4c5cf799',
    },
  ],
  knownIssues: [],
});
