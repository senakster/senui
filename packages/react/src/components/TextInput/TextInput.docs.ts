import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { TextInputProps } from './TextInput.js';
import type * as stories from './TextInput.stories.js';

export const docs = defineComponentDocs<TextInputProps, typeof stories>()({
  component: 'TextInput',
  summary: 'A single-line text field: a name, an email address, a search term.',
  description:
    'A native `<input>`. Inside a FormField it takes the binding as `field`; on its own, name it with `aria-label` or `aria-labelledby`. `value`, `defaultValue`, `onChange`, `type`, `autoComplete` and every other native attribute pass through.',
  useWhen: [
    'The answer is one line of text.',
    'A search box sits next to a visible search button.',
  ],
  dontUseWhen: [
    {
      when: 'The answer can run over several lines.',
      alternative: { element: 'textarea', note: 'Use a `<textarea>` for multi-line text.' },
    },
    {
      when: 'The answer is one of a fixed set of options.',
      alternative: {
        element: 'select',
        note: 'Use a `<select>` or radio buttons, so the options are listed.',
      },
    },
    {
      when: 'The answer is yes or no.',
      alternative: { component: 'Checkbox' },
    },
  ],
  related: ['FormField'],
  examples: ['Default', 'Filled', 'Invalid', 'Disabled', 'LabelledBy'],
  composition: [
    {
      parent: 'FormField',
      required: ['field'],
      note: 'Pass the binding from the FormField `children` function as `field`; it carries the id, the description, the error and `required`. Don’t also pass `aria-label`: the FormField label names it.',
    },
  ],
});
