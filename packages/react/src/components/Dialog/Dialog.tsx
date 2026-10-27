import { forwardRef, type ReactNode } from 'react';
import {
  ModalDialog,
  type DialogHeadingLevel,
  type DialogNativeProps,
} from '../../internal/dialog/ModalDialog.js';
import type {
  DialogDismiss,
  DialogOpenChangeDetails,
} from '../../internal/dialog/useModalDialog.js';
import { firstFocusable } from '../../internal/dom/focusable.js';

export type {
  DialogCloseReason,
  DialogDismiss,
  DialogOpenChangeDetails,
} from '../../internal/dialog/useModalDialog.js';
export type { DialogHeadingLevel } from '../../internal/dialog/ModalDialog.js';

export type DialogSize = 'sm' | 'md' | 'lg' | 'fullscreen';

/** Content that can't be missing: `{maybeTitle}` doesn't compile (CONVENTIONS rule 3). */
type Content = Exclude<ReactNode, null | undefined | boolean>;

/**
 * A dialog is named by a visible `title`, or, with no visible heading, by exactly one of
 * `aria-label` / `aria-labelledby` (L06 decision 6). Never both.
 */
export type DialogName =
  | {
      /** The visible heading. Names the dialog through `aria-labelledby`. */
      title: Content;
      /** The heading's level. Defaults to 2: a modal is its own context (L06 decision 7). */
      titleLevel?: DialogHeadingLevel;
      'aria-label'?: never;
      'aria-labelledby'?: never;
    }
  | { 'aria-label': string; title?: never; titleLevel?: never; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; title?: never; titleLevel?: never; 'aria-label'?: never };

/**
 * The close button is there by default, with a required name (L06 decision 14). Hiding it requires
 * another visible way out: a Cancel, footer actions, or a backdrop click. Esc alone isn't enough
 * on a touch screen with no keyboard or back gesture (review).
 */
type DialogCloseButton =
  | {
      /** The close button's accessible name. No English default: pass it translated. */
      closeLabel: string;
      hideCloseButton?: false;
    }
  | ({
      /** Hide the close button. Pair it with `cancelLabel`, `footer` or `dismiss="any"`. */
      hideCloseButton: true;
      closeLabel?: never;
    } & ({ cancelLabel: string } | { footer: Content } | { dismiss: 'any' }));

/**
 * Controlled (`open` with a required `onOpenChange`) or uncontrolled (`defaultOpen`), never both.
 * Controlled without `onOpenChange`, every close request would do nothing (review).
 */
export type DialogOpenState =
  | {
      /** Controlled open state. */
      open: boolean;
      /**
       * Called when the dialog asks to close, with why (`details.reason`). The dialog closes only
       * when `open` turns false, so you can refuse, except for `'forced'`, which has already closed.
       */
      onOpenChange: (open: boolean, details: DialogOpenChangeDetails) => void;
      defaultOpen?: never;
    }
  | {
      open?: never;
      /** Uncontrolled initial state. Defaults to `false`. */
      defaultOpen?: boolean;
      /** Called when the dialog closes, with why (`details.reason`). */
      onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void;
    };

export type DialogProps = DialogNativeProps & {
  /**
   * A short description, read when the dialog opens (`aria-describedby`). Never the whole body:
   * screen readers read a description in full, again on re-entry (L06 decision 8).
   */
  description?: ReactNode;
  children?: ReactNode;
  /**
   * Renders a Cancel button first in the footer, which closes the dialog (`onOpenChange` reason
   * `'cancel'`), as AlertDialog's does. No English default: pass it translated.
   */
  cancelLabel?: string;
  /**
   * Your actions, after Cancel, in a footer that stays visible while the body scrolls. They close
   * the dialog themselves, by setting `open` to false once their work is done.
   */
  footer?: ReactNode;
  /** Defaults to `'md'`. `'fullscreen'` fills the viewport; choose it from your own breakpoint (L06 decision 21). */
  size?: DialogSize;
  /**
   * `'closerequest'` (default): Esc and the platform's back gesture close it, a backdrop click
   * doesn't. `'any'`: a backdrop click closes it too (L06 decision 4).
   */
  dismiss?: DialogDismiss;
  /**
   * Where focus starts. `'dialog'` (default) focuses the dialog itself, so a screen reader starts
   * at the top. `'first'`: the first control in the body (use it for forms). Or a ref.
   */
  initialFocus?: 'dialog' | 'first' | { readonly current: HTMLElement | null };
  /**
   * Where focus goes on close when the element that opened the dialog is no longer in the page.
   * Without it, focus falls to the page start, and a development warning says so.
   */
  finalFocus?: () => HTMLElement | null;
  /** Modal dialogs are implicitly `aria-modal`. */
  'aria-modal'?: never;
  /** Use `initialFocus`. */
  autoFocus?: never;
  /** The dialog is focusable by design (`tabindex="-1"`). */
  tabIndex?: never;
  /** Use `onOpenChange`: every close request arrives there, with its reason. */
  onCancel?: never;
  onClose?: never;
} & DialogName &
  DialogCloseButton &
  DialogOpenState;

/**
 * A modal dialog: a native `<dialog>` opened with `showModal()` (L06 decision 1), so the page
 * behind it is inert and focus stays inside without a focus trap. Esc closes it; while it is
 * open, the page doesn't scroll (ADR-0014). The content renders only while it is open.
 * `className`, `style`, native attributes and the ref go on the `<dialog>`.
 * See `Dialog.a11y.ts` for its accessibility contract.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <Button onClick={() => setOpen(true)}>Edit profile</Button>
 * <Dialog open={open} onOpenChange={setOpen} title="Edit profile" closeLabel="Close">
 *   …
 * </Dialog>
 * ```
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  {
    open,
    defaultOpen = false,
    onOpenChange,
    title,
    titleLevel = 2,
    description,
    children,
    footer,
    cancelLabel,
    size = 'md',
    dismiss = 'closerequest',
    initialFocus = 'dialog',
    finalFocus,
    closeLabel,
    hideCloseButton = false,
    ...rest
  },
  forwardedRef,
) {
  return (
    <ModalDialog
      {...rest}
      ref={forwardedRef}
      component="Dialog"
      rootClassName="senui-dialog"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      title={title}
      titleLevel={titleLevel}
      description={description}
      footer={footer}
      cancelLabel={cancelLabel}
      closeLabel={hideCloseButton ? undefined : closeLabel}
      size={size}
      dismiss={dismiss}
      finalFocus={finalFocus}
      initialFocus={(dialog) => {
        if (initialFocus === 'dialog') return dialog;
        if (initialFocus === 'first') {
          return (
            firstFocusable(dialog.querySelector(':scope > .senui-dialog__body')) ??
            firstFocusable(dialog.querySelector(':scope > .senui-dialog__footer')) ??
            dialog
          );
        }
        return initialFocus.current ?? dialog;
      }}
    >
      {children}
    </ModalDialog>
  );
});

Dialog.displayName = 'Dialog';
