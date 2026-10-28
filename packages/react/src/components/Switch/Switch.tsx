import { forwardRef, useRef, type ChangeEvent, type ReactNode } from 'react';
import { mergeIds } from '../../internal/dom/ids.js';
import type { NativeProps } from '../../internal/dom/native-props.js';
import { useComposedRefs } from '../../internal/dom/refs.js';
import { useControllableState } from '../../internal/state/useControllableState.js';
import { useFieldWiring } from '../../internal/field/useFieldWiring.js';
import { useFormReset } from '../../internal/field/useFormReset.js';
import { useNameCheck } from '../../internal/a11y/useNameCheck.js';
import type { CheckboxName } from '../Checkbox/Checkbox.js';

export type SwitchProps = Omit<
  NativeProps<'input'>,
  | 'type'
  | 'checked'
  | 'defaultChecked'
  | 'value'
  | 'size'
  | 'required'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-checked'
  | 'aria-invalid'
> & {
  /** Controlled on/off state. Pair with `onCheckedChange`. */
  checked?: boolean;
  /** Uncontrolled initial state. Defaults to `false` (off). */
  defaultChecked?: boolean;
  /** Called with the new state on every change. A switch's effect should be immediate. */
  onCheckedChange?: (checked: boolean) => void;
  /** Help text, read after the label. */
  description?: ReactNode;
  /** The value submitted when on (the native default is `"on"`). */
  value?: string;
  /** A switch has no mixed state. Use a Checkbox. */
  indeterminate?: never;
  /** A "required switch" is really a consent checkbox. Use a Checkbox. */
  required?: never;
  /** A switch takes effect at once, so there is nothing to validate on submit. */
  error?: never;
  /** The role announces the state. */
  'aria-checked'?: never;
  /** A switch is never invalid: it takes effect at once, so there is nothing to validate. */
  'aria-invalid'?: never;
} & CheckboxName;

/**
 * An on/off setting that takes effect at once: a native `<input type="checkbox" role="switch">`,
 * announced as a switch, toggled with Space or a click on its label. If the change only applies
 * when the user saves a form, use a Checkbox instead.
 * `className` and `style` go on the row (`.senui-switch`); every other native attribute, and the
 * ref, go on the input. See `Switch.a11y.ts` for its accessibility contract.
 *
 * ```tsx
 * <Switch label="Wi-Fi" checked={wifi} onCheckedChange={setWifi} />
 * ```
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    description,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    id,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  forwardedRef,
) {
  const parts = useFieldWiring({ id, description, required: false });
  const [checked, setChecked] = useControllableState({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
    name: { component: 'Switch', prop: 'checked' },
  });
  const node = useRef<HTMLInputElement | null>(null);
  const ref = useComposedRefs(forwardedRef, useComposedRefs(useNameCheck('Switch'), node));

  // A form reset turns the switch back in the DOM; bring the state back with it (L05 review).
  useFormReset(node, () => {
    setChecked(defaultChecked);
  });

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then Switch's. No
  // visible "On"/"Off" text: the role announces the state, and the thumb's position shows it
  // (L05 decision 10).
  return (
    <div className={className ? `senui-switch ${className}` : 'senui-switch'} style={style}>
      <input
        {...rest}
        ref={ref}
        id={parts.controlId}
        type="checkbox"
        role="switch"
        className="senui-switch__control"
        checked={checked}
        aria-describedby={mergeIds(ariaDescribedBy, parts.wiring.describedBy)}
        // A switch is never invalid (L05 decision 8). Explicit, so a custom validity set through
        // the ref isn't announced as invalid either (ADR-0013).
        aria-invalid={false}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          setChecked(event.currentTarget.checked);
        }}
      />
      {label !== undefined && (
        <label className="senui-switch__label" htmlFor={parts.controlId}>
          {label}
        </label>
      )}
      {parts.hasDescription && (
        <div className="senui-switch__description" id={parts.descriptionId}>
          {description}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
