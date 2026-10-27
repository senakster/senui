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
  // No checkVisibility(): a dialog calls this before showModal(), while it is display: none.
  for (const element of Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))) {
    if (element.closest('[inert], [hidden]')) continue;
    return element;
  }
  return null;
}
