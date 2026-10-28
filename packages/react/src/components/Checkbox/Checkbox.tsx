import {
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { DEV, warnOnce } from '../../internal/dev/dev.js';
import { FieldError } from '../../internal/field/FieldError.js';
import { mergeIds } from '../../internal/dom/ids.js';
import type { NativeProps } from '../../internal/dom/native-props.js';
import { useComposedRefs } from '../../internal/dom/refs.js';
import { useControllableState } from '../../internal/state/useControllableState.js';
import { useFieldWiring } from '../../internal/field/useFieldWiring.js';
import { createBinding, useFormFieldControl } from '../../internal/field/useFormFieldControl.js';
import { useFormReset } from '../../internal/field/useFormReset.js';
import { useNameCheck } from '../../internal/a11y/useNameCheck.js';
import { CheckboxGroupContext } from '../CheckboxGroup/context.js';

/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a control. */
type Label = Exclude<ReactNode, null | undefined | boolean>;

/**
 * Where the name comes from: a visible `label`, placed after the box, or exactly one of
 * `aria-label` / `aria-labelledby` (a select-all box in a table header, say, with no visible text
 * of its own).
 */
export type CheckboxName =
  /** Named by a visible `label`. */
  | {
      /** The visible label, placed after the control. It names the control. */
      label: Label;
      'aria-label'?: never;
      'aria-labelledby'?: never;
    }
  /** Named by `aria-label`, with no visible text of its own. */
  | {
      label?: never;
      /** The control's name, when it shows no text of its own. */
      'aria-label': string;
      'aria-labelledby'?: never;
    }
  /** Named by visible text elsewhere on the page, through `aria-labelledby`. */
  | {
      label?: never;
      /** The id of the element whose text names the control. */
      'aria-labelledby': string;
      'aria-label'?: never;
    };

export type CheckboxProps = Omit<
  NativeProps<'input'>,
  | 'type'
  | 'checked'
  | 'defaultChecked'
  | 'value'
  | 'size'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-checked'
  | 'aria-invalid'
> & {
  /** Controlled checked state. Pair with `onCheckedChange`. */
  checked?: boolean;
  /** Uncontrolled initial state. Defaults to `false`. */
  defaultChecked?: boolean;
  /** Called with the new checked state on every change. */
  onCheckedChange?: (checked: boolean) => void;
  /** Help text, read after the label. */
  description?: ReactNode;
  /** The error message; while set, the box is `aria-invalid`. Not `true`: an error needs words. */
  error?: Label | false | null | undefined;
  /** The value submitted when checked (the native default is `"on"`). In a CheckboxGroup, it identifies the option and is required. */
  value?: string;
  /**
   * Must be checked to submit, like a consent box. Inside a CheckboxGroup it is ignored: pass
   * `required` to the group.
   */
  required?: boolean;
  /** Use `indeterminate`; the native property carries the mixed state. */
  'aria-checked'?: never;
  /** Use `error`. */
  'aria-invalid'?: never;
} & CheckboxMixed &
  CheckboxName;

/**
 * The mixed state is controlled only: with `indeterminate`, the consumer owns `checked` and clears
 * `indeterminate` in `onCheckedChange`. Without that, a box could never leave the mixed state,
 * because Checkbox re-applies the prop on every render.
 */
type CheckboxMixed =
  /** No mixed state: checked or not, controlled or uncontrolled. */
  | { indeterminate?: false }
  /** Can show the mixed state: `indeterminate`, with `checked` and `onCheckedChange` controlled. */
  | {
      /**
       * Shows the mixed state ("partially checked") from the native property. A click clears it
       * in the browser and toggles `checked`; clear the prop in `onCheckedChange`.
       */
      indeterminate: boolean;
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    };

// useLayoutEffect warns during server rendering; the effect only touches the DOM, so on the server
// it is simply skipped.
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/**
 * A native `<input type="checkbox">` with its own label, description and error. `className`
 * and `style` go on the row (`.senui-checkbox`); every other native attribute, and the ref, go on
 * the input. See `Checkbox.a11y.ts` for its accessibility contract.
 *
 * ```tsx
 * <Checkbox label="Email me about new releases" defaultChecked />
 * <Checkbox aria-label="Select all rows" checked={all} indeterminate={some} onCheckedChange={selectAll} />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    error,
    required = false,
    indeterminate = false,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    onInvalid,
    value,
    name,
    id,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  forwardedRef,
) {
  const group = useContext(CheckboxGroupContext);
  const inGroup = group !== null && value !== undefined;
  const parts = useFieldWiring({ id, description, error, required: required && !group });

  const [checked, setChecked] = useControllableState({
    value: inGroup ? group.value.includes(value) : checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
    name: { component: 'Checkbox', prop: 'checked' },
    readOnly: inGroup,
  });

  // In a group, the group owns the error and the native "choose at least one" message: the box is
  // invalid with the group and is described by the group's description and error, so they are
  // heard whichever box takes focus (L05 decision 13, changed after Emil's NVDA run: NVDA never
  // reads a fieldset's description).
  const wiring = group
    ? {
        ...parts.wiring,
        describedBy: mergeIds(
          group.describedBy,
          parts.hasDescription && parts.descriptionId,
          parts.hasError && parts.errorId,
        ),
        invalid: group.invalid || parts.hasError,
        required: false,
        nativeInvalid: false,
        reportNative: group.reportNative,
      }
    : parts.wiring;

  const { ref: controlRef, ...control } = useFormFieldControl(createBinding(wiring), {
    onInvalid,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      const next = event.currentTarget.checked;
      if (inGroup) group.toggle(value, next);
      setChecked(next);
    },
    'aria-describedby': ariaDescribedBy,
  });

  const node = useRef<HTMLInputElement | null>(null);
  const ref = useComposedRefs(
    forwardedRef,
    useComposedRefs(useComposedRefs(useNameCheck('Checkbox'), controlRef), node),
  );

  // The mixed state exists only as a DOM property. No dependency array: a click clears the
  // property in the browser, and the prop must win again on the next render (L05 decision 7).
  useIsomorphicLayoutEffect(() => {
    if (node.current) node.current.indeterminate = indeterminate;
  });

  // A form reset unchecks the box in the DOM; bring the state back with it. In a group, the group
  // resets its value instead.
  useFormReset(
    node,
    () => {
      setChecked(defaultChecked);
    },
    !group,
  );

  // Props a group overrides: the group's `value`, `defaultValue` and `required` decide them.
  const ignoredInGroup = group
    ? [
        checkedProp !== undefined && 'checked',
        defaultChecked && 'defaultChecked',
        required && 'required',
      ].filter(Boolean)
    : [];
  useEffect(() => {
    if (DEV && ignoredInGroup.length > 0) {
      warnOnce(
        'checkbox-group-ignored',
        `A Checkbox inside a CheckboxGroup ignores \`${ignoredInGroup.join('`, `')}\`: the group decides them. Use the group's \`value\` / \`defaultValue\`, and put \`required\` on the group.`,
      );
    }
  });

  useEffect(() => {
    if (DEV && group && value === undefined) {
      warnOnce(
        'checkbox-group-value',
        'A Checkbox inside a CheckboxGroup has no `value`, so the group can’t tell which option it is. Give each Checkbox a unique `value`.',
      );
    }
  }, [group, value]);

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then Checkbox's.
  return (
    <div className={className ? `senui-checkbox ${className}` : 'senui-checkbox'} style={style}>
      <input
        {...rest}
        {...control}
        ref={ref}
        type="checkbox"
        className="senui-checkbox__control"
        name={name ?? group?.name}
        value={value}
        checked={checked}
        data-indeterminate={indeterminate || undefined}
      />
      {label !== undefined && (
        <label className="senui-checkbox__label" htmlFor={parts.controlId}>
          {label}
          {wiring.required && (
            <span className="senui-checkbox__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {parts.hasDescription && (
        <div className="senui-checkbox__description" id={parts.descriptionId}>
          {description}
        </div>
      )}
      {parts.hasError && (
        <div className="senui-checkbox__error" id={parts.errorId}>
          <FieldError block="senui-checkbox">{error}</FieldError>
        </div>
      )}
      {parts.showNative && !group && (
        <div className="senui-checkbox__error" id={parts.nativeErrorId}>
          <FieldError block="senui-checkbox">{parts.nativeMessage}</FieldError>
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
