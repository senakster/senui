/**
 * The composed stories whose controls are enabled, as `[name, Story]` entries for `test.each`. A
 * story that disables its controls (`parameters.controls.disable`, used for fixed grids and whole
 * forms) is left out:
 *
 * ```tsx
 * test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
 *   render(<Story variant="danger" />);
 * });
 * ```
 */
export function withControls<S extends { parameters?: unknown }>(
  composed: Record<string, S>,
): [string, S][] {
  return Object.entries(composed).filter(([, story]) => {
    const parameters = story.parameters as { controls?: { disable?: boolean } } | undefined;
    return parameters?.controls?.disable !== true;
  });
}
