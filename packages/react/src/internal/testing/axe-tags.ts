/**
 * The axe-core tags the unit layer runs (`axe.ts`): WCAG 2.2 A and AA, and best practice. Its own
 * module, free of test imports, so the docs generator can read which axe rules a component's
 * automated run includes, and so which WCAG criteria axe tests (L09 decision 5).
 */
export const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
  'best-practice',
] as const;
