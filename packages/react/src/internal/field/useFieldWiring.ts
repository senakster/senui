import { useId, useState, type ReactNode } from 'react';
import { mergeIds } from '../dom/ids.js';
import type { FieldWiring } from './useFormFieldControl.js';

/** Booleans render nothing, so `true` (cast past a type) is no message either. */
export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && typeof node !== 'boolean' && node !== '';
}

export interface FieldWiringOptions {
  /** The control's id; generated when omitted. */
  id?: string | undefined;
  description?: ReactNode;
  error?: ReactNode;
  required: boolean;
}

export interface FieldParts {
  controlId: string;
  descriptionId: string;
  errorId: string;
  nativeErrorId: string;
  hasDescription: boolean;
  hasError: boolean;
  /** The browser's validation message, shown when there is no `error` prop. */
  nativeMessage: string | null;
  showNative: boolean;
  /** What the control reads through `useFormFieldControl` (via a FormField binding, or directly). */
  wiring: FieldWiring;
}

/**
 * The ids and error state that tie a control to its label, description and error message (L04
 * decisions 1 and 5; L05's `useFieldWiring`). FormField, Checkbox, CheckboxGroup and Switch all
 * render their parts from this, so `aria-describedby` and `aria-invalid` are computed in one place:
 *
 * - `aria-describedby`: the description, then the `error` message while there is one, or the
 *   browser's message while there is no `error`.
 * - `aria-invalid="true"` while either message shows, `"false"` otherwise: never absent, or the
 *   browser announces native invalidity before a submit attempt (ADR-0013).
 */
export function useFieldWiring({
  id,
  description,
  error,
  required,
}: FieldWiringOptions): FieldParts {
  const generatedId = useId();
  const controlId = id ?? `${generatedId}-control`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;
  const nativeErrorId = `${generatedId}-native-error`;
  const [nativeMessage, setNativeMessage] = useState<string | null>(null);

  const hasDescription = hasContent(description);
  const hasError = hasContent(error);
  // The `error` prop wins; a native message shows only without one.
  const showNative = !hasError && nativeMessage !== null;

  return {
    controlId,
    descriptionId,
    errorId,
    nativeErrorId,
    hasDescription,
    hasError,
    nativeMessage,
    showNative,
    wiring: {
      id: controlId,
      describedBy: mergeIds(
        hasDescription && descriptionId,
        hasError && errorId,
        showNative && nativeErrorId,
      ),
      invalid: hasError || showNative,
      required,
      nativeInvalid: nativeMessage !== null,
      reportNative: setNativeMessage,
    },
  };
}
