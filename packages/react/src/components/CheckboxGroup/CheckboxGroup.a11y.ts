import { defineA11yContract } from '../../internal/a11y/a11y-contract.js';
import type { CheckboxGroupProps } from './CheckboxGroup.js';

export const a11y = defineA11yContract<CheckboxGroupProps>()({
  component: 'CheckboxGroup',
  semantics: {
    element: 'fieldset',
    // The native group role, named by its <legend>.
    name: { sources: ['content'], required: true },
    states: [
      {
        attribute: 'aria-invalid',
        when: 'On each checkbox while the group shows an error (its `error`, or "choose at least one" after a submit)',
      },
    ],
    relationships: [
      {
        attribute: 'aria-describedby',
        target:
          'each checkbox: the group’s description, then its error while there is one. Not the fieldset, whose description NVDA never reads (Emil’s run, 2026-10-20; changes L05 decision 13). Re-heard 2026-10-20 (NVDA): each box reads the description, e.g. "News, check box, ikke markeret, Choose what we write to you about."',
        owner: 'component',
      },
    ],
    hiddenFromAT: ['the required marker (*)', 'the error icon'],
    notes:
      'The legend names the group (L05 decision 11). With `required`, the first checkbox carries a custom validity message while none is checked, so the browser blocks the submit; no checkbox carries native `required` (L05 decision 12).',
  },
  keyboard: [],
  focus: { tabStop: 'none' },
  announcements: [
    {
      when: 'When focus enters the group',
      mechanism: 'focus',
      owner: 'component',
      announces:
        '"Topics, gruppering, News, check box, ikke markeret, ugyldig indtastning" (NVDA in Danish, Chrome; WithError story, entered from outside: the legend, "grouping", then the box, "not checked", "invalid entry"). The fieldset’s description was never read, so the error now describes each box: re-heard 2026-10-20, each box then reads the message after "ugyldig indtastning".',
    },
    {
      when: 'When a submit finds nothing checked in a required group',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        'Focus on the first checkbox, announced invalid (NVDA, Chrome). No box is announced invalid before the submit (ADR-0013). Whether the legend and message are read with it was not reported.',
    },
  ],
  requiredProps: [
    { props: ['legend'], why: 'The legend is the group’s accessible name (L05 decision 11).' },
  ],
  consumerResponsibilities: [
    'Give every Checkbox in the group a unique `value`.',
    'Write the `required` message so it says what to do: "Choose at least one topic."',
    'Explain the required marker (*) once, before the form.',
  ],
  adaptation: {
    targetSize: 'not-a-target',
    activatesOn: 'not-activatable',
    forcedColors: 'system-colour',
    reducedMotion: 'no-motion',
    rtl: 'mirrors',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '1.3.1',
      claim: 'meets',
      how: 'A native fieldset and legend group the options; the description and error are linked to every checkbox (NVDA never reads a fieldset’s description).',
      evidence: ['automated'],
    },
    {
      criterion: '3.3.1',
      claim: 'enables',
      how: 'An `error`, or the "choose at least one" message after a submit, is shown as text and marks every checkbox invalid. The app supplies the wording.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '3.3.2',
      claim: 'meets',
      how: 'A legend is required by the type.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.1',
      claim: 'meets',
      how: 'An error is text with an icon, and each box gets a thicker border.',
      evidence: ['automated', 'forced colours'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium)',
      date: '2026-10-19',
    },
    {
      // Narrator's L05 run found the pre-submit invalid announcement (ADR-0013) and was not repeated.
      method: 'screen reader',
      at: 'NVDA',
      atVersion: 'not recorded',
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
        'Chrome 155.0.8059.40, ForcedColors story (Emil): the error message and icon, and the boxes, visible.',
      result: 'pass',
      date: '2026-10-20',
    },
  ],
  knownIssues: [],
});
