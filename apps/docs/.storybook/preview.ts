import type { Preview } from '@storybook/react-vite';
// Loaded through the package's public export, exactly as a consumer would load it.
import '@senakster/tokens/tokens.css';

// Component stylesheets are imported here once L03 ships them.
const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
