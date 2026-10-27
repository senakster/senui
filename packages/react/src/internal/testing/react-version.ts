import { expect, inject } from 'vitest';

/**
 * L08 decision 9a: when `SENUI_EXPECT_REACT` is set (the React 18.3 job), the run must have resolved
 * that React, so a failed swap can't pass as a run against the lowest supported version. Pass each
 * package's `version` export, by name:
 *
 * ```ts
 * expectReactVersion({ react: version, 'react-dom': domVersion });
 * ```
 */
export function expectReactVersion(versions: Record<string, string>): void {
  const expected = inject('expectReact');
  if (expected === '') return;
  expect(versions).toEqual(
    Object.fromEntries(Object.keys(versions).map((name) => [name, expected])),
  );
}
