// Small helpers shared by the docs generator. Output must be byte-identical between builds
// (L09 "Determinism"), so ordering and line endings are decided here.

/** Code-unit order, never `localeCompare`, so the order doesn't depend on the machine's locale. */
export const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** WCAG criterion order, number by number (`1.4.2` before `1.4.12`). */
export function byCriterion(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return byCodeUnit(a, b);
}

/** A path with `/` separators. */
export const slash = (path) => path.replaceAll('\\', '/');

/** Doc text with CRLF normalised out and surrounding blank space trimmed. */
export const cleanDoc = (text) => text.replace(/\r\n?/g, '\n').trim();

/** Text on one line: every run of whitespace, line breaks included, becomes one space. */
export const collapse = (text) => text.replace(/\s+/g, ' ').trim();

/** An object's keys in code-unit order, recursively, so JSON output is stable. */
export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort(byCodeUnit)) sorted[key] = sortKeys(value[key]);
    return sorted;
  }
  return value;
}

/** `AlertDialog` → `alert-dialog`. */
export const kebab = (name) => name.replace(/[a-z0-9](?=[A-Z])/g, '$&-').toLowerCase();
