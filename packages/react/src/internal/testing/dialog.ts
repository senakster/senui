/**
 * jsdom has no `showModal()` or `close()`. This stand-in is enough for wiring tests in the unit
 * project: it toggles `open`, focuses the `autofocus` element as the browser would, and fires
 * `close`. Modality, the top layer, Esc and focus return are real only in `*.browser.test.tsx`.
 *
 * ```ts
 * beforeAll(installDialogPolyfill);
 * ```
 */
export function installDialogPolyfill(): void {
  const proto = HTMLDialogElement.prototype;
  if (typeof proto.showModal === 'function') return;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
    const target = this.hasAttribute('autofocus')
      ? this
      : this.querySelector<HTMLElement>('[autofocus]');
    target?.focus();
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** What a browser does on Esc: a cancelable `cancel` event on the dialog. */
export function pressEscape(dialog: HTMLDialogElement): void {
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
}
