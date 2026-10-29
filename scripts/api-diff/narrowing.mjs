// L10 decision 5, narrowing. Printed types are informative, so they're never compared as text.
// Instead, every `*Props` type both builds export is type-checked: a value of the baseline's type
// must be assignable to this build's (`Old extends New`). A removed union member, a prop narrowed
// from `ReactNode` to `ReactElement`, a newly required prop or a callback that now receives a wider
// argument fails it; the compiler handles callback parameters' reverse direction. No dependency:
// the TypeScript the workspace already builds with.
//
// Both declaration trees are copied under `packages/react/node_modules/.api-diff/`, so `react`
// resolves to the workspace's `@types/react` exactly as it does for a consumer.
//
// A `unique symbol` brand (FormFieldBinding's `sealed`, ADR-0011) is a new type in every copy, so
// two identical trees would never match. Consumer code can't name a brand, so the same brand in the
// same file is one symbol: both trees import it from a shared module. A brand moved to another
// file reads as a narrowing, which a reviewer can see is a false alarm.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = join(root, 'packages/react');
const ts = createRequire(join(pkg, 'package.json'))('typescript');

/**
 * @param {string} oldDist A baseline's `dist`, holding `index.d.ts` and the files it imports.
 * @param {string} newDist This build's `dist`.
 * @param {string[]} names The types both export.
 * @returns {{ name: string, direction: 'narrowed' | 'widened', message: string }[]} One entry per
 *   failed direction: `narrowed`, a baseline value no longer fits; `widened`, a type other than
 *   props now holds values the baseline's didn't.
 */
export function narrowed(oldDist, newDist, names) {
  const work = join(pkg, 'node_modules/.api-diff');
  rmSync(work, { recursive: true, force: true });
  const brands = new Set();
  for (const [from, to] of [
    [oldDist, 'old'],
    [newDist, 'new'],
  ]) {
    for (const file of declarations(from)) {
      const rel = relative(from, file).split('\\').join('/');
      const target = join(work, to, rel);
      mkdirSync(dirname(target), { recursive: true });
      const shared = relative(dirname(target), join(work, 'brands.js')).split('\\').join('/');
      const text = readFileSync(file, 'utf8').replace(
        /^declare const (\w+): unique symbol;$/gm,
        (_, name) => {
          const id = `brand_${rel.replace(/\W/g, '_')}_${name}`;
          brands.add(id);
          return `import { ${id} as ${name} } from './${shared}';`;
        },
      );
      writeFileSync(target, text);
    }
  }
  writeFileSync(
    join(work, 'brands.d.ts'),
    [...brands].map((id) => `export declare const ${id}: unique symbol;\n`).join(''),
  );
  writeFileSync(join(work, 'package.json'), '{ "type": "module", "private": true }\n');

  // A generic type can't be named without its arguments; its export fact still covers removal.
  const generic = genericExports(join(work, 'old/index.d.ts'));
  const lines = [
    "import type * as Old from './old/index.js';",
    "import type * as New from './new/index.js';",
  ];
  /** What each line checks, by line. */
  const at = new Map();
  for (const name of names.filter((n) => !generic.has(n))) {
    lines.push(`declare const old_${name}: Old.${name};`);
    at.set(lines.length, { name, direction: 'narrowed' });
    lines.push(`export const new_${name}: New.${name} = old_${name};`);
    // Props are only passed in. Any other type may also be handed to consumer code (a callback's
    // `details`, a reason to switch on), where a new member is a case it doesn't handle.
    if (!name.endsWith('Props')) {
      lines.push(`declare const new2_${name}: New.${name};`);
      at.set(lines.length, { name, direction: 'widened' });
      lines.push(`export const old2_${name}: Old.${name} = new2_${name};`);
    }
  }
  const check = join(work, 'check.ts');
  writeFileSync(check, `${lines.join('\n')}\n`);

  const program = ts.createProgram([check], OPTIONS);
  const source = program.getSourceFile(check);
  const out = [];
  for (const d of ts.getPreEmitDiagnostics(program)) {
    // `import("…/.api-diff/old/…").X` reads as `old X`.
    const message = ts
      .flattenDiagnosticMessageText(d.messageText, '\n')
      .replace(/import\("[^"]*\.api-diff\/(old|new)\/[^"]*"\)\./g, '$1 ');
    if (d.file !== source || d.start === undefined) {
      throw new Error(`narrowing check: the declarations don't compile: ${message}`);
    }
    const line = source.getLineAndCharacterOfPosition(d.start).line;
    const what = at.get(line);
    if (!what) throw new Error(`narrowing check: unexpected error: ${message}`);
    out.push({ ...what, message });
  }
  rmSync(work, { recursive: true, force: true });
  return out;
}

const OPTIONS = {
  strict: true,
  exactOptionalPropertyTypes: false,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  types: [],
};

/** The entry's exported types that take type parameters. */
function genericExports(entry) {
  const program = ts.createProgram([entry], OPTIONS);
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(program.getSourceFile(entry));
  const out = new Set();
  for (const exported of module ? checker.getExportsOfModule(module) : []) {
    const target =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (target.declarations?.some((d) => (d.typeParameters?.length ?? 0) > 0)) {
      out.add(exported.name);
    }
  }
  return out;
}

function declarations(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.d.ts'))
    .map((d) => join(d.parentPath, d.name));
}
