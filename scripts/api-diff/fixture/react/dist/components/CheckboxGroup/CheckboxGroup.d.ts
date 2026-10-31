import { NativeProps } from "../../internal/dom/native-props.js";
import { ReactNode } from "react";
//#region src/components/CheckboxGroup/CheckboxGroup.d.ts
/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a group. */
type Label = Exclude<ReactNode, null | undefined | boolean>;
export type CheckboxGroupProps = Omit<NativeProps<'fieldset'>, 'defaultValue' | 'aria-invalid' | 'aria-required' | 'aria-label' | 'aria-labelledby'> & {
  /** The group's visible name, read when focus enters the group. */
  legend: Label;
  /** Help text, read with each checkbox in the group (a fieldset's own description goes unread in NVDA). */
  description?: ReactNode;
  /** The group's error message; while set, every checkbox in it is `aria-invalid`. */
  error?: Label | false | null | undefined;
  /**
   * At least one option must be checked to submit. The value is the message shown, and read, when
   * none is: `required="Choose at least one topic."`. The library ships no wording of its own, so
   * the type asks for it. Never set `required` on the checkboxes themselves.
   */
  required?: string;
  /** Controlled: the checked options' values. Pair with `onValueChange`. */
  value?: readonly string[];
  /** Uncontrolled: the initially checked options' values. */
  defaultValue?: readonly string[];
  /** Called with the checked options' values on every change. */
  onValueChange?: (value: readonly string[]) => void;
  /** The `name` every checkbox submits under, unless it sets its own. */
  name?: string;
  /** The options: `<Checkbox value="news" label="News" />`, each with a unique `value`. */
  children: ReactNode;
  /** Use `error`; the checkboxes carry `aria-invalid`. */
  'aria-invalid'?: never;
  /** Use `required`, which is announced on the checkboxes' validation. */
  'aria-required'?: never;
  /** The `legend` names the group. */
  'aria-label'?: never;
  /** The `legend` names the group. */
  'aria-labelledby'?: never;
};
/**
 * A `<fieldset>` and `<legend>` around a set of Checkboxes, with one description, one error and one
 * value array. The group's error is described on the fieldset only, so entering the group reads
 * legend and error once; each checkbox is `aria-invalid` while it shows.
 *
 * ```tsx
 * <CheckboxGroup legend="Topics" required="Choose at least one topic." defaultValue={['news']}>
 *   <Checkbox value="news" label="News" />
 *   <Checkbox value="releases" label="Releases" />
 * </CheckboxGroup>
 * ```
 *
 * See `CheckboxGroup.a11y.ts` for its accessibility contract.
 */
export declare const CheckboxGroup: import("react").ForwardRefExoticComponent<Omit<NativeProps<"fieldset">, "defaultValue" | "aria-invalid" | "aria-label" | "aria-labelledby" | "aria-required"> & {
  /** The group's visible name, read when focus enters the group. */
  legend: Label;
  /** Help text, read with each checkbox in the group (a fieldset's own description goes unread in NVDA). */
  description?: ReactNode;
  /** The group's error message; while set, every checkbox in it is `aria-invalid`. */
  error?: Label | false | null | undefined;
  /**
   * At least one option must be checked to submit. The value is the message shown, and read, when
   * none is: `required="Choose at least one topic."`. The library ships no wording of its own, so
   * the type asks for it. Never set `required` on the checkboxes themselves.
   */
  required?: string;
  /** Controlled: the checked options' values. Pair with `onValueChange`. */
  value?: readonly string[];
  /** Uncontrolled: the initially checked options' values. */
  defaultValue?: readonly string[];
  /** Called with the checked options' values on every change. */
  onValueChange?: (value: readonly string[]) => void;
  /** The `name` every checkbox submits under, unless it sets its own. */
  name?: string;
  /** The options: `<Checkbox value="news" label="News" />`, each with a unique `value`. */
  children: ReactNode;
  /** Use `error`; the checkboxes carry `aria-invalid`. */
  'aria-invalid'?: never;
  /** Use `required`, which is announced on the checkboxes' validation. */
  'aria-required'?: never;
  /** The `legend` names the group. */
  'aria-label'?: never;
  /** The `legend` names the group. */
  'aria-labelledby'?: never;
} & import("react").RefAttributes<HTMLFieldSetElement>>;
//#endregion
export {};