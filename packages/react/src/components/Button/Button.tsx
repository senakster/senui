import { forwardRef, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import type { NativeProps } from '../../internal/native-props.js';
import { useComposedRefs } from '../../internal/refs.js';
import { useNameCheck } from '../../internal/useNameCheck.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * A button shows either a visible label (children) or, icon-only, an `icon` with exactly one of
 * `aria-label` / `aria-labelledby` (CONVENTIONS rule 3, L03 decision 6).
 */
type ButtonContent =
  | { icon?: never; children: ReactNode }
  | {
      /** The icon shown instead of a label. Mark the icon itself `aria-hidden`. */
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
    'aria-disabled': ariaDisabled,
    ...rest
  },
  forwardedRef,
) {
  const ref = useComposedRefs(forwardedRef, useNameCheck('Button'));
  // Loading never uses native `disabled`: that would drop focus mid-action (L03 decision 3).
  const unavailable = loading || ariaDisabled === true || ariaDisabled === 'true';

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (unavailable) {
      // Also stops a submit button submitting its form, including by Enter in a text field.
      event.preventDefault();
      return;
    }
    onClick?.(event);
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
      onClick={handleClick}
    >
      <span className={icon ? 'senui-button__icon' : 'senui-button__label'}>
        {icon ?? children}
      </span>
      {loading && <span className="senui-button__spinner" aria-hidden="true" />}
    </button>
  );
});

Button.displayName = 'Button';
