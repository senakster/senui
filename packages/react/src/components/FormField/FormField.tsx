import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DEV, warnOnce } from '../../internal/dev.js';
import { mergeIds } from '../../internal/ids.js';
import type { NativeProps } from '../../internal/native-props.js';
import { useComposedRefs } from '../../internal/refs.js';
import { createBinding, type FormFieldBinding } from './useFormFieldControl.js';

export { focusFirstInvalid } from './focusFirstInvalid.js';
export type { FormFieldBinding } from './useFormFieldControl.js';

/** Something to show: `undefined`, `null` and booleans render nothing, so they can't label a field. */
type Label = Exclude<ReactNode, null | undefined | boolean>;

export type FormFieldProps = Omit<
  NativeProps<'div'>,
  'id' | 'aria-describedby' | 'aria-labelledby' | 'aria-label' | 'aria-invalid' | 'aria-required'
> & {
  // The ARIA props a control takes would land on this wrapper, which has no role: pass them to the
  // control instead, which merges them with the field's. Declared `never`, not just omitted: JSX
  // doesn't check hyphenated attribute names it doesn't know, so an omitted one still compiles.
  'aria-describedby'?: never;
  'aria-labelledby'?: never;
  'aria-label'?: never;
  'aria-invalid'?: never;
  'aria-required'?: never;
  /**
   * The visible label. It names the control: the control takes no label of its own (L04 decision
   * 6). The type can't reject an empty string; the development name check warns about one.
   */
  label: Label;
  /** Help text, read after the label when the control is focused. */
  description?: ReactNode;
  /**
   * The error message. While it is set (anything but `undefined`, `null`, `false` or `''`), the
   * control is `aria-invalid` and its description includes the message. Not `true`: an error
   * needs words, so `error={!!errors.email}` doesn't compile. Native constraint errors
   * (`required`, `type="email"`…) show here too, after a submit attempt; this prop wins over them.
   */
  error?: Label | false | null | undefined;
  /**
   * Marks the control `required`, and shows a marker after the label that assistive technology
   * doesn't read (the control's own required state is announced instead). Explain the marker
   * once, above the form.
   */
  required?: boolean;
  /**
   * Makes the `error` message a polite live region, so a change is announced without moving focus.
   * Use it only when you validate as the user types; otherwise focus on submit announces each
   * error in context (L04 decisions 3 and 4). Native constraint errors are never announced this
   * way: they are read when the field takes focus on submit.
   */
  announce?: 'polite';
  /** The control's id (generated when omitted). Use it to link to the field, e.g. from an error summary. */
  id?: string;
  /** Renders the control, given the binding that wires it to this field. */
  children: (field: FormFieldBinding) => ReactNode;
};

/**
 * A label, optional description and error message for one form control, and the wiring between
 * them: the label's `for`, the control's `aria-describedby`, `aria-invalid` and `required`. The
 * control is rendered by `children`, a function that receives the binding:
 *
 * ```tsx
 * <FormField label="Email" description="We reply here." error={errors.email} required>
 *   {(field) => <TextInput field={field} type="email" autoComplete="email" />}
 * </FormField>
 * ```
 *
 * See `FormField.a11y.ts` for its accessibility contract.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { label, description, error, required = false, announce, id, children, className, ...rest },
  forwardedRef,
) {
  const generatedId = useId();
  const controlId = id ?? `${generatedId}-control`;
  const root = useRef<HTMLDivElement | null>(null);
  const ref = useComposedRefs(forwardedRef, root);
  useBindingCheck(root, controlId);
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;
  const nativeErrorId = `${generatedId}-native-error`;
  const [nativeMessage, setNativeMessage] = useState<string | null>(null);

  const hasDescription = hasContent(description);
  const hasError = hasContent(error);
  // The `error` prop wins; a native message shows only without one.
  const showNative = !hasError && nativeMessage !== null;

  const field = createBinding({
    id: controlId,
    describedBy: mergeIds(
      hasDescription && descriptionId,
      hasError && errorId,
      showNative && nativeErrorId,
    ),
    invalid: hasError || showNative,
    required,
    nativeInvalid: nativeMessage !== null,
    reportNative: setNativeMessage,
  });

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then FormField's.
  return (
    <div
      {...rest}
      ref={ref}
      className={className ? `senui-form-field ${className}` : 'senui-form-field'}
    >
      <label className="senui-form-field__label" htmlFor={controlId}>
        {label}
        {required && (
          <span className="senui-form-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hasDescription && (
        <div className="senui-form-field__description" id={descriptionId}>
          {description}
        </div>
      )}
      {children(field)}
      {/* Always rendered, empty while valid, so it can be a live region that already exists when
          a message arrives (L04: error message node). */}
      <div className="senui-form-field__error" id={errorId} aria-live={announce}>
        {hasError && <ErrorMessage>{error}</ErrorMessage>}
      </div>
      {/* Native messages are never live: a failed submit would queue every field's message at
          once. They are read in context when focus moves to the field (L04 decision 3). */}
      {showNative && (
        <div className="senui-form-field__error" id={nativeErrorId}>
          <ErrorMessage>{nativeMessage}</ErrorMessage>
        </div>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

/** Booleans render nothing, so `true` (cast past the type) is no message either. */
function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && typeof node !== 'boolean' && node !== '';
}

/**
 * Development only: the binding must reach exactly one control. The type can't see what the render
 * function returns, so a binding that is ignored (the label points at nothing) or used twice
 * (duplicate ids, one unlabelled control) is caught here.
 */
function useBindingCheck(root: { readonly current: HTMLDivElement | null }, controlId: string) {
  useEffect(() => {
    if (!DEV || !root.current) return;
    const count = Array.from(root.current.querySelectorAll('[id]')).filter(
      (element) => element.id === controlId,
    ).length;
    if (count === 0) {
      warnOnce(
        `form-field-unbound:${controlId}`,
        'FormField rendered no control with its binding, so its label names nothing. Pass the binding to one control: `{(field) => <TextInput field={field} />}`.',
      );
    } else if (count > 1) {
      warnOnce(
        `form-field-rebound:${controlId}`,
        'FormField’s binding was passed to more than one control, which then share an id. Give each control its own FormField.',
      );
    }
  });
}

/** The icon, then the message in one element, so a message with markup stays one line of text. */
function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <>
      <ErrorIcon />
      <span className="senui-form-field__error-text">{children}</span>
    </>
  );
}

/** Marks the message as an error by shape, not colour alone (WCAG 1.4.1). Decorative: the text says it. */
function ErrorIcon() {
  return (
    <svg
      className="senui-form-field__error-icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
    >
      <circle className="senui-form-field__error-icon-disc" cx="8" cy="8" r="7" />
      <path
        className="senui-form-field__error-icon-mark"
        d="M8 4.5v4M8 11.25v.5"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
