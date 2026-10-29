import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { AlertDialogProps } from './AlertDialog.js';

export const a11y = defineA11yContract<AlertDialogProps>()({
  component: 'AlertDialog',
  semantics: {
    element: 'dialog',
    role: 'alertdialog',
    pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/',
    name: { sources: ['aria-labelledby', 'aria-label'], required: true },
    states: [
      {
        attribute: 'open',
        when: 'While open, set by showModal(), which makes the dialog modal. Never rendered by React',
      },
    ],
    relationships: [
      { attribute: 'aria-labelledby', target: 'the visible title heading', owner: 'component' },
      {
        attribute: 'aria-describedby',
        target: "the required description, merged with the consumer's ids",
        owner: 'component',
      },
    ],
    hiddenFromAT: ['the rest of the page, made inert by showModal() (no aria-hidden is set)'],
    notes:
      'Dialog’s behaviour with role="alertdialog": a required description and Cancel, focus on Cancel, no backdrop dismiss and no close button. Esc cancels.',
  },
  keyboard: [
    {
      keys: ['Escape'],
      action:
        'Cancels: asks to close (onOpenChange reason "escape"), like Cancel. A second Esc with no user action in between closes it without asking (reason "forced")',
    },
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Moves between Cancel, the action and any controls in the content; the page behind is inert. Past the last control, focus may reach the browser’s own UI, by design',
    },
    { keys: ['Enter', 'Space'], action: 'Activates the focused button (Cancel on open)' },
  ],
  focus: {
    tabStop: 'programmatic',
    indicator: 'focus-ring',
    management: { onOpen: 'named-element', trap: true, restore: 'trigger-or-fallback' },
  },
  announcements: [
    {
      when: 'On open',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        'Heard (NVDA Speech Viewer, NVDA 2026.2 in Danish, Chrome, 2026-10-21): "Delete project? dialog Its files and history are deleted for everyone. This can’t be undone.", then "Cancel knap" ("knap" means button). NVDA says "dialog" for the alertdialog role here; Chromium exposes the role as alertdialog, with the name and description (probed through CDP).',
      language: 'da',
    },
    {
      when: 'On close',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        'Heard (NVDA Speech Viewer, in Danish, Chrome, 2026-10-21): "Delete project knap", the trigger, after Cancel. Not yet heard for finalFocus.',
      language: 'da',
    },
    {
      when: 'When the action completes',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'consumer',
      announces:
        'Nothing from AlertDialog. Announce the result (for example, Project deleted) with your own status message (WCAG 4.1.3).',
    },
  ],
  requiredProps: [
    {
      props: ['title', 'aria-label', 'aria-labelledby'],
      why: 'Without a name, a screen reader says just "alert dialog".',
    },
    {
      props: ['description'],
      why: 'The consequence the user is confirming; read on open.',
    },
    {
      props: ['cancelLabel'],
      why: 'Cancel is the way out and takes focus; its text is translated by you.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    RESPONSIBILITIES.labelInName,
    'Make `action` a Button whose text names the outcome ("Delete project", not "OK"), and close the dialog from its handler by setting `open` to false.',
    'If the element that opens the dialog can be removed by the action (a deleted row), pass `finalFocus`, or focus falls to the start of the page.',
    'While it is open, the page can’t scroll (ADR-0014). Set `html { scrollbar-gutter: stable }` so the page doesn’t shift on open.',
  ],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'border',
    reducedMotion: 'motion-factor',
    rtl: 'mirrors',
    textOverflow: 'wraps',
  },
  wcag: [
    {
      criterion: '2.1.1',
      claim: 'meets',
      how: 'Esc cancels; Tab reaches Cancel and the action.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.1.2',
      claim: 'meets',
      how: 'Esc and Cancel always close it.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.3',
      claim: 'meets',
      how: 'Focus starts on Cancel, the least destructive choice, and returns to the opener on close.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.7',
      claim: 'meets',
      how: 'Cancel and the action show the token focus ring.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'meets',
      how: 'The footer is sticky only on tall viewports, and scroll-padding keeps focus clear of it.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'Cancel is a medium Button, at least 24 × 24 px.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'Focus rings meet 3:1 against bg.raised; in forced colours the dialog keeps a border.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'role="alertdialog" on a native modal dialog; name from the title or a required aria-label / aria-labelledby; description required.',
      evidence: ['automated', 'screen reader'],
    },
  ],
  testedWith: [
    {
      method: 'automated',
      tool: 'axe-core 4.14.0, Vitest (jsdom and Chromium)',
      date: '2026-10-20',
    },
    {
      method: 'keyboard',
      browser: 'Chrome 155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      result: 'pass',
      date: '2026-10-21',
      sourceHash: '7b37bdd4c5ca5b23',
    },
    {
      method: 'screen reader',
      at: 'NVDA',
      atVersion: '2026.2 (2026.2.0.57764)',
      language: 'da',
      browser: 'Chrome',
      browserVersion: '155.0.8059.40',
      os: 'Windows 11 Pro 26H2 (build 26300.9711)',
      packageVersion: '0.0.0',
      result: 'pass',
      date: '2026-10-21',
      sourceHash: '7b37bdd4c5ca5b23',
    },
    {
      method: 'forced colours',
      detail:
        'Chrome, DevTools Rendering forced-colors: active, AlertDialog ForcedColors story: the dialog border and the keyboard focus ring visible.',
      result: 'pass',
      date: '2026-10-21',
      sourceHash: '7b37bdd4c5ca5b23',
    },
  ],
  knownIssues: [
    {
      issue:
        'In Safari, a mouse click doesn’t focus a button. The dialog falls back to the control pressed just before it opened, so focus still returns there, unless the dialog was mounted only after the click (rendered conditionally) or opened more than a second later (after a request, say). Then focus goes to the start of the page, as with a native dialog.',
      workaround:
        'Keep the dialog mounted and drive `open`, or pass `finalFocus` returning the trigger.',
    },
    {
      issue:
        'Tab past the last control can reach the browser’s address bar and tabs. This is how native modal dialogs work, and not a keyboard trap.',
      workaround: 'None needed: Shift+Tab or a click returns to the dialog.',
    },
  ],
});
