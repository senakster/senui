import "react";
//#region src/internal/dialog/useModalDialog.d.ts
/**
 * Why a dialog asked to close. Open to new members in a minor, so a consumer switching on it keeps
 * a default branch.
 *
 * `'forced'` is not a request: the browser has already closed the dialog. It does so on a second
 * Esc or back gesture with no user action in between, which a page may not refuse, or when code
 * calls `close()` on the element. Set `open` to false; refusing leaves it closed anyway.
 */
export type DialogCloseReason = 'escape' | 'backdrop' | 'close-button' | 'cancel' | 'form' | 'forced';
/**
 * The second argument of `onOpenChange`. A `<form method="dialog">` close carries the submitter's
 * `value`, read from the submit event, so it is never a stale `returnValue`.
 */
export type DialogOpenChangeDetails = {
  readonly reason: 'form';
  readonly returnValue: string;
} | {
  readonly reason: Exclude<DialogCloseReason, 'form'>;
};
export type DialogDismiss = 'closerequest' | 'any';
//#endregion