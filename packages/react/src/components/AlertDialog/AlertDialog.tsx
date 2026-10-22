import { forwardRef, type ReactElement, type ReactNode } from 'react';
import { ModalDialog, type DialogNativeProps } from '../../internal/dialog/ModalDialog.js';
import type { DialogName, DialogOpenState } from '../Dialog/Dialog.js';

type Content = Exclude<ReactNode, null | undefined | boolean>;

export type AlertDialogSize = 'sm' | 'md';

export type AlertDialogProps = DialogNativeProps & {
  /** What will happen, read when the dialog opens. Required: an alert needs its consequence (L06 decision 13). */
  description: Content;
  /** The Cancel button's text. Required, with no English default. Cancel takes focus on open. */
  cancelLabel: string;
  /**
   * The confirming action: one element, usually `<Button variant="danger" onClick={…}>Delete</Button>`.
   * Not plain text, which would leave the alert with no way to confirm (review). It closes the
   * dialog itself, by setting `open` to false. Cancel reports `'cancel'`, and Esc `'escape'`.
   */
  action: ReactElement;
  /** More detail, after the description (a list of what will be deleted, for example). */
  children?: ReactNode;
  /** Defaults to `'sm'`. */
  size?: AlertDialogSize;
  /** Where focus goes on close when the element that opened the dialog is gone. */
  finalFocus?: () => HTMLElement | null;
  /** An alert dialog is never dismissed from the backdrop (L06 decision 13). */
  dismiss?: never;
  /** Focus always starts on Cancel, the least destructive choice. */
  initialFocus?: never;
  /** Cancel is the way out; there is no close button. */
  closeLabel?: never;
  hideCloseButton?: never;
  /** The footer holds Cancel and `action`. */
  footer?: never;
  'aria-modal'?: never;
  autoFocus?: never;
  tabIndex?: never;
  onCancel?: never;
  onClose?: never;
} & DialogName &
  DialogOpenState;

/**
 * A confirmation that interrupts, usually before a destructive action (L06 decision 13): a modal
 * `<dialog role="alertdialog">` with a required description, a Cancel button that takes focus,
 * and your action. Esc cancels; a backdrop click never closes it. Shares Dialog's behaviour and
 * styles (`styles/AlertDialog.css` imports Dialog's). See `AlertDialog.a11y.ts`.
 *
 * ```tsx
 * <AlertDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete project?"
 *   description="Its files and history are deleted. This can't be undone."
 *   cancelLabel="Cancel"
 *   action={<Button variant="danger" onClick={remove}>Delete</Button>}
 * />
 * ```
 */
export const AlertDialog = forwardRef<HTMLDialogElement, AlertDialogProps>(function AlertDialog(
  {
    open,
    defaultOpen = false,
    onOpenChange,
    title,
    titleLevel = 2,
    description,
    cancelLabel,
    action,
    children,
    size = 'sm',
    finalFocus,
    ...rest
  },
  forwardedRef,
) {
  return (
    <ModalDialog
      {...rest}
      ref={forwardedRef}
      component="AlertDialog"
      rootClassName="senui-dialog senui-alert-dialog"
      role="alertdialog"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      title={title}
      titleLevel={titleLevel}
      description={description}
      size={size}
      dismiss="closerequest"
      finalFocus={finalFocus}
      initialFocus={(dialog) =>
        dialog.querySelector<HTMLElement>(
          ':scope > .senui-dialog__footer > .senui-dialog__cancel',
        ) ?? dialog
      }
      cancelLabel={cancelLabel}
      footer={action}
    >
      {children}
    </ModalDialog>
  );
});

AlertDialog.displayName = 'AlertDialog';
