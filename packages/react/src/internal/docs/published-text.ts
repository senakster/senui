/**
 * Rules for text that is published verbatim: every string in an a11y contract and a `.docs.ts`
 * reaches the docs pages, `components.json` and `llms.txt` (L09 decision 8). Readers can't follow a
 * reference to the project's private plans or review history, and the renderers support inline
 * code only.
 */
const PRIVATE: readonly (readonly [RegExp, string])[] = [
  [/\bL\d{2}\b/, 'a private module reference (cite a public ADR-NNNN instead)'],
  [/\bscope decision\b/i, 'a private scope decision'],
  [/\breview\b/i, 'a review note (review history belongs in the implementation log)'],
  [/\bEmil\b/, "a person's name"],
];

/** Markdown beyond inline code: emphasis, links, headings, list items. */
const MARKDOWN = /\*\*|__|\[[^\]]*\]\(|^#|^\s*[-*] /m;

/** Accessibility claims live in the contract only; usage prose that makes them would drift. */
const CLAIMS =
  /\b(accessible|accessibility|compliant|compliance|WCAG|screen readers?|announces?)\b/i;

/** Text outside inline code spans, which may hold any characters (`.senui-button__label`). */
const prose = (text: string) => text.replace(/`[^`]*`/g, '');

/**
 * Problems with one published string. `allowClaims: false` also rejects accessibility claims, for
 * usage prose (`summary`, `description`).
 */
export function publishedTextErrors(
  where: string,
  text: string,
  { allowClaims = true }: { allowClaims?: boolean } = {},
): string[] {
  const outside = prose(text);
  const errors = PRIVATE.filter(([pattern]) => pattern.test(outside)).map(
    ([, what]) => `${where}: ${what}: "${text}"`,
  );
  if (MARKDOWN.test(outside)) {
    errors.push(`${where}: Markdown other than inline code: "${text}"`);
  }
  if (!allowClaims && CLAIMS.test(outside)) {
    errors.push(`${where}: an accessibility claim, which belongs in the contract: "${text}"`);
  }
  return errors;
}

/** Every string value in a data object, with its path (`announcements.2.announces`). */
export function publishedStrings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => publishedStrings(item, `${path}.${String(index)}`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      publishedStrings(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}
