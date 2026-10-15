import type { Preview } from '@storybook/react-vite';

// Token and component stylesheets are imported here once L01 and L03 ship them.
const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
