import { NativeProps } from "../../internal/dom/native-props.js";
import { CheckboxName } from "../Checkbox/Checkbox.js";
import { ReactNode } from "react";
//#region src/components/Switch/Switch.d.ts
export type SwitchProps = Omit<NativeProps<'input'>, 'type' | 'checked' | 'defaultChecked' | 'value' | 'size' | 'required' | 'aria-label' | 'aria-labelledby' | 'aria-checked' | 'aria-invalid'> & {
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
export declare const Switch: import("react").ForwardRefExoticComponent<SwitchProps & import("react").RefAttributes<HTMLInputElement>>;
//#endregion