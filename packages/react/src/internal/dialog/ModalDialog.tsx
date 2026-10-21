import { forwardRef, useEffect, useId, type ReactNode, type RefObject } from 'react';
import { Button } from '../../components/Button/Button.js';
import { mergeIds } from '../dom/ids.js';
import type { NativeProps } from '../dom/native-props.js';
import { useComposedRefs } from '../dom/refs.js';
import {
  useModalDialog,
  type DialogDismiss,
  type DialogOpenChangeDetails,
  type DialogPhase,
} from './useModalDialog.js';
import { useNameCheck } from '../a11y/useNameCheck.js';

export type DialogHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Native `<dialog>` attributes a senui dialog passes through. The dialog owns the rest. */
export type DialogNativeProps = Omit<
  NativeProps<'dialog'>,
  | 'open'
  | 'title'
  | 'onCancel'
  | 'onClose'
  | 'tabIndex'
  | 'autoFocus'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-modal'
>;

export interface ModalDialogProps extends DialogNativeProps {
  component: 'Dialog' | 'AlertDialog';
  /** `senui-dialog` always comes first: the shared styles and ADR-0014's root lock key on it. */
  rootClassName: string;
  role?: 'alertdialog' | undefined;
  open?: boolean | undefined;
  defaultOpen: boolean;
  onOpenChange?: ((open: boolean, details: DialogOpenChangeDetails) => void) | undefined;
  title?: ReactNode;
  titleLevel: DialogHeadingLevel;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  description?: ReactNode;
  children?: ReactNode;
  /** The consumer's actions, after Cancel. They close the dialog themselves, through `open`. */
  footer?: ReactNode;
  /** Renders the close button when set. */
  closeLabel?: string | undefined;
  /** Renders a Cancel button first in the footer when set; it closes with reason `'cancel'`. */
  cancelLabel?: string | undefined;
  size: string;
  dismiss: DialogDismiss;
  initialFocus: (dialog: HTMLDialogElement) => HTMLElement;
  finalFocus?: (() => HTMLElement | null) | undefined;
}

/**
 * The markup and behaviour Dialog and AlertDialog share. Not exported from the package: each public
 * component narrows these props with its own type-level requirements.
 */
export const ModalDialog = forwardRef<HTMLDialogElement, ModalDialogProps>(function ModalDialog(
  {
    component,
    rootClassName,
    role,
    open,
    defaultOpen,
    onOpenChange,
    title,
    titleLevel,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    description,
    children,
    footer,
    closeLabel,
    cancelLabel,
    size,
    dismiss,
    initialFocus,
    finalFocus,
    className,
    ...rest
  },
  forwardedRef,
) {
  const modal = useModalDialog({
    component,
    open,
    defaultOpen,
    onOpenChange,
    dismiss,
    initialFocus,
    finalFocus,
  });
  const ref = useComposedRefs(
    forwardedRef,
    useComposedRefs<HTMLDialogElement>(useNameCheck(component), modal.ref),
  );
  useStickyInsets(modal.ref, modal.phase);

  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const hasTitle = title !== undefined && title !== null && title !== false;
  const hasDescription = description !== undefined && description !== null && description !== false;
  const mounted = modal.phase !== 'closed';
  const Heading = `h${String(titleLevel)}` as `h${DialogHeadingLevel}`;
  const hasFooter =
    cancelLabel !== undefined || (footer !== undefined && footer !== null && footer !== false);

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then the dialog's. No
  // `open` attribute, ever: only showModal() makes the dialog modal (L06 decision 1).
  return (
    <dialog
      {...rest}
      ref={ref}
      role={role}
      className={className ? `${rootClassName} ${className}` : rootClassName}
      data-size={size}
      data-state={modal.phase}
      // Focusable, so the default initial focus can land on it and arrow keys scroll it (L06
      // decisions 9 and 16).
      tabIndex={-1}
      aria-label={ariaLabel}
      // Rendered even while closed, when the title isn't: the name check runs on mount.
      aria-labelledby={hasTitle ? titleId : ariaLabelledBy}
      aria-describedby={mergeIds(ariaDescribedBy, mounted && hasDescription && descriptionId)}
    >
      {mounted && (
        <>
          {(hasTitle || closeLabel !== undefined) && (
            <div className="senui-dialog__header">
              {hasTitle && (
                <Heading id={titleId} className="senui-dialog__title">
                  {title}
                </Heading>
              )}
              {closeLabel !== undefined && (
                <Button
                  className="senui-dialog__close"
                  variant="ghost"
                  size="sm"
                  icon={<CloseIcon />}
                  aria-label={closeLabel}
                  onClick={() => {
                    modal.requestClose({ reason: 'close-button' });
                  }}
                />
              )}
            </div>
          )}
          <div className="senui-dialog__body">
            {hasDescription && (
              <div id={descriptionId} className="senui-dialog__description">
                {description}
              </div>
            )}
            {children}
          </div>
          {hasFooter && (
            <div className="senui-dialog__footer">
              {/* The same Cancel in Dialog and AlertDialog: first, secondary, and it closes. */}
              {cancelLabel !== undefined && (
                <Button
                  className="senui-dialog__cancel"
                  variant="secondary"
                  onClick={() => {
                    modal.requestClose({ reason: 'cancel' });
                  }}
                >
                  {cancelLabel}
                </Button>
              )}
              {footer}
            </div>
          )}
        </>
      )}
    </dialog>
  );
});

ModalDialog.displayName = 'ModalDialog';

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Keeps `scroll-padding-block` equal to the sticky header and footer, so a focused control is
 * never scrolled under them (L06 decision 16, WCAG 2.4.11). Their height depends on the content,
 * so it is measured, into internal `--_senui-dialog-*` properties on the dialog.
 */
function useStickyInsets(ref: RefObject<HTMLDialogElement | null>, phase: DialogPhase): void {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || phase === 'closed' || typeof ResizeObserver !== 'function') return;
    const parts = [
      ['header', dialog.querySelector(':scope > .senui-dialog__header')],
      ['footer', dialog.querySelector(':scope > .senui-dialog__footer')],
    ] as const;
    const observer = new ResizeObserver(() => {
      for (const [name, part] of parts) {
        // Layout size, not getBoundingClientRect(): the enter animation scales the dialog, and a
        // scaled measurement leaves the padding short of the real header (found in L06's tests).
        const size = part instanceof HTMLElement ? `${String(part.offsetHeight)}px` : '0px';
        dialog.style.setProperty(`--_senui-dialog-${name}-size`, size);
      }
    });
    for (const [, part] of parts) if (part) observer.observe(part);
    return () => {
      observer.disconnect();
    };
  }, [ref, phase]);
}
