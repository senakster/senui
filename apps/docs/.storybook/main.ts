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

// Docs pages live here; component stories are colocated with their component in packages/react.
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../../../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
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
