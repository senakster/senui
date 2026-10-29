import { NativeProps } from "../../internal/dom/native-props.js";
import { FormFieldBinding } from "../../internal/field/useFormFieldControl.js";
import { focusFirstInvalid } from "../../internal/field/focusFirstInvalid.js";
import { ReactNode } from "react";
//#region src/components/FormField/FormField.d.ts
/** Something to show: `undefined`, `null` and booleans render nothing, so they can't label a field. */
type Label = Exclude<ReactNode, null | undefined | boolean>;
export type FormFieldProps = Omit<NativeProps<'div'>, 'id' | 'aria-describedby' | 'aria-labelledby' | 'aria-label' | 'aria-invalid' | 'aria-required'> & {
  /** Pass it to the control, which merges it with the field's description and error. */
  'aria-describedby'?: never;
  /** The `label` names the control. */
  'aria-labelledby'?: never;
  /** The `label` names the control. */
  'aria-label'?: never;
  /** Use `error`, which sets the control's `aria-invalid`. */
  'aria-invalid'?: never;
  /** Use `required`, which makes the control required. */
  'aria-required'?: never;
  /**
   * The visible label. It names the control: the control takes no label of its own. The type
   * can't reject an empty string; the development name check warns about one.
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
   * error in context. Native constraint errors are never announced this way: they are read when
   * the field takes focus on submit.
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
export declare const FormField: import("react").ForwardRefExoticComponent<Omit<NativeProps<"div">, "id" | "aria-describedby" | "aria-invalid" | "aria-label" | "aria-labelledby" | "aria-required"> & {
  /** Pass it to the control, which merges it with the field's description and error. */
  'aria-describedby'?: never;
  /** The `label` names the control. */
  'aria-labelledby'?: never;
  /** The `label` names the control. */
  'aria-label'?: never;
  /** Use `error`, which sets the control's `aria-invalid`. */
  'aria-invalid'?: never;
  /** Use `required`, which makes the control required. */
  'aria-required'?: never;
  /**
   * The visible label. It names the control: the control takes no label of its own. The type
   * can't reject an empty string; the development name check warns about one.
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
   * error in context. Native constraint errors are never announced this way: they are read when
   * the field takes focus on submit.
   */
  announce?: "polite";
  /** The control's id (generated when omitted). Use it to link to the field, e.g. from an error summary. */
  id?: string;
  /** Renders the control, given the binding that wires it to this field. */
  children: (field: FormFieldBinding) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;
//#endregion
export { type FormFieldBinding, focusFirstInvalid };