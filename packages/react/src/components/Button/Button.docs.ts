import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { ButtonProps } from './Button.js';
import type * as stories from './Button.stories.js';

export const docs = defineComponentDocs<ButtonProps, typeof stories>()({
  component: 'Button',
  summary: 'Starts an action on the current page: submitting a form, opening a dialog, saving.',
  description:
    'A native `<button>`, `type="button"` unless you set `type="submit"`. `variant` sets its emphasis and `danger` marks a destructive action. `loading` keeps its width and focus while the action runs. An icon-only button takes the icon as `icon` and its name from `aria-label` or `aria-labelledby`.',
  useWhen: [
    'The user starts an action that happens on this page, such as saving, deleting or opening a dialog.',
    'A form is submitted (`type="submit"`).',
    'An option is turned on and off in place, as a toggle button with `aria-pressed`.',
  ],
  dontUseWhen: [
    {
      when: 'Activating it takes the user to another page or URL.',
      alternative: {
        element: 'a',
        note: 'Use a link with `href`: it opens in a new tab, can be bookmarked and is listed as a link.',
      },
    },
    {
      when: 'It turns a setting on or off that takes effect at once.',
      alternative: { component: 'Switch' },
    },
    {
      when: 'It records a yes-or-no answer that is submitted with a form.',
      alternative: { component: 'Checkbox' },
    },
  ],
  related: ['Dialog', 'AlertDialog', 'EmptyState'],
  examples: ['Default', 'Danger', 'Loading', 'IconOnly', 'Toggle'],
  composition: [],
});
