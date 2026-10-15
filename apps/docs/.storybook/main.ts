import type { StorybookConfig } from '@storybook/react-vite';

// Docs pages live here; component stories are colocated with their component in packages/react.
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../../../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
};

export default config;
