import { NativeProps } from "../../internal/dom/native-props.js";
import { ReactNode } from "react";
//#region src/components/Checkbox/Checkbox.d.ts
/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a control. */
type Label = Exclude<ReactNode, null | undefined | boolean>;
/**
 * Where the name comes from: a visible `label`, placed after the box, or exactly one of
 * `aria-label` / `aria-labelledby` (a select-all box in a table header, say, with no visible text
 * of its own).
 */
export type CheckboxName =
/** Named by a visible `label`. */
{
  /** The visible label, placed after the control. It names the control. */
  label: Label;
  'aria-label'?: never;
  'aria-labelledby'?: never;
} |
/** Named by `aria-label`, with no visible text of its own. */
{
  label?: never;
  /** The control's name, when it shows no text of its own. */
  'aria-label': string;
  'aria-labelledby'?: never;
} |
/** Named by visible text elsewhere on the page, through `aria-labelledby`. */
{
  label?: never;
  /** The id of the element whose text names the control. */
  'aria-labelledby': string;
  'aria-label'?: never;
};
export type CheckboxProps = Omit<NativeProps<'input'>, 'type' | 'checked' | 'defaultChecked' | 'value' | 'size' | 'aria-label' | 'aria-labelledby' | 'aria-checked' | 'aria-invalid'> & {
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
} & CheckboxMixed & CheckboxName;
/**
 * The mixed state is controlled only: with `indeterminate`, the consumer owns `checked` and clears
 * `indeterminate` in `onCheckedChange`. Without that, a box could never leave the mixed state,
 * because Checkbox re-applies the prop on every render.
 */
type CheckboxMixed =
/** No mixed state: checked or not, controlled or uncontrolled. */
{
  indeterminate?: false;
} |
/** Can show the mixed state: `indeterminate`, with `checked` and `onCheckedChange` controlled. */
{
  /**
   * Shows the mixed state ("partially checked") from the native property. A click clears it
   * in the browser and toggles `checked`; clear the prop in `onCheckedChange`.
   */
  indeterminate: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
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
export declare const Checkbox: import("react").ForwardRefExoticComponent<CheckboxProps & import("react").RefAttributes<HTMLInputElement>>;
//#endregion
export {};