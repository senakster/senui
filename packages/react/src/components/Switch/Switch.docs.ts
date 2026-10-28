import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { SwitchProps } from './Switch.js';
import type * as stories from './Switch.stories.js';

export const docs = defineComponentDocs<SwitchProps, typeof stories>()({
  component: 'Switch',
  summary: 'An on/off setting that takes effect the moment it is changed.',
  description:
    'A native checkbox with `role="switch"` and its own `label` and `description`. Apply the change in `onCheckedChange`; if it fails, set the switch back and tell the user. `className` and `style` go on the row; every other native attribute, and the ref, go on the input.',
  useWhen: ['A setting applies immediately, such as turning notifications or Wi-Fi on and off.'],
  dontUseWhen: [
    {
      when: 'The change only applies when the user submits or saves a form.',
      alternative: { component: 'Checkbox' },
    },
    {
      when: 'It starts an action, such as sending or deleting.',
      alternative: { component: 'Button' },
    },
    {
      when: 'The setting has more than two states.',
      alternative: {
        element: 'select',
        note: 'Use a `<select>` or radio buttons for a choice among several values.',
      },
    },
  ],
  related: ['Checkbox', 'Button'],
  examples: ['Default', 'On', 'WithDescription', 'Disabled'],
  composition: [],
});
