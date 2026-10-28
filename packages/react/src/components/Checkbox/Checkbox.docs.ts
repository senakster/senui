import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { CheckboxProps } from './Checkbox.js';
import type * as stories from './Checkbox.stories.js';

export const docs = defineComponentDocs<CheckboxProps, typeof stories>()({
  component: 'Checkbox',
  summary: 'A yes-or-no choice that is submitted or applied later, with its own label.',
  description:
    'A native `<input type="checkbox">` with its own `label`, `description` and `error`. `indeterminate` shows a mixed state, for a select-all box whose rows are partly selected. `className` and `style` go on the row; every other native attribute, and the ref, go on the input.',
  useWhen: [
    'A form asks a yes-or-no question, such as accepting terms or opting in to email.',
    'Several independent options can be chosen together, inside a CheckboxGroup.',
    'A select-all box controls a list of rows.',
  ],
  dontUseWhen: [
    {
      when: 'The change takes effect at once, without a submit.',
      alternative: { component: 'Switch' },
    },
    {
      when: 'Exactly one of several options can be chosen.',
      alternative: {
        element: 'input',
        note: 'Use radio buttons (`type="radio"`) in a `<fieldset>`: they allow exactly one choice.',
      },
    },
    {
      when: 'It starts an action rather than recording a choice.',
      alternative: { component: 'Button' },
    },
  ],
  related: ['CheckboxGroup', 'Switch', 'FormField'],
  examples: ['Default', 'WithDescription', 'Required', 'WithError', 'Indeterminate'],
  composition: [
    {
      parent: 'CheckboxGroup',
      ignored: ['checked', 'defaultChecked', 'required'],
      required: ['value'],
      note: 'The group owns the checked state as one value array, and its `required` and error apply to the group. Each checkbox gives its `value`; the group checks the ones whose value is in its array.',
    },
  ],
});
