const showsError = (element: HTMLElement) => element.getAttribute('aria-invalid') === 'true';

/**
 * Focuses the first control in `form`, in document order, that matches `isInvalid` and actually
 * takes focus: a disabled or hidden control is skipped rather than reported as focused. Returns the
 * control that received focus, or `null`.
 */
export function focusFirst(
  form: HTMLFormElement,
  isInvalid: (element: HTMLElement) => boolean,
): HTMLElement | null {
  for (const element of Array.from(form.elements)) {
    // A fieldset matches :invalid when anything inside it does; the control itself comes next.
    if (!(element instanceof HTMLElement) || element instanceof HTMLFieldSetElement) continue;
    if (!isInvalid(element)) continue;
    element.focus();
    if (element.ownerDocument.activeElement === element) return element;
  }
  return null;
}

/**
 * During a failed native submit: the first control that shows an error, or is about to show one
 * (natively `:invalid`; its error renders from the same `invalid` event).
 */
export function focusFirstInvalidOnSubmit(form: HTMLFormElement): HTMLElement | null {
  return focusFirst(form, (element) => showsError(element) || element.matches(':invalid'));
}

/**
 * Moves focus to the first control in `form`, in document order, that shows an error
 * (`aria-invalid="true"`, which FormField sets for its `error` prop and for native errors), and
 * returns it. A control that can't take focus (disabled, hidden) is skipped. Returns `null` when
 * nothing showing an error could be focused. Focus is how a screen reader hears an error in
 * context: the control's label, description and error message are read together (L04 decision 3).
 *
 * FormField already does this for the browser's own constraint validation on submit. Call it
 * yourself after setting `error` props from your own validation, once React has rendered them:
 *
 * ```tsx
 * function onSubmit(event: SubmitEvent<HTMLFormElement>) {
 *   event.preventDefault();
 *   const form = event.currentTarget;
 *   flushSync(() => setErrors(validate(new FormData(form))));
 *   focusFirstInvalid(form);
 * }
 * ```
 */
export function focusFirstInvalid(form: HTMLFormElement): HTMLElement | null {
  return focusFirst(form, showsError);
}
