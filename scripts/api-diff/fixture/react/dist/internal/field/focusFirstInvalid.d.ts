//#region src/internal/field/focusFirstInvalid.d.ts
/**
 * Moves focus to the first control in `form`, in document order, that shows an error
 * (`aria-invalid="true"`, which FormField sets for its `error` prop and for native errors), and
 * returns it. A control that can't take focus (disabled, hidden) is skipped. Returns `null` when
 * nothing showing an error could be focused. Focus is how a screen reader hears an error in
 * context: the control's label, description and error message are read together.
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
export declare function focusFirstInvalid(form: HTMLFormElement): HTMLElement | null;
//#endregion