import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { CheckboxProps } from './Checkbox.js';

export const a11y = defineA11yContract<CheckboxProps>()({
  component: 'Checkbox',
  semantics: {
    element: 'input',
    name: { sources: ['label-element', 'aria-label', 'aria-labelledby'], required: true },
    states: [
      { attribute: 'checked', when: 'Checked; the native state, announced by the role' },
      {
        attribute: 'indeterminate',
        when: 'The `indeterminate` prop: the native DOM property, never aria-checked',
      },
      {
        attribute: 'aria-invalid',
        when: 'Its `error` is set, a submit found it unchecked while required, or its CheckboxGroup shows an error. "false" otherwise, never absent (ADR-0013)',
      },
      { attribute: 'required', when: 'Standalone and `required`; never inside a CheckboxGroup' },
      { attribute: 'disabled', when: 'Disabled; it then leaves the tab order' },
    ],
    relationships: [
      { attribute: 'for', target: 'the input, from its visible label', owner: 'component' },
      {
        attribute: 'aria-describedby',
        target:
          "its description, then its error while there is one, merged with the consumer's ids. Inside a group, the group's error instead, on every box.",
        owner: 'component',
      },
    ],
    hiddenFromAT: ['the required marker (*)', 'the error icon', 'the check and dash glyphs'],
    notes:
      'The input is the control (`appearance: none`): the box and glyph are pseudo-elements, so focus, validation and the mixed state stay on the native element.',
  },
  keyboard: [{ keys: ['Space'], action: 'Toggles it; from indeterminate, checks it' }],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    {
      when: 'On focus',
      mechanism: 'focus',
      owner: 'component',
      announces:
        'The label, checkbox and its state, and the required state when required (NVDA, Chrome; exact wording not transcribed). Invalid only after a failed submit or with an error, never before (ADR-0013).',
    },
    {
      when: 'While indeterminate',
      mechanism: 'focus',
      owner: 'component',
      announces:
        'The mixed state (NVDA, Chrome; heard as the Danish for partially marked; exact wording not transcribed), from the native property.',
    },
    {
      when: 'When a select-all parent changes its children',
      mechanism: 'state-change',
      owner: 'consumer',
      announces:
        'Nothing from Checkbox. The parent’s own state change is announced; announce the effect on the rows if it matters.',
    },
  ],
  requiredProps: [
    {
      props: ['label', 'aria-label', 'aria-labelledby'],
      why: 'A checkbox has no text content: a visible label, or a label for a box with no visible text of its own.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    'For a mixed state, keep `indeterminate` in your state and clear it in `onCheckedChange`; Checkbox re-applies the prop on every render.',
    'Inside a CheckboxGroup, give every Checkbox a unique `value`, and put `required` on the group, never on the checkboxes.',
    'Explain the required marker (*) once, before the form.',
  ],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'system-colour',
    reducedMotion: 'no-motion',
    rtl: 'mirrors',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '2.1.1',
      claim: 'meets',
      how: 'A native checkbox: Tab reaches it, Space toggles it.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.7',
      claim: 'meets',
      how: 'Token focus ring around the box on :focus-visible.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'enables',
      how: 'Checkbox never covers its own focus; the app keeps sticky headers and overlays from covering it.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'The input is 24×24 px whatever the box size, and its label adds to the hit area.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The unchecked border uses border.strong (checked 3:1 pairs); the glyph uses fg.on-accent on bg.accent (4.5:1); the focus ring meets 3:1.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '1.4.1',
      claim: 'meets',
      how: 'Checked, unchecked and mixed differ by glyph; invalid adds a thicker border and a message.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Native checkbox role and state, including the native mixed state; name from a label or a required aria-label / aria-labelledby.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '3.3.2',
      claim: 'meets',
      how: 'A label or an ARIA name is required by the type.',
      evidence: ['automated'],
    },
    {
      criterion: '1.3.1',
      claim: 'meets',
      how: 'The label is a <label for> the input; description and error are linked by aria-describedby (in a group, the group’s description and error too).',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '3.3.1',
      claim: 'enables',
      how: 'An `error`, or the browser’s message after a failed submit of a required box, is shown as text and marks the box invalid. The app supplies the wording of its own errors.',
      evidence: ['automated', 'screen reader'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium)',
      date: '2026-10-19',
    },
    {
      method: 'keyboard',
      browser: 'Chrome 155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      result: 'pass',
      date: '2026-10-20',
    },
    {
      // Narrator's L05 run found the pre-submit invalid announcement (ADR-0013) and was not repeated.
      method: 'screen reader',
      at: 'NVDA',
      atVersion: 'not recorded',
      language: 'da',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-20',
    },
    {
      method: 'forced colours',
      detail:
        'Chrome 155.0.8059.40, ForcedColors story: box, check, dash and disabled visible in every state.',
      result: 'pass',
      date: '2026-10-20',
    },
  ],
  knownIssues: [],
});
