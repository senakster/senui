import { warnOnce } from './dev.js';

/**
 * Warns, in development only and once per page load, that a prop is deprecated. Call it in the
 * minor release before the prop is removed, when the deprecated prop is actually passed (principle
 * 7: a removal is a major version, preceded by a deprecation release with a dev warning).
 *
 * @param component The component's public name, e.g. `'Button'`.
 * @param prop The deprecated prop, e.g. `'kind'`.
 * @param migration What to use instead, written for the consumer: `'Use \`variant\` instead.'`
 */
export function deprecate(component: string, prop: string, migration: string): void {
  warnOnce(
    `deprecate:${component}.${prop}`,
    `${component}: \`${prop}\` is deprecated and will be removed in the next major version. ${migration}`,
  );
}
