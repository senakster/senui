import type { Preview } from '@storybook/react-vite';
// Tokens and component styles load through the packages' public exports, as a consumer would load
// them. In development, main.ts aliases the component stylesheet to its source so edits show
// without a rebuild; production builds (and the L08 gate) get the package's built stylesheet.
import '@senakster/senui-tokens/tokens.css';
import '@senakster/senui/styles.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
