import { forwardRef } from 'react';
import type { NativeProps } from '../../internal/native-props.js';
import { useComposedRefs } from '../../internal/refs.js';
import { useNameCheck } from '../../internal/useNameCheck.js';
import { useFormFieldControl, type FormFieldBinding } from '../../internal/useFormFieldControl.js';

/** Single-line text types. `number` is not one: it is a spin button, with its own role and keys. */
export type TextInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
export type TextInputSize = 'sm' | 'md' | 'lg';

/**
 * Where the name comes from (CONVENTIONS rule 3). Inside a FormField, the `field` binding: the
 * field's label names the input, and the field owns its id, `required` and invalid state, so the
 * input can't take a competing one (L04 decision 6). Standalone, exactly one of `aria-label` /
 * `aria-labelledby`.
 */
type TextInputName =
  | {
      /** The binding from `<FormField>{(field) => …}</FormField>`. */
      field: FormFieldBinding;
      id?: never;
      required?: never;
      'aria-label'?: never;
      'aria-labelledby'?: never;
      'aria-invalid'?: never;
    }
  | {
      field?: never;
      'aria-label': string;
      'aria-labelledby'?: never;
      /** Standalone only. Inside a FormField, pass `error` to the field instead. */
      'aria-invalid'?: boolean;
    }
  | {
      field?: never;
      'aria-labelledby': string;
      'aria-label'?: never;
      'aria-invalid'?: boolean;
    };

export type TextInputProps = Omit<
  NativeProps<'input'>,
  'type' | 'size' | 'aria-label' | 'aria-labelledby' | 'aria-invalid'
> & {
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
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    field,
    type = 'text',
    size = 'md',
    className,
    id,
    required,
    onInvalid,
    onChange,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  forwardedRef,
) {
  const { ref: controlRef, ...control } = useFormFieldControl(field, {
    id,
    required,
    onInvalid,
    onChange,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  });
  const ref = useComposedRefs(forwardedRef, useComposedRefs(useNameCheck('TextInput'), controlRef));

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then the ones TextInput
  // and its field control.
  return (
    <input
      {...rest}
      {...control}
      ref={ref}
      type={type}
      className={className ? `senui-text-input ${className}` : 'senui-text-input'}
      data-size={size}
    />
  );
});

TextInput.displayName = 'TextInput';
