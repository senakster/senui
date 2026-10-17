import type { Preview } from '@storybook/react-vite';
// Tokens load through the package's public export, as a consumer would load them. Component CSS
// loads from source so edits show without a rebuild; scripts/check-dist-css.mjs guards the shipped
// `@senakster/react/styles.css` path instead.
import '@senakster/tokens/tokens.css';
import '../../../packages/react/src/styles/index.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
