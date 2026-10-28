import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { CheckboxGroupProps } from './CheckboxGroup.js';
import type * as stories from './CheckboxGroup.stories.js';

export const docs = defineComponentDocs<CheckboxGroupProps, typeof stories>()({
  component: 'CheckboxGroup',
  summary: 'A set of related checkboxes with one legend, one description, one error and one value.',
  description:
    'A `<fieldset>` and `<legend>` around Checkboxes. It holds their checked state as one array of values (`value` or `defaultValue`, with `onValueChange`), and its `required` message means at least one must be chosen.',
  useWhen: [
    'A question has several answers that can be chosen together, such as topics to follow.',
    'At least one of several options must be chosen before a form submits.',
  ],
  dontUseWhen: [
    {
      when: 'Exactly one option can be chosen.',
      alternative: {
        element: 'fieldset',
        note: 'Use a `<fieldset>` of radio buttons: they allow exactly one choice.',
      },
    },
    {
      when: 'There is a single yes-or-no question.',
      alternative: { component: 'Checkbox' },
    },
  ],
  related: ['Checkbox', 'FormField'],
  examples: ['Default', 'WithValue', 'WithDescription', 'WithError'],
  composition: [],
});
