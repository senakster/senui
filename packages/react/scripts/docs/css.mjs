// Reads a component's stylesheet: the component tokens it declares (checked against the
// stylesheet's opening "Public surface" comment), the stylesheets it imports, and the data
// attributes its selectors name.
import { readFileSync } from 'node:fs';
import { byCodeUnit, kebab } from './util.mjs';

const NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/**
 * @param {string} src The package's `src` directory.
 * @param {string} name The component.
 * @param {string[]} errors Collects problems.
 */
export function componentCss(src, name, errors) {
  const path = `${src}/components/${name}/${name}.css`;
  const text = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  const where = `${name}.css`;
  const comments = [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]);
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rootClass = `senui-${kebab(name)}`;

  const surface = comments.find((c) => c.includes('Public surface'));
  if (!surface) errors.push(`${where}: no opening "Public surface" comment`);
  else if (!surface.includes(`.${rootClass}\``)) {
    errors.push(`${where}: the "Public surface" comment doesn't name \`.${rootClass}\``);
  }
  if (!new RegExp(`\\.${rootClass}(?![a-z0-9_-])`).test(code)) {
    errors.push(`${where}: no selector uses the root class .${rootClass}`);
  }

  // Declarations, not uses: `--senui-button-bg: …`.
  const prefix = `--${rootClass}-`;
  const tokens = [
    ...new Set(
      [...code.matchAll(/(--senui-[a-z0-9-]+)\s*:/g)]
        .map((m) => m[1])
        .filter((token) => token.startsWith(prefix)),
    ),
  ].sort(byCodeUnit);
  const claim = surface
    ? /\bthe ([a-z]+)\s+`--senui-([a-z0-9-]+)-\*`\s+tokens\b/.exec(surface.replace(/\s+/g, ' '))
    : null;
  if (claim) {
    const count = NUMBERS.indexOf(claim[1]);
    if (claim[2] !== kebab(name)) {
      errors.push(`${where}: the "Public surface" comment counts \`--senui-${claim[2]}-*\` tokens`);
    } else if (count !== tokens.length) {
      errors.push(
        `${where}: the "Public surface" comment says ${claim[1]} tokens, but the stylesheet declares ${String(tokens.length)}`,
      );
    }
  } else if (tokens.length > 0) {
    errors.push(
      `${where}: declares ${String(tokens.length)} component tokens, but the "Public surface" comment doesn't count them`,
    );
  }

  const includes = [...code.matchAll(/@import\s+['"]\.\.\/([A-Za-z]+)\/\1\.css['"]/g)]
    .map((m) => m[1])
    .sort(byCodeUnit);

  // `[data-x]` and `[data-x='y']` in selectors, to check against what the component renders.
  const selectors = new Map();
  for (const [, attr, value] of code.matchAll(/\[(data-[a-z-]+)(?:\s*=\s*['"]([^'"]*)['"])?\]/g)) {
    if (!selectors.has(attr)) selectors.set(attr, new Set());
    if (value !== undefined) selectors.get(attr).add(value);
  }

  return { rootClass, tokens, includes, selectors };
}
