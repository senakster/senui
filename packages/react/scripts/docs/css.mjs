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

  const deprecated = surface ? deprecations(surface, code, tokens, where, errors) : {};
  // A deprecated token is read as a fallback, never declared, and stays listed until its major.
  const listed = [...new Set([...tokens, ...Object.keys(deprecated).filter(isToken)])].sort(
    byCodeUnit,
  );

  return { rootClass, tokens: listed, includes, selectors, deprecated };
}

const isToken = (name) => name.startsWith('--');

/**
 * L10 decision 7: `deprecated <old>: use <new>` in the "Public surface" comment, one per deprecated
 * token (`--senui-button-bg`), data-attribute value (`[data-variant='subtle']`) or class
 * (`.senui-old`). Returns them by old name. A token is checked here: the old one is never declared,
 * and the new one reads it as its fallback, so an override of either still works. Data values and
 * classes are checked against the markup by the caller.
 */
function deprecations(surface, code, declared, where, errors) {
  const out = {};
  const text = surface.replace(/\s+/g, ' ');
  // Every mention must parse: a misspelt entry would otherwise deprecate nothing, silently.
  const mentions = text.match(/\bdeprecated\b/gi)?.length ?? 0;
  const parsed =
    text.match(/\bdeprecated `?[^\s`:]+`?: use `?[^\s`]+?`?(?=[\s,.;]|$)/g)?.length ?? 0;
  if (mentions !== parsed) {
    errors.push(
      `${where}: the "Public surface" comment mentions "deprecated" in a form it can't read; write \`deprecated <old>: use <new>\``,
    );
  }
  for (const [, from, to] of text.matchAll(
    /\bdeprecated `?([^\s`:]+)`?: use `?([^\s`]+?)`?(?=[\s,.;]|$)/g,
  )) {
    const kind = (name) =>
      isToken(name)
        ? 'token'
        : name.startsWith('[data-')
          ? 'data'
          : name.startsWith('.')
            ? 'class'
            : '';
    if (!kind(from) || kind(from) !== kind(to)) {
      errors.push(
        `${where}: can't read "deprecated ${from}: use ${to}"; both must be a token, a [data-*='value'] or a .class`,
      );
      continue;
    }
    if (kind(from) === 'token') {
      if (declared.includes(from)) {
        errors.push(
          `${where}: deprecated ${from} is still declared; read it as ${to}'s fallback instead`,
        );
      }
      const reads = new RegExp(`${escape(to)}\\s*:\\s*var\\(\\s*${escape(from)}\\s*,`);
      if (!reads.test(code)) {
        errors.push(
          `${where}: ${to} must read the deprecated ${from} first: \`${to}: var(${from}, …)\``,
        );
      }
    }
    out[from] = { useInstead: `Use \`${to}\` instead.` };
  }
  return out;
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
