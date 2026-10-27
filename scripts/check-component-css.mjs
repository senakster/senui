// L02 CSS contract (ADR-0001). Values are checked by Stylelint (ADR-0007/0009); this checks structure:
// - the package's CSS entry imports layers.css first, then only component stylesheets;
// - every other stylesheet under src/ is entirely inside one `@layer senui.components { … }` block,
//   so no senui rule can land unlayered and beat a consumer's override;
// - every `@container` query names a senui- container its own stylesheet declares, and uses rem on
//   size features only (ADR-0016), which no built-in Stylelint rule can see.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'packages/react/src';
const ENTRY = join(SRC, 'styles/index.css');
const LAYERS = join(SRC, 'styles/layers.css');
const errors = [];
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

const componentDirs = existsSync(join(SRC, 'components'))
  ? readdirSync(join(SRC, 'components'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

// The entry: `@import './layers.css';`, then `@import '../components/<Name>/<Name>.css';` lines.
const statements = stripComments(readFileSync(ENTRY, 'utf8'))
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
if (!/^@import\s+['"]\.\/layers\.css['"]$/.test(statements[0] ?? '')) {
  errors.push(`${ENTRY}: the first statement must be @import './layers.css';`);
}
for (const statement of statements.slice(1)) {
  const match = /^@import\s+['"]\.\.\/components\/([^/'"]+)\/([^/'"]+)\.css['"]$/.exec(statement);
  if (!match) {
    errors.push(`${ENTRY}: only component imports may follow layers.css, found \`${statement}\``);
  } else if (match[1] !== match[2] || !componentDirs.includes(match[1])) {
    errors.push(
      `${ENTRY}: \`${statement}\` is not ../components/<Name>/<Name>.css for a component`,
    );
  }
}

function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? cssFiles(join(dir, d.name))
      : d.name.endsWith('.css')
        ? [join(dir, d.name)]
        : [],
  );
}

// ADR-0016: Stylelint checks no unit inside an `@container` condition, so this does. A container
// query names a `senui-` container, and its only unit is `rem`, on a size feature.
const SIZE_FEATURE = /^(min-|max-)?(width|height|inline-size|block-size)$/;
const DIMENSION = /(?<![\w-])[+-]?(\d*\.)?\d+([a-z%]+)/gi;
function checkContainerQueries(css, name) {
  // Names this stylesheet declares (`container: a b / inline-size`, `container-name: a b`). A
  // query naming anything else (a typo) would silently never match.
  const declared = new Set(
    [...css.matchAll(/\bcontainer(?:-name)?\s*:\s*([^;/}]+)/g)].flatMap(([, names]) =>
      names.trim().split(/\s+/),
    ),
  );
  for (const [, prelude] of css.matchAll(/@container\b([^{]*)\{/g)) {
    const query = prelude.trim();
    const container = /^(senui-[a-z0-9-]+)\s/.exec(query)?.[1];
    if (!container) {
      errors.push(`${name}: \`@container ${query}\` must name a senui- container (ADR-0016)`);
    } else if (!declared.has(container)) {
      errors.push(
        `${name}: \`@container ${container}\` names a container this stylesheet doesn't declare (ADR-0016)`,
      );
    }
    // Innermost parenthesised groups: one feature each, `(min-width: 30rem)` or `(30rem < width)`.
    for (const [, group] of query.matchAll(/\(([^()]*)\)/g)) {
      const units = [...group.matchAll(DIMENSION)].map((m) => m[2].toLowerCase());
      if (units.length === 0) continue;
      const feature = group
        .replace(DIMENSION, ' ')
        .split(/[\s:<>=]+/)
        .find(Boolean);
      if (units.some((unit) => unit !== 'rem') || !SIZE_FEATURE.test(feature ?? '')) {
        errors.push(
          `${name}: \`(${group.trim()})\` in an @container condition: only rem, on a size feature (ADR-0016)`,
        );
      }
    }
  }
}

const open = '@layer senui.components {';
// A component stylesheet may start by importing another component's stylesheet it depends on
// (L06: AlertDialog needs Dialog), so the per-component export works alone. Plain `@import`, never
// `layer(…)`: the imported sheet already declares `senui.components`, and `layer()` would nest it
// in a sub-layer that loses to every other component's rules. The imported sheet is itself checked.
const componentImport = /^@import\s+['"]\.\.\/([^/'"]+)\/([^/'"]+)\.css['"];\s*/;
for (const file of cssFiles(SRC)) {
  if (file === ENTRY || file === LAYERS) continue;
  let css = stripComments(readFileSync(file, 'utf8'));
  const name = relative(SRC, file);
  for (let match = componentImport.exec(css); match; match = componentImport.exec(css)) {
    const [statement, dir, base] = match;
    const own = relative(join(SRC, 'components'), file).split(/[\\/]/)[0];
    if (dir !== base || !componentDirs.includes(dir) || dir === own) {
      errors.push(
        `${name}: \`${statement.trim()}\` must import another component's <Name>/<Name>.css`,
      );
    }
    css = css.slice(statement.length);
  }
  checkContainerQueries(css, name);
  if (!css.startsWith(open)) {
    errors.push(`${name}: must start with \`${open}\` and keep every rule inside it`);
    continue;
  }
  // Find the brace that closes the layer block; nothing may follow it.
  let depth = 0;
  let end = -1;
  for (let i = open.length - 1; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) errors.push(`${name}: unbalanced braces in the senui.components layer`);
  else if (css.slice(end + 1).trim() !== '') {
    errors.push(`${name}: rules after the senui.components layer block would be unlayered`);
  }
}

if (errors.length > 0) {
  console.error(`component CSS check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(
  'component CSS: entry imports layers.css then components only; all other CSS is layered.',
);
