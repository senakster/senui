import { useCallback, type Ref, type RefCallback } from 'react';

/**
 * One callback ref that feeds two: the consumer's forwarded ref and the component's own. Returns a
 * new callback only when either ref changes, so React doesn't detach and reattach on every render.
 */
export function useComposedRefs<T>(
  forwarded: Ref<T> | undefined,
  own: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      setRef(forwarded, node);
      setRef(own, node);
    },
    [forwarded, own],
  );
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}
