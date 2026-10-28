import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { FormFieldProps } from './FormField.js';
import type * as stories from './FormField.stories.js';

export const docs = defineComponentDocs<FormFieldProps, typeof stories>()({
  component: 'FormField',
  summary: 'A label, description and error message for one text-entry control, wired to it.',
  description:
    'Renders the label, the optional `description` and the `error`, and passes the control the wiring through its `children` function: `{(field) => <TextInput field={field} />}`. Set `error` to show a message; `focusFirstInvalid(form)` moves focus to the first field with one after a failed submit.',
  useWhen: [
    'A text-entry control needs a visible label, help text or an error message.',
    'A form validates fields and shows the errors next to them.',
  ],
  dontUseWhen: [
    {
      when: 'The control is a checkbox or a switch.',
      alternative: {
        component: 'Checkbox',
        note: 'Checkbox and Switch carry their own label, description and error.',
      },
    },
    {
      when: 'The control is a group of checkboxes.',
      alternative: { component: 'CheckboxGroup' },
    },
  ],
  related: ['TextInput', 'Checkbox', 'CheckboxGroup'],
  examples: ['Default', 'WithDescription', 'Required', 'WithError', 'Disabled'],
  composition: [],
});
