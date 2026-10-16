/**
 * Joins id references for `aria-describedby` / `aria-labelledby`, so a consumer's ids and the ones
 * a component generates both survive (CONVENTIONS rule 10). Drops empty values and duplicates;
 * returns `undefined` when nothing is left, so the attribute isn't rendered empty.
 *
 * ```tsx
 * aria-describedby={mergeIds(props['aria-describedby'], error ? errorId : undefined)}
 * ```
 */
export function mergeIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const tokens = ids.flatMap((id) => (id ? id.split(/\s+/) : [])).filter((id) => id !== '');
  return tokens.length === 0 ? undefined : [...new Set(tokens)].join(' ');
}
