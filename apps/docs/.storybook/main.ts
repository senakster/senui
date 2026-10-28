import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

// The component stylesheet, as a consumer imports it (L08 decision 2). In development it is
// aliased to the source, so edits show without a package rebuild; every production build, and so
// the L08 gate, gets the package's built `dist` stylesheet.
const STYLES = '@senakster/senui/styles.css';
const SOURCE_STYLES = fileURLToPath(
  new URL('../../../packages/react/src/styles/index.css', import.meta.url),
);

// L09 "Site": the package's generated docs files, served at the site root, so the deployed site
// serves `llms.txt` and `components.json` next to `index.html`. Exactly these, never all of dist.
const DIST = fileURLToPath(new URL('../../../packages/react/dist/', import.meta.url));
const GENERATED = ['components.json', 'llms.txt', 'llms-full.txt', 'USAGE.md', 'docs'] as const;

function generatedFiles(): { from: string; to: string }[] {
  const missing = GENERATED.filter((path) => !existsSync(`${DIST}${path}`));
  if (missing.length > 0) {
    throw new Error(
      `The site needs the package's generated docs, and ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing from ${DIST}. Run \`pnpm build\` first.`,
    );
  }
  return GENERATED.map((path) => ({ from: `${DIST}${path}`, to: `/${path}` }));
}

// Docs pages live here; component stories are colocated with their component in packages/react.
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../../../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  staticDirs: (dirs = [], { configType }) =>
    configType === 'PRODUCTION' ? [...dirs, ...generatedFiles()] : dirs,
  // Storybook's own experimental component manifest is never published (L09 decision 1): it may
  // help an agent in development, and the gate fails a build that contains `manifests/`.
  features: (features = {}, { configType }) => ({
    ...features,
    componentsManifest: configType === 'DEVELOPMENT',
  }),
  viteFinal: (viteConfig, { configType }) =>
    configType === 'DEVELOPMENT'
      ? mergeConfig(viteConfig, {
          resolve: { alias: [{ find: STYLES, replacement: SOURCE_STYLES }] },
        })
      : viteConfig,
  // The gate asserts this marker before any check, so it can't run against source CSS unawares.
  previewHead: (head = '', { configType }) =>
    configType === 'DEVELOPMENT' ? head : `${head}\n<meta name="senui-css" content="dist">`,
};

export default config;
