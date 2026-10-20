import { forwardRef, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DEV, warnOnce } from '../../internal/dev.js';
import { FieldError } from '../../internal/FieldError.js';
import { mergeIds } from '../../internal/ids.js';
import type { NativeProps } from '../../internal/native-props.js';
import { useComposedRefs } from '../../internal/refs.js';
import { useControllableState } from '../../internal/useControllableState.js';
import { hasContent, useFieldWiring } from '../../internal/useFieldWiring.js';
import { useFormReset } from '../../internal/useFormReset.js';
import { CheckboxGroupContext, type CheckboxGroupState } from './context.js';

/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a group. */
type Label = Exclude<ReactNode, null | undefined | boolean>;

const NONE: readonly string[] = [];

export type CheckboxGroupProps = Omit<
  NativeProps<'fieldset'>,
  'defaultValue' | 'aria-invalid' | 'aria-required' | 'aria-label' | 'aria-labelledby'
> & {
  /** The group's visible name, read when focus enters the group (L05 decision 11). */
  legend: Label;
  /** Help text, read with each checkbox in the group (a fieldset's own description goes unread in NVDA). */
  description?: ReactNode;
  /** The group's error message; while set, every checkbox in it is `aria-invalid`. */
  error?: Label | false | null | undefined;
  /**
   * At least one option must be checked to submit. The value is the message shown, and read, when
   * none is: `required="Choose at least one topic."`. The library ships no wording of its own, so
   * the type asks for it. Never set `required` on the checkboxes themselves (L05 decision 12).
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
 * value array (L05). The group's error is described on the fieldset only, so entering the group
 * reads legend and error once; each checkbox is `aria-invalid` while it shows (L05 decision 13).
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
export const CheckboxGroup = forwardRef<HTMLFieldSetElement, CheckboxGroupProps>(
  function CheckboxGroup(
    {
      legend,
      description,
      error,
      required,
      value: valueProp,
      defaultValue = NONE,
      onValueChange,
      name,
      children,
      className,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    forwardedRef,
  ) {
    const isRequired = required !== undefined && hasContent(required);
    const parts = useFieldWiring({ description, error, required: isRequired });
    const reportNative = parts.wiring.reportNative;
    const [value, setValue] = useControllableState<readonly string[]>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
      name: { component: 'CheckboxGroup', prop: 'value' },
    });

    const toggle = useCallback(
      (option: string, checked: boolean) => {
        setValue((current) =>
          checked
            ? current.includes(option)
              ? current
              : [...current, option]
            : current.filter((item) => item !== option),
        );
      },
      [setValue],
    );

    const root = useRef<HTMLFieldSetElement | null>(null);
    const ref = useComposedRefs(forwardedRef, root);

    // "Choose at least one": a custom validity message on the first *enabled* option while nothing
    // is checked, so the browser blocks the submit, marks the box :user-invalid and fires
    // `invalid` there, which reports the message back to this group (L05: group required). A
    // disabled control is barred from validation and would never block. After every render, not
    // only on value changes: options can mount late, reorder or become disabled (L05 review).
    useEffect(() => {
      const options = root.current?.querySelectorAll<HTMLInputElement>('.senui-checkbox__control');
      if (!options) return;
      const message = isRequired && value.length === 0 ? required : '';
      const host = Array.from(options).find((option) => !option.disabled);
      options.forEach((option) => {
        option.setCustomValidity(option === host ? message : '');
      });
      if (!message) reportNative(null);
    });

    // A form reset unchecks the boxes in the DOM; bring the value back with them, and clear a
    // shown message (L05 review: otherwise a required group lets an empty submit through).
    useFormReset(root, () => {
      setValue(defaultValue);
      reportNative(null);
    });

    useEffect(() => {
      if (DEV && required !== undefined && !isRequired) {
        warnOnce(
          'checkbox-group-required-empty',
          'CheckboxGroup has an empty `required` message, so the group is not required. Pass the message to show when nothing is checked (a missing translation is the usual cause).',
        );
      }
    }, [required, isRequired]);

    // The description and error describe every checkbox, not the fieldset: NVDA reads a group's
    // name on entry but never its description, so on the fieldset neither was heard (Emil's NVDA
    // run, 2026-10-20; L05 open question 2 and review).
    const describedBy = mergeIds(
      parts.hasDescription && parts.descriptionId,
      parts.hasError && parts.errorId,
      parts.showNative && parts.nativeErrorId,
    );
    const state = useMemo<CheckboxGroupState>(
      () => ({
        value,
        toggle,
        name,
        invalid: parts.wiring.invalid,
        describedBy,
        reportNative,
      }),
      [value, toggle, name, parts.wiring.invalid, describedBy, reportNative],
    );

    // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then the group's.
    return (
      <fieldset
        {...rest}
        ref={ref}
        className={className ? `senui-checkbox-group ${className}` : 'senui-checkbox-group'}
        aria-describedby={ariaDescribedBy}
      >
        <legend className="senui-checkbox-group__legend">
          {legend}
          {isRequired && (
            <span className="senui-checkbox-group__required" aria-hidden="true">
              *
            </span>
          )}
        </legend>
        {parts.hasDescription && (
          <div className="senui-checkbox-group__description" id={parts.descriptionId}>
            {description}
          </div>
        )}
        <div className="senui-checkbox-group__options">
          <CheckboxGroupContext.Provider value={state}>{children}</CheckboxGroupContext.Provider>
        </div>
        {parts.hasError && (
          <div className="senui-checkbox-group__error" id={parts.errorId}>
            <FieldError block="senui-checkbox-group">{error}</FieldError>
          </div>
        )}
        {parts.showNative && (
          <div className="senui-checkbox-group__error" id={parts.nativeErrorId}>
            <FieldError block="senui-checkbox-group">{parts.nativeMessage}</FieldError>
          </div>
        )}
      </fieldset>
    );
  },
);

CheckboxGroup.displayName = 'CheckboxGroup';
