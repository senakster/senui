import { forwardRef, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import type { NativeProps } from '../../internal/dom/native-props.js';
import { useComposedRefs } from '../../internal/dom/refs.js';
import { useNameCheck } from '../../internal/a11y/useNameCheck.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Something to show: `undefined`, `null` and booleans render nothing, so they can't name a button. */
type Label = Exclude<ReactNode, null | undefined | boolean>;

/**
 * A button shows either a visible label (children) or, icon-only, an `icon` with exactly one of
 * `aria-label` / `aria-labelledby` (CONVENTIONS rule 3, L03 decision 6). An empty string still
 * type-checks; the development name check warns about it.
 */
type ButtonContent =
  | { icon?: never; children: Label }
  | {
      /** The icon shown instead of a label. Button hides it from assistive technology. */
      icon: ReactElement;
      children?: never;
      'aria-label': string;
      'aria-labelledby'?: never;
    }
  | {
      icon: ReactElement;
      children?: never;
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
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    className,
    type = 'button',
    disabled = false,
    onClick,
    onClickCapture,
    'aria-disabled': ariaDisabled,
    ...rest
  },
  forwardedRef,
) {
  const ref = useComposedRefs(forwardedRef, useNameCheck('Button'));
  // Loading never uses native `disabled`: that would drop focus mid-action (L03 decision 3).
  const unavailable = loading || ariaDisabled === true || ariaDisabled === 'true';

  // Both click phases are guarded, so no consumer click handler runs while unavailable.
  function guard(handler: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      if (unavailable) {
        // Also stops a submit button submitting its form, including by Enter in a text field.
        event.preventDefault();
        return;
      }
      handler?.(event);
    };
  }

  // Root ownership (CONVENTIONS rule 2): the consumer's attributes first, then the ones Button
  // controls, so a stray `data-variant` or `className` can't override them.
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={className ? `senui-button ${className}` : 'senui-button'}
      data-variant={variant}
      data-size={size}
      data-state={loading ? 'loading' : undefined}
      disabled={disabled && !loading}
      aria-disabled={unavailable || undefined}
      onClick={guard(onClick)}
      onClickCapture={guard(onClickCapture)}
    >
      {icon ? (
        // The name comes from the required aria-label / aria-labelledby, never from the icon.
        <span className="senui-button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : (
        <span className="senui-button__label">{children}</span>
      )}
      {loading && <span className="senui-button__spinner" aria-hidden="true" />}
    </button>
  );
});

Button.displayName = 'Button';
