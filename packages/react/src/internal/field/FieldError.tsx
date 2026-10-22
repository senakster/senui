import type { ReactNode } from 'react';

/**
 * An error message: the icon, then the message in one element, so a message with markup stays one
 * run of text. `block` is the component's class (`senui-form-field`, `senui-checkbox`…); each
 * component styles its own `__error-*` parts, so its stylesheet stands alone.
 */
export function FieldError({ block, children }: { block: string; children: ReactNode }) {
  return (
    <>
      <ErrorIcon block={block} />
      <span className={`${block}__error-text`}>{children}</span>
    </>
  );
}

/** Marks the message as an error by shape, not colour alone (WCAG 1.4.1). Decorative: the text says it. */
function ErrorIcon({ block }: { block: string }) {
  return (
    <svg
      className={`${block}__error-icon`}
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
    >
      <circle className={`${block}__error-icon-disc`} cx="8" cy="8" r="7" />
      <path
        className={`${block}__error-icon-mark`}
        d="M8 4.5v4M8 11.25v.5"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
