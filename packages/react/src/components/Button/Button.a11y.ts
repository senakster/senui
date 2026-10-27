import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { ButtonProps } from './Button.js';

// The first Narrator run (2026-10-17) heard "button, disabled" with no name while loading: the
// label was `visibility: hidden`, which also removes it from the accessibility tree. Fixed with
// `opacity: 0`, locked by a browser test, and re-tested the same day.
export const a11y = defineA11yContract<ButtonProps>()({
  component: 'Button',
  semantics: {
    element: 'button',
    name: { sources: ['content', 'aria-label', 'aria-labelledby'], required: true },
    states: [
      {
        attribute: 'aria-disabled',
        when: 'Loading, so it stays focusable while ignoring activation',
      },
      {
        attribute: 'aria-disabled',
        when: 'Set by the consumer: focusable but unavailable; click activation ignored, disabled look',
      },
      { attribute: 'disabled', when: 'Disabled and not loading; it then leaves the tab order' },
      {
        attribute: 'aria-pressed',
        when: 'Set by the consumer to make a toggle button; styled as pressed when true',
      },
    ],
    relationships: [],
    hiddenFromAT: ['the loading spinner', 'the icon of an icon-only button'],
  },
  keyboard: [
    { keys: ['Enter'], action: 'Activates the button' },
    { keys: ['Space'], action: 'Activates the button when released' },
  ],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    {
      when: 'On focus',
      mechanism: 'focus',
      owner: 'component',
      announces: '"Save, button" (Narrator, Chrome)',
    },
    {
      when: 'While loading',
      mechanism: 'focus',
      owner: 'component',
      announces:
        '"Save, button, disabled" (Narrator, Chrome). The name does not change and the spinner is silent.',
    },
    {
      when: 'When a loading action finishes or fails',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'consumer',
      announces: 'Nothing from Button. Announce the outcome, for example as a status message.',
    },
    {
      when: 'When a toggle button (aria-pressed) changes',
      mechanism: 'state-change',
      owner: 'component',
      announces:
        '"Bold, toggle button, slået fra" (Narrator in Danish, Chrome; "slået fra" is "not pressed").',
    },
  ],
  requiredProps: [
    {
      props: ['aria-label', 'aria-labelledby'],
      when: 'icon',
      why: 'An icon-only button has no visible text to take its name from.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    RESPONSIBILITIES.labelInName,
    'Announce the outcome of an action that sets `loading`: Button stays silent so it never announces twice.',
    'While loading or `aria-disabled`, Button ignores click activation (`onClick`, `onClickCapture`); pointer handlers and native listeners on its ref still fire, so keep actions in click handlers.',
  ],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'border',
    reducedMotion: 'motion-factor',
    // ADR-0017: the loading spinner keeps turning, four times slower, so it never reads as a hang.
    essentialMotion: 'progress-rotation',
    rtl: 'direction-neutral',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '2.1.1',
      claim: 'meets',
      how: 'Native button: Enter and Space activate it.',
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
      how: 'Button never covers its own focus; the app keeps sticky headers and overlays from covering a focused button (for example with scroll-padding).',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.3',
      claim: 'meets',
      how: 'Label colours have checked 4.5:1 token pairs against every fill state, and axe checks rendered contrast on every story in Chromium. Disabled text is exempt.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'Every size is at least 24×24 px.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The focus ring, the secondary border (border.strong) and the pressed border (text colour) all meet 3:1. Primary, danger and ghost are identified by their text label (Understanding 1.4.11).',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Native button role; name from content or a required label; aria-disabled while loading.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '2.5.3',
      claim: 'enables',
      how: 'Content is the name by default; an added aria-label must start with the visible text.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.2',
      claim: 'meets',
      how: 'Activates on click, the up event.',
      evidence: ['automated'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium)',
      date: '2026-10-17',
    },
    {
      method: 'keyboard',
      browser: 'Chrome 155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      result: 'pass',
      date: '2026-10-17',
    },
    {
      method: 'screen reader',
      at: 'Narrator',
      atVersion: 'Windows 11 26H2 (build 26300.9711)',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-17',
    },
    {
      // After the review fixes: the toggle button (aria-pressed) and the aria-hidden icon wrapper.
      method: 'screen reader',
      at: 'Narrator (Danish)',
      atVersion: 'Windows 11 26H2 (build 26300.9711)',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-18',
    },
    {
      method: 'forced colours',
      detail:
        'Chrome 155.0.8059.40 DevTools emulation (forced-colors: active, dark scheme), Matrix and ForcedColors stories: borders, disabled, the spinner gap and pressed all distinguishable. The first check found pressed unreadable (backplate); fixed and re-checked the same day.',
      result: 'pass',
      date: '2026-10-18',
    },
  ],
  knownIssues: [],
});
