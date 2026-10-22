import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { warnOnce } from '../dev/dev.js';
import { useControllableState } from '../state/useControllableState.js';

/**
 * Why a dialog asked to close. Open to new members in a minor (L06 decision 3), so a consumer
 * switching on it keeps a default branch.
 *
 * `'forced'` is not a request: the browser has already closed the dialog. It does so on a second
 * Esc or back gesture with no user action in between, which a page may not refuse, or when code
 * calls `close()` on the element. Set `open` to false; refusing leaves it closed anyway (review).
 */
export type DialogCloseReason =
  'escape' | 'backdrop' | 'close-button' | 'cancel' | 'form' | 'forced';

/**
 * The second argument of `onOpenChange`. A `<form method="dialog">` close carries the submitter's
 * `value` (L06 decision 22), read from the submit event, so it is never a stale `returnValue`.
 */
export type DialogOpenChangeDetails =
  | { readonly reason: 'form'; readonly returnValue: string }
  | { readonly reason: Exclude<DialogCloseReason, 'form'> };

export type DialogDismiss = 'closerequest' | 'any';

/** `closed` and `open` are stable; `closing` lasts while the exit animation runs. */
export type DialogPhase = 'closed' | 'open' | 'closing';

export interface UseModalDialogOptions {
  /** Names used in development warnings. */
  component: string;
  open: boolean | undefined;
  defaultOpen: boolean;
  onOpenChange: ((open: boolean, details: DialogOpenChangeDetails) => void) | undefined;
  dismiss: DialogDismiss;
  /** The element that takes focus when the dialog opens. Called after the content renders. */
  initialFocus: (dialog: HTMLDialogElement) => HTMLElement;
  /** Where focus goes on close when the element that opened the dialog is gone (L06 decision 11). */
  finalFocus: (() => HTMLElement | null) | undefined;
}

export interface ModalDialog {
  ref: RefObject<HTMLDialogElement | null>;
  phase: DialogPhase;
  /** Asks the owner to close: reports through `onOpenChange`, and closes when `open` turns false. */
  requestClose: (details: DialogOpenChangeDetails) => void;
}

/**
 * A safety net for an exit animation whose `finished` never settles (L06: "timeout fallback").
 * Longer than the slowest motion token, so it never cuts a running animation short.
 */
const EXIT_TIMEOUT_MS = 1000;

/**
 * The behaviour Dialog and AlertDialog share (L06 decisions 1, 3, 4, 5, 9, 11 and 22):
 *
 * - `showModal()` from an effect when `open` turns true; the `open` attribute is never rendered.
 * - Closing sets `phase` to `closing`, waits for the dialog's own exit animations, then calls
 *   `close()`. Reopening during the exit cancels it.
 * - Every close request (Esc, a backdrop click, a `<form method="dialog">` submit, the close or
 *   Cancel button) is prevented and reported as `onOpenChange(false, details)`. The dialog closes
 *   only when `open` turns false, so a controlled owner can refuse.
 * - Backdrop clicks are detected here in every engine rather than through `closedby`, so the
 *   reason is known and one code path is tested (scope-decisions § L06).
 * - Focus: the trigger is captured at open. On close, native focus return is kept; if the
 *   trigger is gone, `finalFocus` is used, or a development warning fires.
 */
export function useModalDialog(options: UseModalDialogOptions): ModalDialog {
  const ref = useRef<HTMLDialogElement | null>(null);
  const details = useRef<DialogOpenChangeDetails>({ reason: 'escape' });
  const { onOpenChange } = options;
  const [open, setOpen] = useControllableState({
    value: options.open,
    defaultValue: options.defaultOpen,
    onChange:
      onOpenChange &&
      ((next: boolean) => {
        onOpenChange(next, details.current);
      }),
    name: { component: options.component, prop: 'open' },
  });

  const [phase, setPhase] = useState<DialogPhase>(open ? 'open' : 'closed');
  // The browser closed the dialog without asking (a close request it wouldn't let us prevent, or
  // a direct `close()`). It stays closed until `open` turns false, so we never fight the browser.
  const [blocked, setBlocked] = useState(false);
  if (!open && blocked) setBlocked(false);
  if (open && !blocked && phase !== 'open') setPhase('open');
  if (!open && phase === 'open') setPhase('closing');

  const requestClose = useCallback(
    (next: DialogOpenChangeDetails) => {
      details.current = next;
      setOpen(false);
    },
    [setOpen],
  );

  // The latest render's view, for event listeners attached once.
  const latest = useRef({ options, phase, requestClose });
  useInsertionEffect(() => {
    latest.current = { options, phase, requestClose };
  });

  const trigger = useRef<Element | null>(null);

  // `unmounting`: the dialog is leaving the page, usually with the rest of the screen, so a
  // missing trigger is expected and isn't worth a warning.
  const restoreFocus = useCallback((dialog: HTMLDialogElement, unmounting = false) => {
    const document = dialog.ownerDocument;
    const previous = trigger.current;
    trigger.current = null;
    // The trigger is still here: make sure it has focus. Native return usually did it already, but
    // not always: WebKit returns to the outer dialog when its button wasn't focused by the click.
    if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) {
      if (document.activeElement !== previous) previous.focus();
      return;
    }
    const fallback = latest.current.options.finalFocus?.();
    if (fallback) {
      fallback.focus();
      return;
    }
    if (!unmounting && previous instanceof HTMLElement && previous !== document.body) {
      const { component } = latest.current.options;
      warnOnce(
        `final-focus:${component}`,
        `${component} closed after the element that opened it was removed, so focus fell to the start of the page. Pass \`finalFocus\` to say where focus goes instead.`,
      );
    }
  }, []);

  // Track pointer presses for openingElement() while any dialog is mounted.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog) trackPresses(dialog.ownerDocument);
  }, []);

  // Open and close, following the phase.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (phase === 'open' && !dialog.open) {
      trigger.current = openingElement(dialog);
      const target = latest.current.options.initialFocus(dialog);
      // The browser focuses an `autofocus` element itself during showModal(), with no script race
      // (L06 decision 9). Set it only for the call.
      const hadAutofocus = target.hasAttribute('autofocus');
      target.setAttribute('autofocus', '');
      dialog.showModal();
      if (!hadAutofocus) target.removeAttribute('autofocus');
      if (dialog.ownerDocument.activeElement !== target) target.focus();
      return;
    }
    if (phase === 'closing') {
      let cancelled = false;
      void exitFinished(dialog).then(() => {
        if (cancelled) return;
        if (dialog.open) dialog.close();
        restoreFocus(dialog);
        setPhase('closed');
      });
      return () => {
        cancelled = true;
      };
    }
  }, [phase, restoreFocus]);

  // Close requests and the safety net, attached once to the dialog element.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const onCancel = (event: Event) => {
      if (event.target !== dialog) return;
      event.preventDefault();
      latest.current.requestClose({ reason: 'escape' });
    };

    const onClose = () => {
      if (latest.current.phase !== 'open') return; // our own close()
      // The browser closed it without a request we could refuse. Follow it, and tell the owner, so
      // `open` returns to false and the trigger can open it again (review: all three reviewers).
      // `blocked` keeps it closed if the owner ignores this, rather than fighting the browser.
      setBlocked(true);
      setPhase('closed');
      restoreFocus(dialog);
      latest.current.requestClose({ reason: 'forced' });
    };

    let pressedOutside = false;
    const outside = (event: MouseEvent) => {
      if (event.target !== dialog) return false;
      const box = dialog.getBoundingClientRect();
      return (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      );
    };
    // Both press and release on the backdrop, so a text selection dragged out of the dialog
    // doesn't close it.
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = outside(event);
    };
    const onClick = (event: MouseEvent) => {
      const wasOutside = pressedOutside;
      pressedOutside = false;
      if (latest.current.options.dismiss !== 'any' || !wasOutside || !outside(event)) return;
      latest.current.requestClose({ reason: 'backdrop' });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.closest('dialog') !== dialog) return;
      const submitter = event.submitter;
      const method = submitter?.getAttribute('formmethod') ?? form.getAttribute('method') ?? '';
      if (method.toLowerCase() !== 'dialog') return;
      event.preventDefault();
      const returnValue =
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter.value
          : '';
      latest.current.requestClose({ reason: 'form', returnValue });
    };

    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('submit', onSubmit);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('submit', onSubmit);
      // Unmounted while open: leave the top layer, and put focus back.
      if (dialog.open) {
        dialog.close();
        restoreFocus(dialog, true);
      }
    };
  }, [restoreFocus]);

  return { ref, phase, requestClose };
}

/**
 * Resolves when the dialog's own exit animations (on the element and its `::backdrop`) finish.
 * Descendants are ignored: a spinner inside would never finish.
 */
function exitFinished(dialog: HTMLDialogElement): Promise<void> {
  if (typeof dialog.getAnimations !== 'function') return Promise.resolve();
  const own = dialog.getAnimations({ subtree: true }).filter((animation) => {
    const effect = animation.effect;
    return (
      effect instanceof KeyframeEffect &&
      effect.target === dialog &&
      effect.getComputedTiming().endTime !== Infinity
    );
  });
  if (own.length === 0) return Promise.resolve();
  return Promise.race([
    Promise.allSettled(own.map((animation) => animation.finished)).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, EXIT_TIMEOUT_MS)),
  ]);
}

/**
 * A press older than this isn't what opened the dialog. Generous enough for a click, a render and
 * an effect; short enough that a dialog opened later, by a timer or a response, doesn't adopt it.
 */
const PRESS_WINDOW_MS = 1000;

const lastPress = new WeakMap<Document, { element: HTMLElement; time: number }>();
const tracked = new WeakSet<Document>();

/**
 * Records the focusable control under each pointer press, once per document, for the life of the
 * page. Safari (and Firefox on macOS) don't focus a button on a mouse click, so `activeElement`
 * alone can't say which control opened a dialog.
 */
function trackPresses(document: Document): void {
  if (tracked.has(document)) return;
  tracked.add(document);
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest<HTMLElement>(PRESSABLE);
      if (element) lastPress.set(document, { element, time: event.timeStamp });
    },
    { capture: true, passive: true },
  );
}

/**
 * The element that opened the dialog, for focus return (L06 decision 11). Normally the focused
 * element. When nothing outside a dialog has focus (`<body>`, or the parent dialog itself when
 * nested) and a control was pressed just now, that control: a mouse click in Safari doesn't focus
 * a button (scope-decisions § L06).
 */
function openingElement(dialog: HTMLDialogElement): Element | null {
  const document = dialog.ownerDocument;
  const active = document.activeElement;
  const press = lastPress.get(document);
  const unfocused =
    active === null ||
    active === document.body ||
    (active instanceof HTMLDialogElement && press !== undefined && active.contains(press.element));
  if (
    unfocused &&
    press !== undefined &&
    press.element.isConnected &&
    !dialog.contains(press.element) &&
    performance.now() - press.time < PRESS_WINDOW_MS
  ) {
    return press.element;
  }
  return active;
}

const PRESSABLE = 'button, a[href], input, select, textarea, summary, [tabindex]';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** The first element in `root` that Tab would reach, or `null`. */
export function firstFocusable(root: Element | null): HTMLElement | null {
  if (!root) return null;
  // No checkVisibility(): this runs before showModal(), while the whole dialog is display: none.
  for (const element of Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))) {
    if (element.closest('[inert], [hidden]')) continue;
    return element;
  }
  return null;
}
