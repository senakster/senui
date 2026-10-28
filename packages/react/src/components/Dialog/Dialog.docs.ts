import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { DialogProps } from './Dialog.js';
import type * as stories from './Dialog.stories.js';

export const docs = defineComponentDocs<DialogProps, typeof stories>()({
  component: 'Dialog',
  summary: 'A modal window for a task the user does before returning to the page.',
  description:
    'A native `<dialog>` opened with `showModal()`: the page behind it can’t be used, and it doesn’t scroll, until the dialog closes. Esc and the close button ask to close through `onOpenChange`, which a controlled owner may refuse. `footer` holds its actions, and `cancelLabel` adds a Cancel button.',
  useWhen: [
    'The user edits or creates something in a short, focused task, such as a form, without leaving the page.',
    'The task must be finished or cancelled before the page can be used again.',
  ],
  dontUseWhen: [
    {
      when: 'It confirms a destructive or irreversible action.',
      alternative: { component: 'AlertDialog' },
    },
    {
      when: 'It shows a short message that needs no response.',
      alternative: {
        pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
        note: 'Show a status or alert message in the page.',
      },
    },
    {
      when: 'The user needs to read or use the page while it is open.',
      alternative: {
        none: 'Show the content in the page, or in a non-modal panel; a modal dialog blocks the page.',
      },
    },
    {
      when: 'The content is long enough to be a page of its own.',
      alternative: { element: 'a', note: 'Link to a page instead.' },
    },
  ],
  related: ['AlertDialog', 'Button'],
  examples: ['Default', 'WithDescription', 'WithFooter', 'LongContent', 'Nested'],
  composition: [],
});
