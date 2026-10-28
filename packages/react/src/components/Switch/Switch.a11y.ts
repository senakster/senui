import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { SwitchProps } from './Switch.js';

export const a11y = defineA11yContract<SwitchProps>()({
  component: 'Switch',
  semantics: {
    element: 'input',
    role: 'switch',
    pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/switch/',
    name: { sources: ['label-element', 'aria-label', 'aria-labelledby'], required: true },
    states: [
      {
        attribute: 'checked',
        when: 'On; the native state, announced by the switch role as on/off',
      },
      { attribute: 'disabled', when: 'Disabled; it then leaves the tab order' },
      {
        attribute: 'aria-invalid',
        when: 'Always "false": a switch is never invalid, and the explicit value stops a native custom validity being announced (ADR-0013)',
      },
    ],
    relationships: [
      { attribute: 'for', target: 'the input, from its visible label', owner: 'component' },
      {
        attribute: 'aria-describedby',
        target: "its description, merged with the consumer's ids",
        owner: 'component',
      },
    ],
    hiddenFromAT: ['the thumb'],
    notes:
      'A native checkbox with role="switch", not a button. No Safari `switch` attribute, no indeterminate, required or error, and no visible On/Off text.',
  },
  keyboard: [{ keys: ['Space'], action: 'Turns it on or off' }],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    {
      when: 'On focus',
      mechanism: 'focus',
      owner: 'component',
      announces:
        '"Wi-Fi, switch, til" (NVDA in Danish, Chrome; "til" means on, "fra" means off). Where a reader doesn’t map the role, a checked checkbox would still give the state.',
      language: 'da',
    },
    {
      when: 'When toggled',
      mechanism: 'state-change',
      owner: 'component',
      announces:
        '"fra", then "til" (off, on; NVDA in Danish, Chrome): the state only, the name isn’t repeated and never changes.',
      language: 'da',
    },
    {
      when: 'When the setting it controls fails to apply',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'consumer',
      announces: 'Nothing from Switch. Announce the failure, and set the switch back.',
    },
  ],
  requiredProps: [
    {
      props: ['label', 'aria-label', 'aria-labelledby'],
      why: 'A switch has no text content: a visible label, or an ARIA name.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    'Use a Switch only for a setting that takes effect at once. If it applies when the user saves a form, use a Checkbox.',
    'If you add visible "On"/"Off" text, hide it from assistive technology and keep it outside the label: the role already announces the state.',
    'If the change is applied asynchronously and fails, set the switch back and announce why.',
  ],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'system-colour',
    reducedMotion: 'motion-factor',
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
      how: 'Token focus ring around the track on :focus-visible.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'enables',
      how: 'Switch never covers its own focus; the app keeps sticky headers and overlays from covering it.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'The track is 24 px tall and wider than that.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The off track border and thumb use border.strong (checked 3:1 pairs); the on thumb uses fg.on-accent on bg.accent; the focus ring meets 3:1.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '1.4.1',
      claim: 'meets',
      how: 'The thumb’s position shows the state, as well as the fill.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Switch role on a native checkbox; checked state; name from a label or a required aria-label / aria-labelledby.',
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
        'Chrome 155.0.8059.40, ForcedColors story: track and thumb visible, on and off, enabled and disabled.',
      result: 'pass',
      date: '2026-10-20',
    },
  ],
  knownIssues: [],
});
