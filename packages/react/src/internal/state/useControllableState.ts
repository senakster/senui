import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { warnOnce } from '../dev/dev.js';

export interface UseControllableStateOptions<T> {
  /**
   * The controlled value. Anything other than `undefined` makes the component controlled, so
   * "controlled and empty" is `null`. A component whose value can really be `undefined` can't use
   * this hook as written.
   */
  value: T | undefined;
  /** The initial value when uncontrolled. Ignored when controlled, and after mount. */
  defaultValue: T;
  /** Called with every change, controlled or not. Not called when the value is unchanged. */
  onChange?: ((value: T) => void) | undefined;
  /** Names used in development warnings, e.g. `{ component: 'Switch', prop: 'checked' }`. */
  name: { component: string; prop: string };
  /** The component is intentionally read-only when controlled, so a missing `onChange` is fine. */
  readOnly?: boolean;
}

/**
 * State that a component's consumer may control (`value` + `onChange`) or leave to the component
 * (`defaultValue`). One hook, so every component behaves the same way (L02 decision 5):
 *
 * - Controlled: the returned value is always the prop; `setValue` only calls `onChange`. The hook
 *   can't see updates the owner hasn't rendered yet, so two updater calls in one handler both start
 *   from the rendered value, as with a native controlled input.
 * - Uncontrolled: the hook owns the value; `setValue` updates it and calls `onChange`. Updater
 *   calls chain: `setValue(n => n + 1)` twice adds two.
 * - `setValue` keeps its identity for the component's whole life.
 * - Development warnings: switching between controlled and uncontrolled, and a controlled value
 *   with no `onChange` (a frozen control), each warn once, as React does for native inputs.
 *
 * `T` must not be a function type: a function passed to `setValue` is treated as an updater.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  name,
  readOnly = false,
}: UseControllableStateOptions<T>): readonly [T, Dispatch<SetStateAction<T>>] {
  const controlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  // While controlled, keep the internal value in step with the prop, so that switching to
  // uncontrolled continues from the last value shown rather than jumping back to `defaultValue`.
  // Setting state during render to follow a prop is React's documented pattern for derived state.
  if (controlled && !Object.is(uncontrolled, value)) setUncontrolled(value);
  const current = controlled ? value : uncontrolled;

  // The latest render's view, for the stable setter. Updated during commit, never during render.
  const latest = useRef({ value: current, controlled, onChange });
  useInsertionEffect(() => {
    latest.current = { value: current, controlled, onChange };
  });

  const { component, prop } = name;
  const wasControlled = useRef(controlled);
  useEffect(() => {
    if (wasControlled.current === controlled) return;
    const [from, to] = controlled ? ['uncontrolled', 'controlled'] : ['controlled', 'uncontrolled'];
    warnOnce(
      `controllable:${component}.${prop}`,
      `${component} is changing from ${from} to ${to}. Use \`${prop}\` (controlled) or \`default${capitalize(prop)}\` (uncontrolled) for the component's whole life, not both.`,
    );
    wasControlled.current = controlled;
  }, [controlled, component, prop]);

  const frozen = controlled && !onChange && !readOnly;
  useEffect(() => {
    if (!frozen) return;
    warnOnce(
      `controllable-frozen:${component}.${prop}`,
      `${component} has \`${prop}\` but no \`on${capitalize(prop)}Change\`, so the user can't change it. Pass \`on${capitalize(prop)}Change\`, or use \`default${capitalize(prop)}\` to let the component own the value.`,
    );
  }, [frozen, component, prop]);

  const setValue = useCallback((action: SetStateAction<T>) => {
    const state = latest.current;
    const next =
      typeof action === 'function' ? (action as (previous: T) => T)(state.value) : action;
    if (Object.is(state.value, next)) return;
    if (!state.controlled) {
      // Record the pending value so a second call in the same handler builds on it. The next
      // commit overwrites it with what actually rendered.
      state.value = next;
      setUncontrolled(next);
    }
    state.onChange?.(next);
  }, []);

  return [current, setValue] as const;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
