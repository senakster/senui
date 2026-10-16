// L02 CSS contract (ADR-0001). Values are checked by Stylelint (ADR-0007/0009); this checks structure:
// - the package's CSS entry imports layers.css first, then only component stylesheets;
// - every other stylesheet under src/ is entirely inside one `@layer senui.components { … }` block,
//   so no senui rule can land unlayered and beat a consumer's override.
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

const open = '@layer senui.components {';
for (const file of cssFiles(SRC)) {
  if (file === ENTRY || file === LAYERS) continue;
  const css = stripComments(readFileSync(file, 'utf8'));
  const name = relative(SRC, file);
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
