// L10 decision 11. For each component, bundle an app that imports only that component from the
// package entry, and fail if the bundle keeps the module of a component it doesn't render.
//
// "Renders" is read from dist itself: the build strips type-only imports, so dist's import graph is
// the value-import graph. Dialog and AlertDialog reach Button through internal/dialog/ModalDialog,
// so Button is allowed in both; AlertDialog takes only types from Dialog, so Dialog.js isn't.
//
// Also checks the CSS: a component's stylesheet must load (directly or through its own @imports)
// the stylesheet of every component it renders. A consumer loading per-component CSS otherwise
// gets that component unstyled (the L06 Dialog.css defect). Extra imports are allowed: AlertDialog's
// dialog styles live in Dialog.css, and the manifest publishes them as `cssIncludes`.
//
// Needs a built package (`pnpm build`); `pnpm check` builds first.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'packages/react');
const dist = join(pkg, 'dist');
const require = createRequire(join(pkg, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);

const rel = (file) => relative(dist, file).split('\\').join('/');
// The component list comes from src, so a dist without one module per component (a bundled
// build) fails here instead of passing with nothing to check.
const components = readdirSync(join(pkg, 'src/components'), { withFileTypes: true })
  .filter(
    (d) => d.isDirectory() && existsSync(join(pkg, 'src/components', d.name, `${d.name}.tsx`)),
  )
  .map((d) => d.name)
  .sort();
const unbuilt = components.filter(
  (name) => !existsSync(join(dist, 'components', name, `${name}.js`)),
);
if (components.length === 0 || unbuilt.length) {
  console.error(
    `tree-shaking check failed: dist has no module for ${unbuilt.join(', ') || 'any component'}. ` +
      'The build must keep one file per module (tsdown `unbundle`).',
  );
  process.exit(1);
}
const componentOf = (file) => {
  const m = /^components\/([^/]+)\/([^/]+)\.js$/.exec(rel(file));
  return m && m[1] === m[2] ? m[1] : undefined;
};

// Relative imports of a built module, resolved to files.
const importsOf = (file) =>
  [
    ...readFileSync(file, 'utf8').matchAll(
      /(?:^|[\s;])(?:import|export)\b[^'"]*?from\s*['"](\.[^'"]+)['"]|(?:^|[\s;])import\s*['"](\.[^'"]+)['"]/g,
    ),
  ].map((m) => resolve(dirname(file), m[1] ?? m[2]));

function reachable(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    stack.push(...importsOf(f));
  }
  return seen;
}

const renders = (name) =>
  new Set(
    [...reachable(join(dist, 'components', name, `${name}.js`))]
      .map(componentOf)
      .filter((c) => c && c !== name),
  );

async function bundled(name) {
  const entry = '\0tree-shaking-entry';
  const out = await build({
    configFile: false,
    logLevel: 'silent',
    root: pkg,
    plugins: [
      {
        name: 'tree-shaking-entry',
        resolveId: (id) => (id === entry ? id : undefined),
        load: (id) =>
          id === entry
            ? `import { ${name} } from ${JSON.stringify(pathToFileURL(join(dist, 'index.js')).href)};\nconsole.log(${name});\n`
            : undefined,
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: entry, external: [/^react(-dom)?(\/.*)?$/] },
    },
  });
  const chunks = (Array.isArray(out) ? out : [out])
    .flatMap((o) => o.output)
    .filter((c) => c.type === 'chunk');
  return new Set(
    chunks
      .flatMap((c) => Object.entries(c.modules))
      .filter(([, m]) => m.renderedLength > 0)
      .map(([id]) => componentOf(id.startsWith('file:') ? fileURLToPath(id) : id))
      .filter(Boolean),
  );
}

const cssImports = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) =>
    resolve(dirname(file), m[1]),
  );
function cssClosure(file) {
  const seen = new Set();
  const stack = [file];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    stack.push(...cssImports(f));
  }
  return seen;
}

const errors = [];
for (const name of components) {
  const allowed = renders(name);
  const kept = await bundled(name);
  if (!kept.has(name))
    errors.push(`${name}: the bundle doesn't contain ${name} itself; the probe is broken`);
  for (const other of [...kept].filter((c) => c !== name && !allowed.has(c)).sort()) {
    errors.push(
      `${name}: importing only ${name} also bundles ${other}, which ${name} doesn't render`,
    );
  }

  const css = join(dist, 'components', name, `${name}.css`);
  if (!existsSync(css)) continue;
  const loaded = cssClosure(css);
  for (const other of [...allowed].sort()) {
    const otherCss = join(dist, 'components', other, `${other}.css`);
    if (existsSync(otherCss) && !loaded.has(otherCss)) {
      errors.push(
        `${name}: renders ${other}, but styles/${name}.css doesn't load styles/${other}.css`,
      );
    }
  }
}

if (errors.length) {
  console.error(`tree-shaking check failed:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `tree-shaking: ${components.length} components, each bundles only what it renders, and its stylesheet loads theirs.`,
);
