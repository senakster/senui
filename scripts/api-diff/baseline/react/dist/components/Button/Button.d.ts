import { NativeProps } from "../../internal/dom/native-props.js";
import { ReactElement, ReactNode } from "react";
//#region src/components/Button/Button.d.ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a button. */
type Label = Exclude<ReactNode, null | undefined | boolean>;
/**
 * A button shows either a visible label (children) or, icon-only, an `icon` with exactly one of
 * `aria-label` / `aria-labelledby`. An empty string still type-checks; the development name check
 * warns about it.
 */
type ButtonContent =
/** A visible label, which names the button. */
{
  icon?: never;
  /** The visible label, which names the button. */
  children: Label;
} |
/** Icon-only, named by `aria-label`. */
{
  /** The icon shown instead of a label. Button hides it from assistive technology. */
  icon: ReactElement;
  children?: never;
  /** The button's name, since the icon has no text. */
  'aria-label': string;
  'aria-labelledby'?: never;
} |
/** Icon-only, named by visible text elsewhere on the page, through `aria-labelledby`. */
{
  icon: ReactElement;
  children?: never;
  /** The id of the element whose text names the button. */
  'aria-labelledby': string;
  'aria-label'?: never;
};
export type ButtonProps = NativeProps<'button'> & {
  /** Visual emphasis. Defaults to `'primary'`. */
  variant?: ButtonVariant;
  /** Defaults to `'md'`. Every size meets the 24×24 px target minimum. */
  size?: ButtonSize;
  /**
   * Shows a spinner and ignores activation, while keeping focus and width. The button stays
   * focusable (`aria-disabled`, not `disabled`), and announces nothing itself: announce the
   * outcome of the action instead. Takes precedence over `disabled`.
   */
  loading?: boolean;
  /**
   * Native `disabled` removes the button from the tab order. To keep it focusable while
   * unavailable (say, with a tooltip explaining why), pass `aria-disabled="true"` instead: Button
   * then ignores click activation (`onClick`, `onClickCapture`) and shows the disabled look.
   * Pointer handlers and native listeners on the ref are not suppressed.
   */
  disabled?: boolean;
  /**
   * Makes it a toggle button: announced as "toggle button, pressed" or "not pressed", and styled
   * as pressed when `true`. Keep it a boolean for the button's whole life.
   */
  'aria-pressed'?: boolean;
} & ButtonContent;
/**
 * A native `<button>`, `type="button"` by default. See `Button.a11y.ts` for its accessibility
 * contract.
 */
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
//#endregion
export {};