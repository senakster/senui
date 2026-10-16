// L02 review: the built package must ship working CSS. Run after `pnpm build` (`pnpm check` builds
// first). Fails if:
// - an `@import` in any dist stylesheet points at a file that isn't there (consumers would silently
//   get no styles);
// - a component stylesheet in src has no copy where the `./styles/<Name>.css` export expects it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PKG = 'packages/react';
const DIST = join(PKG, 'dist');
const errors = [];

function cssFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? cssFiles(join(dir, d.name))
      : d.name.endsWith('.css')
        ? [join(dir, d.name)]
        : [],
  );
}

if (!existsSync(join(DIST, 'styles/index.css'))) {
  errors.push(`${DIST}/styles/index.css is missing; run \`pnpm build\` first`);
}

for (const file of cssFiles(DIST)) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, target] of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) {
    if (!target.startsWith('.')) continue; // a package import, resolved by the consumer's bundler
    if (!existsSync(join(dirname(file), target))) {
      errors.push(`${file}: @import '${target}' does not resolve`);
    }
  }
}

const components = join(PKG, 'src/components');
for (const src of cssFiles(components)) {
  const built = join(DIST, 'components', src.slice(components.length + 1));
  if (!existsSync(built)) errors.push(`${src} was not copied to ${built}`);
}

if (errors.length > 0) {
  console.error(`dist CSS check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('dist CSS: every @import resolves; every component stylesheet is exported.');
