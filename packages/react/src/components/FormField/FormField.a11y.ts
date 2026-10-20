import { defineA11yContract } from '../../internal/a11y-contract.js';
import type { FormFieldProps } from './FormField.js';

export const a11y = defineA11yContract<FormFieldProps>()({
  component: 'FormField',
  semantics: {
    element: 'div',
    // FormField itself has no role and no name; its label names the control it renders.
    name: { sources: ['label-element'], required: false },
    states: [],
    relationships: [
      { attribute: 'for', target: 'the control, from the label', owner: 'component' },
      {
        attribute: 'aria-describedby',
        target:
          "the description, then the error message while there is one, merged with the control's own",
        owner: 'component',
      },
    ],
    hiddenFromAT: ['the required marker (*)', 'the error icon'],
    notes:
      'Sets the control\'s `aria-invalid` ("true" or "false", never absent: ADR-0013) from `error`, or from a native constraint error after a submit attempt, and its `required` from `required`. aria-errormessage is not used (L04 decision 2).',
  },
  keyboard: [],
  focus: { tabStop: 'none' },
  announcements: [
    {
      when: 'When a submit fails native validation: the first invalid field takes focus',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        '"Email, edit, Please fill out this field." (Narrator in English, Chrome; NativeValidation story with Name filled in): label, role, then the browser’s message from the error node. Required and invalid are also read (exact wording not transcribed). With both fields empty, focus lands on Name.',
    },
    {
      when: 'When `error` changes and `announce="polite"` is set',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'component',
      announces:
        'The error message (Narrator in English, Chrome; AnnounceOnChange story). The label and control role heard with it come from the focused field, not from the live region. Native constraint errors are never live: they are read when the field takes focus on submit.',
    },
    {
      when: 'When your own validation sets `error` on submit',
      mechanism: 'focus-move',
      owner: 'consumer',
      announces:
        'Nothing until focus moves: call focusFirstInvalid(form) once the errors have rendered. Then the label, the control role and the error message (Narrator in English, Chrome; SubmitWithErrors story).',
    },
  ],
  requiredProps: [
    { props: ['label'], why: 'The label is the control’s accessible name (WCAG 3.3.2).' },
  ],
  consumerResponsibilities: [
    'Pass the binding to exactly one control: `{(field) => <TextInput field={field} />}`. Ignored or reused, the label names nothing or one of two controls; a development warning says so.',
    'Explain the required marker (*) once, before the form: FormField hides it from assistive technology, which announces the control’s own required state instead.',
    'After your own validation sets `error` on submit, call focusFirstInvalid(form) once React has rendered the errors (for example inside flushSync), so the first error is read in context.',
    'Write error messages that say how to fix the input, not only that it is wrong (WCAG 3.3.3).',
    'Use `announce="polite"` only when you validate as the user types; otherwise every change interrupts them.',
  ],
  adaptation: {
    targetSize: 'not-a-target',
    activatesOn: 'not-activatable',
    forcedColors: 'system-colour',
    reducedMotion: 'no-motion',
    rtl: 'direction-neutral',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '1.3.1',
      claim: 'meets',
      how: 'The label is a <label for> the control; description and error are linked by aria-describedby.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '3.3.2',
      claim: 'meets',
      how: 'A visible label is required by the type; a description is available for format hints.',
      evidence: ['automated'],
    },
    {
      criterion: '3.3.1',
      claim: 'enables',
      how: 'An error passed as `error`, or a native constraint error after a submit attempt, is shown as text and sets aria-invalid on the control. The app supplies the wording of its own errors.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '1.4.1',
      claim: 'meets',
      how: 'An error is text with an icon, and the control gets a thicker border; colour is never the only signal.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.3',
      claim: 'enables',
      how: 'With `announce="polite"`, the error node is a live region that exists before any message arrives.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '1.4.3',
      claim: 'meets',
      how: 'Label, description and error colours have checked 4.5:1 token pairs against the page backgrounds, and axe checks rendered contrast on every story in Chromium.',
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
      // Narrator in English on a Danish system: NativeValidation, SubmitWithErrors, AnnounceOnChange.
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
        'Chrome 155.0.8059.40, ForcedColors story (Emil): the error icon and message, the required marker and the description stay readable.',
      result: 'pass',
      date: '2026-10-19',
    },
  ],
  knownIssues: [
    {
      issue:
        'A checkValidity() call on a form the user has already tried to submit shows native errors and moves focus to the first invalid field, as a submit would: both fire the same `invalid` event.',
      workaround:
        'Test validity without side effects with `form.matches(":invalid")` or `input.validity.valid`, which fire no events.',
    },
  ],
});
