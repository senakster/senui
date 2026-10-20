import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefCallback,
  type SyntheticEvent,
} from 'react';
import { mergeIds } from './ids.js';
import { focusFirstInvalidOnSubmit } from './focusFirstInvalid.js';

declare const sealed: unique symbol;

/**
 * What FormField hands its control: the ids and state that connect the control to the field's
 * label, description and error. It is sealed, so only FormField can make one, and a control given
 * one is named by the field's label (CONVENTIONS rule 3):
 *
 * ```tsx
 * <FormField label="Email">{(field) => <TextInput field={field} type="email" />}</FormField>
 * ```
 */
export interface FormFieldBinding {
  readonly [sealed]: 'FormFieldBinding';
}

/** What a binding carries. Internal: controls read it through `useFormFieldControl`. */
export interface FieldWiring {
  /** The control's id; the label's `for` points at it. */
  readonly id: string;
  /** The description id, plus the error id while there is an error (L04 decision 1). */
  readonly describedBy: string | undefined;
  /** An `error` prop or a native constraint error is showing. */
  readonly invalid: boolean;
  readonly required: boolean;
  /** Whether FormField is showing a native constraint error. */
  readonly nativeInvalid: boolean;
  /** Shows the browser's validation message in the field's error node, or clears it (`null`). */
  readonly reportNative: (message: string | null) => void;
}

export function createBinding(wiring: FieldWiring): FormFieldBinding {
  return wiring as unknown as FormFieldBinding;
}

function readBinding(binding: FormFieldBinding): FieldWiring {
  return binding as unknown as FieldWiring;
}

type FieldElement = HTMLInputElement;

export interface ControlProps {
  id?: string | undefined;
  required?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  onInvalid?: ((event: SyntheticEvent<FieldElement>) => void) | undefined;
  onChange?: ((event: ChangeEvent<FieldElement>) => void) | undefined;
}

/**
 * The attributes and handlers a form control renders, from its FormField binding (or, standalone,
 * from its own props). Every senui form control uses this, so the wiring lives in one place
 * (L04 decision 6; Checkbox and Switch reuse it in L05).
 *
 * Native constraint errors (`required`, `type="email"`, `pattern`…) reach assistive technology
 * the same moment they show (CONVENTIONS rule 6 styles `[aria-invalid="true"]` only):
 *
 * - The browser fires `invalid` on submit. The control sets `aria-invalid`, and inside a FormField
 *   the browser's message appears in the field's error node, replacing the browser's bubble, and
 *   the first invalid field takes focus. A `checkValidity()` call on a field the user hasn't
 *   touched is ignored: the browser marks a field as touched (`:user-invalid`) before it fires
 *   `invalid` for a submit.
 * - The error stays until the value is valid, updating its message as the value changes, whether
 *   the user or code changed it.
 * - A form reset clears it.
 *
 * Compose the returned `ref` into the control's ref: the checks above need the element.
 */
export function useFormFieldControl(
  binding: FormFieldBinding | undefined,
  props: ControlProps,
): ControlProps & { ref: RefCallback<FieldElement> } {
  const wiring = binding ? readBinding(binding) : undefined;
  // Standalone, the control tracks its own native error; there is no error node to show it in.
  const [ownNativeMessage, setOwnNativeMessage] = useState<string | null>(null);
  const nativeInvalid = wiring ? wiring.nativeInvalid : ownNativeMessage !== null;
  // A state setter either way (FormField's or the control's own), so it is stable.
  const report = wiring ? wiring.reportNative : setOwnNativeMessage;
  const node = useRef<FieldElement | null>(null);
  const ref = useCallback((element: FieldElement | null) => {
    node.current = element;
  }, []);

  // While a native error shows, re-check after every render: a value set from code (a controlled
  // value, an autofill helper) fires no change event, and the error must not outlive it. Setting
  // the same message again is a no-op, so this settles after one pass.
  useEffect(() => {
    const control = node.current;
    if (!nativeInvalid || !control) return;
    report(control.validity.valid ? null : control.validationMessage);
  });

  // A form reset clears the error. One listener while an error shows, removed with it.
  useEffect(() => {
    const form = node.current?.form;
    if (!nativeInvalid || !form) return;
    const controller = new AbortController();
    form.addEventListener(
      'reset',
      () => {
        report(null);
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, [nativeInvalid, report]);

  function onInvalid(event: SyntheticEvent<FieldElement>) {
    props.onInvalid?.(event);
    const control = event.currentTarget;
    if (event.defaultPrevented || !touched(control)) return;
    report(control.validationMessage);
    if (wiring) {
      // FormField shows the message, so the browser's bubble would say it twice. Cancelling it also
      // cancels the browser's own focus move, so focus the first invalid field here, once React has
      // rendered its error. That may be an earlier field invalid only through its `error` prop,
      // which never gets an `invalid` event; every handler in one submit picks the same field.
      event.preventDefault();
      const form = control.form;
      queueMicrotask(() => {
        if (form) focusFirstInvalidOnSubmit(form);
        else control.focus();
      });
    }
  }

  function onChange(event: ChangeEvent<FieldElement>) {
    props.onChange?.(event);
    if (!nativeInvalid) return;
    const control = event.currentTarget;
    report(control.validity.valid ? null : control.validationMessage);
  }

  return {
    id: wiring?.id ?? props.id,
    required: wiring?.required ?? props.required,
    'aria-describedby': mergeIds(props['aria-describedby'], wiring?.describedBy),
    // Always "true" or "false", never absent (ADR-0013): with no attribute, browsers announce a
    // control's native invalidity (a pattern mismatch, a custom validity message, an unchecked
    // required checkbox) from page load, before the user has done anything.
    'aria-invalid': (wiring?.invalid ?? false) || nativeInvalid || props['aria-invalid'] === true,
    onInvalid,
    onChange,
    ref,
  };
}

/**
 * Whether the user has interacted with the control or tried to submit its form. Browsers without
 * `:user-invalid` (before Baseline 2023) count every `invalid` event.
 */
function touched(control: FieldElement): boolean {
  try {
    return control.matches(':user-invalid');
  } catch {
    return true;
  }
}
