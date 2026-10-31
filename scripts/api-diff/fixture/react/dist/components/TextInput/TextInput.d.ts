import { NativeProps } from "../../internal/dom/native-props.js";
import { FormFieldBinding } from "../../internal/field/useFormFieldControl.js";
//#region src/components/TextInput/TextInput.d.ts
/** Single-line text types. `number` is not one: it is a spin button, with its own role and keys. */
export type TextInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
export type TextInputSize = 'sm' | 'md' | 'lg';
/**
 * Where the name comes from. Inside a FormField, the `field` binding: the field's label names the
 * input, and the field owns its id, `required` and invalid state, so the input can't take a
 * competing one. Standalone, exactly one of `aria-label` / `aria-labelledby`.
 */
type TextInputName =
/** Inside a FormField, which names the input and owns its id, `required` and invalid state. */
{
  /** The binding from `<FormField>{(field) => …}</FormField>`. */
  field: FormFieldBinding;
  id?: never;
  required?: never;
  'aria-label'?: never;
  'aria-labelledby'?: never;
  'aria-invalid'?: never;
} |
/** Standalone, named by `aria-label`. */
{
  field?: never;
  /** The input's name, when no FormField labels it. */
  'aria-label': string;
  'aria-labelledby'?: never;
  /** Standalone only. Inside a FormField, pass `error` to the field instead. */
  'aria-invalid'?: boolean;
} |
/** Standalone, named by visible text elsewhere on the page, through `aria-labelledby`. */
{
  field?: never;
  /** The id of the element whose text names the input. */
  'aria-labelledby': string;
  'aria-label'?: never;
  'aria-invalid'?: boolean;
};
export type TextInputProps = Omit<NativeProps<'input'>, 'type' | 'size' | 'aria-label' | 'aria-labelledby' | 'aria-invalid'> & {
  /** Defaults to `'text'`. */
  type?: TextInputType;
  /** Defaults to `'md'`, matching Button's heights. Every size meets the 24×24 px target minimum. */
  size?: TextInputSize;
} & TextInputName;
/**
 * A native single-line `<input>`. Use it inside a FormField, which labels and describes it:
 *
 * ```tsx
 * <FormField label="Email" error={errors.email}>
 *   {(field) => <TextInput field={field} type="email" autoComplete="email" />}
 * </FormField>
 * ```
 *
 * Standalone (a search box with a visible button, say), name it with `aria-label` or
 * `aria-labelledby`. `value` / `defaultValue` / `onChange`, `autoComplete` and every other native
 * attribute pass through; paste is never blocked. See `TextInput.a11y.ts` for its accessibility
 * contract.
 */
export declare const TextInput: import("react").ForwardRefExoticComponent<TextInputProps & import("react").RefAttributes<HTMLInputElement>>;
//#endregion
export {};