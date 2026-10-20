import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y-contract.js';
import type { TextInputProps } from './TextInput.js';

export const a11y = defineA11yContract<TextInputProps>()({
  component: 'TextInput',
  semantics: {
    element: 'input',
    name: { sources: ['label-element', 'aria-label', 'aria-labelledby'], required: true },
    states: [
      {
        attribute: 'aria-invalid',
        when: 'Its FormField has an error, a submit attempt found a native constraint error (until the value is valid), or, standalone, the consumer passes it. "false" otherwise, never absent, so a native invalid value isn\'t announced before a submit attempt (ADR-0013).',
      },
      { attribute: 'required', when: 'Its FormField is `required`, or standalone when passed' },
      { attribute: 'disabled', when: 'Disabled; it then leaves the tab order' },
      { attribute: 'readonly', when: 'Read-only; still focusable and submitted' },
    ],
    relationships: [
      {
        attribute: 'aria-describedby',
        target: "its FormField's description and error message, merged with the consumer's ids",
        owner: 'component',
      },
    ],
    hiddenFromAT: [],
    notes:
      'Native role: textbox, or searchbox for type="search"; password has no ARIA role. A value longer than the field scrolls inside it.',
  },
  keyboard: [
    { keys: ['printable character'], action: 'Types into the field' },
    { keys: ['Enter'], action: 'Submits its form (the browser’s implicit submission)' },
    { keys: ['Home', 'End'], action: 'Moves the caret to the start or end' },
  ],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    {
      when: 'On focus',
      mechanism: 'focus',
      owner: 'component',
      announces:
        '"Search, edit" (Narrator in English, Chrome; Default story). Inside a FormField the description and error follow, e.g. "Email, edit, Please fill out this field."; required and invalid are read when set (exact wording not transcribed).',
    },
  ],
  requiredProps: [
    {
      props: ['field', 'aria-label', 'aria-labelledby'],
      why: 'An input has no text content to take a name from: a FormField label, or a label of its own.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    'Pass `autoComplete` for fields that collect information about the user, such as `email` or `tel` (WCAG 1.3.5).',
    'A placeholder is not a label: it disappears as soon as the user types. Put format hints in the FormField description.',
  ],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'not-activatable',
    forcedColors: 'border',
    reducedMotion: 'no-motion',
    rtl: 'direction-neutral',
    textOverflow: 'truncates',
  },
  wcag: [
    {
      criterion: '2.1.1',
      claim: 'meets',
      how: 'A native input: reached with Tab, and every editing key is the browser’s own.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.7',
      claim: 'meets',
      how: 'Token focus ring on :focus-visible.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'enables',
      how: 'TextInput never covers its own focus; the app keeps sticky headers and overlays from covering a focused field.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'Every size is at least 24 px tall, and the field is wider than that.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The outline uses border.strong and the invalid outline border.danger, both with checked 3:1 pairs; the focus ring meets 3:1.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '1.4.3',
      claim: 'meets',
      how: 'Text and placeholder colours have checked 4.5:1 token pairs, and axe checks rendered contrast on every story in Chromium. Disabled text is exempt.',
      evidence: ['automated'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Native role; name from a FormField label or a required aria-label / aria-labelledby; aria-invalid and required exposed.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '1.3.5',
      claim: 'enables',
      how: '`autoComplete` passes through to the input.',
      evidence: ['automated'],
    },
    {
      criterion: '3.3.8',
      claim: 'enables',
      how: 'Paste and password managers are never blocked; autocomplete passes through.',
      evidence: ['automated'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium); browser tests also in Firefox and WebKit (Playwright)',
      date: '2026-10-19',
    },
    {
      method: 'keyboard',
      browser: 'Chrome 155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      result: 'pass',
      date: '2026-10-19',
    },
    {
      // Narrator in English on a Danish system.
      method: 'screen reader',
      at: 'Narrator (English)',
      atVersion: 'Windows 11 26H2 (build 26300.9711)',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-19',
    },
    {
      method: 'forced colours',
      detail:
        'Chrome 155.0.8059.40, ForcedColors story (Emil): every size and the invalid (thicker border) and disabled (GrayText) states distinguishable. Read-only was not at first (fill alone, found in review); with a dashed border in forced colours, re-checked by Emil on 2026-10-19 and distinguishable.',
      result: 'pass',
      date: '2026-10-19',
    },
  ],
  knownIssues: [],
});
