import { useEffect, useRef } from 'react';

/**
 * Runs `onReset` when the element's form is reset. A native `reset` restores the DOM (unchecks a
 * box, clears a value) but not React state, so a stateful control drifts from what assistive
 * technology announces, and a required CheckboxGroup stops blocking (L05 review). Listens for the
 * control's whole life; `enabled: false` turns it off (a Checkbox inside a group, whose group
 * resets for it).
 */
export function useFormReset(
  node: { readonly current: { readonly form: HTMLFormElement | null } | null },
  onReset: () => void,
  enabled = true,
): void {
  const latest = useRef(onReset);
  useEffect(() => {
    latest.current = onReset;
  });

  useEffect(() => {
    const form = node.current?.form;
    if (!enabled || !form) return;
    const controller = new AbortController();
    form.addEventListener(
      'reset',
      () => {
        latest.current();
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, [enabled, node]);
}
