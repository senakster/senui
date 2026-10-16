// Token pipeline (ADR-0004). Run as a script to build src/*.tokens.json into src/generated/;
// import buildTokens() to build a token object in memory (the tests do).
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import Color from 'colorjs.io';
import StyleDictionary from 'style-dictionary';
import { checkContrast } from './contrast.mjs';

const PREFIX = 'senui';
const OUT_DIR = 'src/generated';
const MODES = ['dark', 'reducedMotion'];

// DTCG colour-space names that colorjs.io spells differently.
const COLORJS_SPACE = {
  'display-p3': 'p3',
  'a98-rgb': 'a98rgb',
  'prophoto-rgb': 'prophoto',
};

const isObject = (v) => typeof v === 'object' && v !== null;

// The stock color/css transform converts everything to hex or rgb. Keep the authored space.
StyleDictionary.registerTransform({
  name: 'senui/color/css',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'color',
  transform: (token) => {
    const v = token.$value;
    if (!isObject(v) || !Array.isArray(v.components)) return v;
    const coords = v.components.map((c) => (c === 'none' ? NaN : c));
    return new Color(COLORJS_SPACE[v.colorSpace] ?? v.colorSpace, coords, v.alpha ?? 1).toString();
  },
});

// DTCG 2025.10 dimensions and durations are { value, unit } objects.
StyleDictionary.registerTransform({
  name: 'senui/unit/css',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'dimension' || token.$type === 'duration',
  transform: (token) => {
    const v = token.$value;
    return isObject(v) ? `${String(v.value)}${String(v.unit)}` : v;
  },
});

const unit = (v) => (isObject(v) ? `${String(v.value)}${String(v.unit)}` : String(v));
const cssVarFor = (ref) =>
  `var(--${PREFIX}-${ref
    .slice(1, -1)
    .split('.')
    .map((s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')})`;

// The stock shadow shorthand inlines the resolved colour, which freezes it at the light value.
// A shadow colour that references a public token stays a var(), so it follows light-dark().
StyleDictionary.registerTransform({
  name: 'senui/shadow/css',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'shadow',
  transform: (token) => {
    const layers = [token.$value].flat();
    const originals = [token.original.$value].flat();
    return layers
      .map((s, i) => {
        const ref = originals[i]?.color;
        const isPublicRef =
          typeof ref === 'string' && ref.startsWith('{') && !ref.startsWith('{primitive.');
        const color = isPublicRef ? cssVarFor(ref) : String(s.color);
        const parts = [s.offsetX, s.offsetY, s.blur, s.spread].map(unit);
        return [s.inset ? 'inset' : '', ...parts, color].filter(Boolean).join(' ');
      })
      .join(', ');
  },
});

// A mode pass swaps each token's $value for its $extensions.senui[mode] value before resolution,
// so aliases and transforms work the same way in every mode.
for (const mode of MODES) {
  StyleDictionary.registerPreprocessor({
    name: `senui/mode/${mode}`,
    preprocessor: (tree) => {
      const copy = structuredClone(tree);
      const walk = (node) => {
        if (!isObject(node)) return;
        if ('$value' in node) {
          const alt = node.$extensions?.senui?.[mode];
          if (alt !== undefined) node.$value = alt;
          return;
        }
        Object.values(node).forEach(walk);
      };
      walk(copy);
      return copy;
    },
  });
}

const TRANSFORMS = [
  'name/kebab',
  'senui/color/css',
  'senui/unit/css',
  'fontFamily/css',
  'cubicBezier/css',
  'senui/shadow/css',
  'border/css/shorthand',
  'typography/css/shorthand',
  'transition/css/shorthand',
];

async function runPass(input, mode) {
  const sd = new StyleDictionary({
    ...input,
    preprocessors: mode ? [`senui/mode/${mode}`] : [],
    log: { warnings: 'error', verbosity: 'verbose' },
    platforms: { css: { prefix: PREFIX, transforms: TRANSFORMS } },
  });
  const { allTokens } = await sd.getPlatformTokens('css');
  return new Map(allTokens.map((t) => [t.path.join('.'), t]));
}

const refKey = (ref) => String(ref).replace(/^\{|\}$/g, '');

/**
 * @param {{ source?: string[], tokens?: object }} input Style Dictionary `source` globs or a token tree
 */
export async function buildTokens(input) {
  const [base, dark, reduced] = await Promise.all([
    runPass(input),
    runPass(input, 'dark'),
    runPass(input, 'reducedMotion'),
  ]);
  const errors = [];
  const entries = [];
  const keys = [...base.keys()].filter((k) => !k.startsWith('primitive.')).sort();
  for (const key of keys) {
    const token = base.get(key);
    const ext = token.original.$extensions?.senui ?? {};
    const entry = {
      key,
      cssVar: `--${token.name}`,
      type: token.$type,
      value: String(token.$value),
    };
    if (token.$description) entry.description = token.$description;
    if (token.$type === 'color') {
      if (ext.dark === undefined) errors.push(`${key}: colour tokens need $extensions.senui.dark`);
      else entry.dark = String(dark.get(key).$value);
      if (ext.contrast === undefined) {
        errors.push(`${key}: colour tokens need $extensions.senui.contrast ([] for a surface)`);
      } else {
        entry.contrast = ext.contrast.map((p) => ({ against: refKey(p.against), min: p.min }));
      }
    } else if (ext.dark !== undefined) {
      errors.push(`${key}: only colour tokens can have a dark value (light-dark() is colour-only)`);
    }
    if (ext.reducedMotion !== undefined) entry.reducedMotion = String(reduced.get(key).$value);
    entries.push(entry);
  }
  errors.push(...checkContrast(entries));
  return { entries, errors, css: formatCss(entries), ts: formatTs(entries) };
}

function formatCss(entries) {
  const decl = (e, value) => `    ${e.cssVar}: ${value};`;
  const reduced = entries.filter((e) => e.reducedMotion !== undefined);
  return [
    '/* Generated by @senakster/tokens. Do not edit; change src/*.tokens.json instead. */',
    '@layer senui.tokens, senui.base, senui.components;',
    '',
    '@layer senui.tokens {',
    '  :where(:root) {',
    '    color-scheme: light dark;',
    ...entries.map((e) =>
      decl(e, e.dark === undefined ? e.value : `light-dark(${e.value}, ${e.dark})`),
    ),
    '  }',
    '',
    '  :where([data-theme="light"]) {',
    '    color-scheme: light;',
    '  }',
    '',
    '  :where([data-theme="dark"]) {',
    '    color-scheme: dark;',
    '  }',
    ...(reduced.length === 0
      ? []
      : [
          '',
          '  @media (prefers-reduced-motion: reduce) {',
          '    :where(:root) {',
          ...reduced.map((e) => `  ${decl(e, e.reducedMotion)}`),
          '    }',
          '  }',
        ]),
    '}',
    '',
  ].join('\n');
}

function formatTs(entries) {
  // `key` becomes the map key; `contrast` is build-time input, not part of the public map.
  const internal = new Set(['key', 'contrast']);
  const map = Object.fromEntries(
    entries.map((e) => [
      e.key,
      Object.fromEntries(Object.entries(e).filter(([k]) => !internal.has(k))),
    ]),
  );
  return [
    '// Generated by @senakster/tokens. Do not edit; change src/*.tokens.json instead.',
    "import type { Token } from '../types.js';",
    '',
    `export const tokens = ${JSON.stringify(map, null, 2)} as const satisfies Record<string, Token>;`,
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { entries, errors, css, ts } = await buildTokens({ source: ['src/**/*.tokens.json'] });
  if (errors.length > 0) {
    console.error(`Token build failed:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  if (entries.length === 0) console.warn('No public tokens found in src/*.tokens.json.');
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/tokens.css`, css);
  await writeFile(`${OUT_DIR}/tokens.ts`, ts);
  console.log(`Built ${String(entries.length)} tokens into ${OUT_DIR}/.`);
}
