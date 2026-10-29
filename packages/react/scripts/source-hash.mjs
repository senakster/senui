// L10 decision 6: what a manual a11y run tested, as a fingerprint (`sourceHash`). A run is stale
// when today's fingerprint differs from the one stamped on it. It covers what changes behaviour,
// and nothing that doesn't:
// - the component's module and every `src` module it imports as a value, each transpiled by the
//   pinned TypeScript with types and comments removed, so a JSDoc or type-only edit doesn't count;
//   plus, for a component designed to sit inside another (its `.docs.ts` composition), that
//   parent's graph, since the parent wires it at runtime;
// - its stylesheet and the stylesheets it imports (and its composition parent's), without comments;
// - the resolved values (light, dark, reduced motion) of every token those stylesheets read;
// - from its contract, what a run checks against: each announcement's quoted speech (the
//   double-quoted parts of `announces`), owner, mechanism and politeness, and each key binding's
//   keys. The prose around them (`when`, `action`, the rest of `announces`) and the quote's
//   `language` label are wording, not behaviour.
// Stories aren't included.
//
// Everything is read through `read(path)`, so the same code fingerprints the working tree or any
// commit (`git show <commit>:<path>`), which is how the one-time backfill stamps existing runs.
// A TypeScript upgrade that changes transpile output changes every hash; re-stamping is then a
// deliberate, reviewed commit.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = 'packages/react/src';
const COMPONENTS = readdirSync(join(here, '../src/components'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/**
 * @param {(path: string) => string | undefined} read A file's text by repository-relative path, or
 *   `undefined` when it doesn't exist.
 * @param {string} name The component.
 * @param {Map<string, string>} tokens Each token's resolved values, by custom property name.
 * @param {{ data?: (path: string) => string | undefined, components?: string[] }} [options]
 *   `data`: where to read the components' contracts and usage guidance from, when not from `read`
 *   (only the one-time backfill uses it; see a11y-stamp.mjs). `components`: every component's
 *   name, so a component's children (those whose guidance places them inside it) can be found;
 *   the working tree's by default, so every caller fingerprints alike.
 * @returns {string} 16 hex characters.
 */
export function sourceHash(read, name, tokens, options = {}) {
  return createHash('sha256')
    .update(sourceParts(read, name, tokens, options).join('\n\0\n'))
    .digest('hex')
    .slice(0, 16);
}

/** What `sourceHash` hashes, sorted: one entry per module, stylesheet and token, and the contract. */
export function sourceParts(
  read,
  name,
  tokens,
  { data: readData = read, components = COMPONENTS } = {},
) {
  const parts = [];
  const get = (path, from = read) => {
    const text = from(path);
    if (text === undefined) throw new Error(`sourceHash(${name}): can't read ${path}`);
    return text.replace(/\r\n?/g, '\n');
  };

  // A component placed inside another by design (its `.docs.ts` composition: TextInput in
  // FormField, Checkbox in CheckboxGroup) is tested there, and the parent wires it at runtime
  // without being imported by it. Both ways: the child's runs cover the parent, and the parent's
  // runs, which heard the child inside it, cover the child.
  const parentsOf = (n) =>
    [
      ...(readData(`${SRC}/components/${n}/${n}.docs.ts`) ?? '').matchAll(
        /\bparent:\s*['"]([A-Za-z]+)['"]/g,
      ),
    ].map((m) => m[1]);
  const composed = [
    ...parentsOf(name),
    ...components.filter((c) => c !== name && parentsOf(c).includes(name)),
  ];

  // The value-import graph, transpiled.
  const seen = new Set();
  const stack = [
    `${SRC}/components/${name}/${name}.tsx`,
    ...composed.map((p) => `${SRC}/components/${p}/${p}.tsx`),
  ];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const out = ts.transpileModule(get(file), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        removeComments: true,
      },
    }).outputText;
    // Where a module lives isn't behaviour: moving `internal/dev.ts` to `internal/dev/dev.ts`
    // changes no code. Parts carry no path, and relative specifiers are blanked.
    parts.push(`js\n${out.replace(/(from\s*|import\s*)(['"])\.[^'"]*\2/g, '$1$2$2')}`);
    for (const [, a, b] of out.matchAll(
      /(?:^|[\s;])(?:import|export)\b[^'"]*?from\s*['"](\.[^'"]+)['"]|(?:^|[\s;])import\s*['"](\.[^'"]+)['"]/g,
    )) {
      const spec = a ?? b;
      if (spec.endsWith('.css')) continue;
      const base = join(dirname(file), spec).split('\\').join('/').replace(/\.js$/, '');
      const found = [`${base}.ts`, `${base}.tsx`].find((p) => read(p) !== undefined);
      if (!found) throw new Error(`sourceHash(${name}): ${file} imports ${spec}, not found`);
      stack.push(found);
    }
  }

  // The stylesheets, and the tokens they read.
  const css = new Set();
  const cssStack = [
    `${SRC}/components/${name}/${name}.css`,
    ...composed.map((p) => `${SRC}/components/${p}/${p}.css`),
  ];
  const read_ = new Set();
  const declared = new Set();
  while (cssStack.length > 0) {
    const file = cssStack.pop();
    if (css.has(file)) continue;
    css.add(file);
    const text = get(file)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
    parts.push(`css\n${text.replace(/@import\s+(['"])\.[^'"]*\1/g, '@import $1$1')}`);
    for (const [, spec] of text.matchAll(/@import\s+['"](\.[^'"]+)['"]/g)) {
      cssStack.push(join(dirname(file), spec).split('\\').join('/'));
    }
    for (const [, v] of text.matchAll(/var\(\s*(--senui-[a-z0-9-]+)/g)) read_.add(v);
    for (const [, v] of text.matchAll(/(--senui-[a-z0-9-]+)\s*:/g)) declared.add(v);
  }
  for (const token of [...read_].filter((t) => !declared.has(t)).sort()) {
    parts.push(`token ${token}=${tokens.get(token) ?? '(none)'}`);
  }

  // What a run checks against, from the contract.
  const contract = `${SRC}/components/${name}/${name}.a11y.ts`;
  parts.push(`contract\n${contractBehaviour(get(contract, readData), contract)}`);

  return parts.sort();
}

/** The behavioural fields of a contract's `announcements` and `keyboard`, printed without comments. */
function contractBehaviour(text, fileName) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ removeComments: true });
  const print = (node) => printer.printNode(ts.EmitHint.Unspecified, node, source);
  const pick = {
    announcements: ['announces', 'owner', 'mechanism', 'politeness'],
    keyboard: ['keys'],
  };
  const out = [];
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text in pick &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      const fields = pick[node.name.text];
      node.initializer.elements.forEach((element, i) => {
        if (!ts.isObjectLiteralExpression(element)) {
          out.push(`${node.name.text}[${String(i)}] ${print(element)}`);
          return;
        }
        for (const p of element.properties) {
          if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
          if (!fields.includes(p.name.text)) continue;
          let value = print(p.initializer);
          // In `announces`, double quotes mark verbatim speech and nothing else (CONVENTIONS rule
          // 7): the speech is what a run heard; the prose around it is wording.
          if (p.name.text === 'announces') {
            const text = ts.isStringLiteralLike(p.initializer) ? p.initializer.text : value;
            // An announcement with no quote is a description of what was heard: all of it counts.
            const quotes = text.match(/"[^"]*"/g);
            value = quotes ? quotes.join(' ') : text;
          }
          out.push(`${node.name.text}[${String(i)}].${p.name.text} ${value}`);
        }
      });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out.join('\n');
}

/**
 * Every public token's resolved values, built in memory by the tokens package's pipeline from the
 * given token sources (the working tree's, or a commit's).
 *
 * @param {string[]} sources The `*.tokens.json` files' texts.
 * @returns {Promise<Map<string, string>>}
 */
export async function tokenValues(sources) {
  const sd = join(here, '../../tokens/sd.config.mjs');
  const { buildTokens } = await import(pathToFileURL(sd).href);
  const tokens = {};
  for (const text of sources) merge(tokens, JSON.parse(text));
  const { entries } = await withCwd(dirname(sd), () => buildTokens({ tokens }));
  return new Map(
    entries.map((e) => [
      e.cssVar,
      JSON.stringify({ value: e.value, dark: e.dark, reducedMotion: e.reducedMotion }),
    ]),
  );
}

function merge(into, from) {
  for (const [key, value] of Object.entries(from)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && into[key])
      merge(into[key], value);
    else into[key] = value;
  }
}

async function withCwd(dir, run) {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return await run();
  } finally {
    process.chdir(before);
  }
}

/** Reads the working tree, from the repository root. */
export function workingTree(root) {
  return (path) => {
    try {
      return readFileSync(join(root, path), 'utf8');
    } catch {
      return undefined;
    }
  };
}
