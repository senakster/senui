import { useCallback, type RefCallback } from 'react';
import { DEV, warnOnce } from './dev.js';

/**
 * A development check for the accessible-name cases the type can't catch (CONVENTIONS rule 3): an
 * empty `aria-label`, and an element with no text, `aria-label` or `aria-labelledby` (an icon
 * passed as children without `iconOnly`). Runs when the element mounts. Compose the returned ref
 * with the forwarded one:
 *
 * ```tsx
 * const ref = useComposedRefs(forwardedRef, useNameCheck('Button'));
 * ```
 */
export function useNameCheck(component: string): RefCallback<HTMLElement> {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!DEV || !node) return;
      const label = node.getAttribute('aria-label');
      if (label?.trim() === '') {
        warnOnce(
          `name-empty:${component}`,
          `${component} has an empty \`aria-label\`, so assistive technology announces it with no name. Pass a label, or remove the attribute and use visible text.`,
        );
      } else if (
        label === null &&
        !node.hasAttribute('aria-labelledby') &&
        node.textContent.trim() === ''
      ) {
        warnOnce(
          `name-missing:${component}`,
          `${component} has no accessible name: no text content, \`aria-label\` or \`aria-labelledby\`. For an icon-only ${component}, pass \`iconOnly\` and \`aria-label\`.`,
        );
      }
    },
    [component],
  );
}
