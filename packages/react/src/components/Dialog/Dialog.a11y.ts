import { defineA11yContract, RESPONSIBILITIES } from '../../internal/a11y/a11y-contract.js';
import type { DialogProps } from './Dialog.js';

export const a11y = defineA11yContract<DialogProps>()({
  component: 'Dialog',
  semantics: {
    element: 'dialog',
    pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
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
        target: "the short description, merged with the consumer's ids",
        owner: 'component',
      },
    ],
    hiddenFromAT: [
      'the close button’s icon (the button is named by closeLabel)',
      'the rest of the page, made inert by showModal() (no aria-hidden is set)',
    ],
    notes:
      'A native <dialog> opened with showModal(): top layer, implicit aria-modal, an inert page and close requests, with no portal or focus-trap library. Content renders only while open. No non-modal mode.',
  },
  keyboard: [
    {
      keys: ['Escape'],
      action:
        'Asks to close (onOpenChange reason "escape"). Closes the innermost dialog only. Always available, even with the close button hidden. If you refused the last Esc and there was no user action since, the browser closes it without asking (reason "forced")',
    },
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Moves between the controls in the dialog; the page behind is inert. Past the last control, focus may reach the browser’s own UI, by design',
    },
    {
      keys: ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'],
      action: 'Scroll long content while the dialog itself has focus',
    },
  ],
  focus: {
    tabStop: 'programmatic',
    indicator: 'focus-ring',
    management: { onOpen: 'container', trap: true, restore: 'trigger-or-fallback' },
  },
  announcements: [
    {
      when: 'On open',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        'Heard (NVDA Speech Viewer, NVDA 2026.2 in Danish, Chrome, 2026-10-21): "Edit profile", then, reading on, "overskrift niveau 2 Edit profile", "knap Close" and the body text ("overskrift" means heading, "knap" means button). In this reading NVDA spoke the name without the word dialog; with `initialFocus="first"` the first control is announced after it.',
      language: 'da',
    },
    {
      when: 'On close',
      mechanism: 'focus-move',
      owner: 'component',
      announces:
        'Heard (NVDA Speech Viewer, in Danish, Chrome, 2026-10-21): "Open dialog knap", the trigger. Not yet heard for finalFocus.',
      language: 'da',
    },
    {
      when: 'When an action in the dialog completes',
      mechanism: 'live-region',
      politeness: 'polite',
      owner: 'consumer',
      announces:
        'Nothing from Dialog: moving focus is its only announcement. Announce results that outlive the dialog (for example, Item deleted) with your own status message (WCAG 4.1.3).',
    },
  ],
  requiredProps: [
    {
      props: ['title', 'aria-label', 'aria-labelledby'],
      why: 'Without a name every screen reader says just "dialog". Exactly one: a visible title, or an ARIA name when there is no visible heading.',
    },
    {
      props: ['closeLabel', 'hideCloseButton'],
      why: 'The close button is shown by default and needs a translated name; hiding it is an explicit choice.',
    },
  ],
  consumerResponsibilities: [
    RESPONSIBILITIES.keepFocusRing,
    'If you hide the close button, the type requires another visible way out: `cancelLabel`, `footer` or `dismiss="any"`. A touch screen has no Esc.',
    'Keep `description` short. Screen readers read it in full on open and again on re-entry, so never put the whole body in it.',
    'For a form, pass `initialFocus="first"`, so focus starts in the first field.',
    'If the element that opens the dialog can be removed while it is open (a row deleted from inside it), pass `finalFocus`, or focus falls to the start of the page.',
    'While one of senui’s dialogs is open, the page can’t scroll (ADR-0014). Set `html { scrollbar-gutter: stable }` so the page doesn’t shift by a scrollbar’s width on open. To turn the lock off, add the unlayered rule `html { overflow: auto }`.',
    'If your app scrolls an inner container rather than the page, the lock doesn’t reach it: lock that container yourself while the dialog is open.',
    'On a small screen, pass `size="fullscreen"` from your own breakpoint; the dialog doesn’t switch by itself.',
    "To keep a dialog open with unsaved changes, refuse in `onOpenChange` and ask inside the dialog. Browsers allow only one refused Esc without a fresh user action; the next arrives as reason `'forced'`, already closed, so set `open` to false.",
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
      how: 'Esc closes it; Tab reaches every control inside; arrow keys scroll it while it has focus.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.1.2',
      claim: 'meets',
      how: 'Esc always asks to close, also with the close button hidden; there is no dismiss mode without it.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.3',
      claim: 'meets',
      how: 'Focus moves into the dialog on open and back to its opener on close; the page behind is inert.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.7',
      claim: 'meets',
      how: 'A token focus ring under :focus-visible, drawn on the dialog’s border so its content can’t cover it; the close button has its own ring.',
      evidence: ['automated', 'keyboard'],
    },
    {
      criterion: '2.4.11',
      claim: 'meets',
      how: 'scroll-padding-block equals the sticky header and footer, which stop being sticky on short viewports.',
      evidence: ['automated'],
    },
    {
      criterion: '2.5.8',
      claim: 'meets',
      how: 'The close button is at least 24 × 24 px.',
      evidence: ['automated'],
    },
    {
      criterion: '1.4.11',
      claim: 'meets',
      how: 'The focus ring has a 3:1 pair against bg.raised; in forced colours the dialog keeps a CanvasText border.',
      evidence: ['automated', 'forced colours'],
    },
    {
      criterion: '1.4.10',
      claim: 'meets',
      how: 'The dialog never exceeds the viewport and scrolls itself; content wraps.',
      evidence: ['automated'],
    },
    {
      criterion: '1.3.1',
      claim: 'meets',
      how: 'The title is a real heading (level 2 by default) and names the dialog.',
      evidence: ['automated', 'screen reader'],
    },
    {
      criterion: '4.1.2',
      claim: 'meets',
      how: 'Native dialog role, modal through showModal(); name from the title or a required aria-label / aria-labelledby.',
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
    },
    {
      method: 'forced colours',
      detail:
        'Chrome, DevTools Rendering forced-colors: active, Dialog ForcedColors story: the dialog border and the keyboard focus ring visible.',
      result: 'pass',
      date: '2026-10-21',
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
