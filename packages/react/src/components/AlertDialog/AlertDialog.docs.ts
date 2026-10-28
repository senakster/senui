import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { AlertDialogProps } from './AlertDialog.js';
import type * as stories from './AlertDialog.stories.js';

export const docs = defineComponentDocs<AlertDialogProps, typeof stories>()({
  component: 'AlertDialog',
  summary: 'A confirmation that interrupts the user before a destructive or irreversible action.',
  description:
    'A modal `<dialog role="alertdialog">` with a required `description`, a Cancel button that takes focus when it opens, and your `action`. Esc cancels, and a click outside it never closes it. It shares Dialog’s behaviour and styles.',
  useWhen: [
    'The user is about to delete, discard or overwrite something that can’t be undone.',
    'An action needs an explicit yes before it runs.',
  ],
  dontUseWhen: [
    {
      when: 'It holds a form or a task rather than a yes-or-no confirmation.',
      alternative: { component: 'Dialog' },
    },
    {
      when: 'The action can be undone.',
      alternative: {
        none: 'Run the action and offer an undo in the page instead of asking first.',
      },
    },
    {
      when: 'It only informs the user of something that happened.',
      alternative: {
        pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
        note: 'Show a status or alert message in the page.',
      },
    },
  ],
  related: ['Dialog', 'Button'],
  examples: ['Default', 'Open', 'WithDetails', 'ActionLoading'],
  composition: [],
});
