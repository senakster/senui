import { defineComponentDocs } from '../../internal/docs/component-docs.js';
import type { EmptyStateProps } from './EmptyState.js';
import type * as stories from './EmptyState.stories.js';

export const docs = defineComponentDocs<EmptyStateProps, typeof stories>()({
  component: 'EmptyState',
  summary: 'Says that a view has nothing to show, why, and what the user can do next.',
  description:
    'A heading at the `headingLevel` you choose, a `description`, an optional decorative `illustration`, and your `actions`. It adapts to the width of its container: compact below 30rem, stacked above. It is not a live region: when a list empties while the user is on it, tell them in your own status message.',
  useWhen: [
    'A list, table or search has no results.',
    'A user arrives before they have created anything, and needs a first action.',
    'Content couldn’t be loaded and the user can retry.',
  ],
  dontUseWhen: [
    {
      when: 'Content is still loading.',
      alternative: { none: 'Show a loading state; an empty state would say there is nothing.' },
    },
    {
      when: 'It is the only way the user learns that the content changed.',
      alternative: {
        pattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
        note: 'Also update a status message that is already in the page.',
      },
    },
    {
      when: 'The whole view is clickable, as a link or a button.',
      alternative: {
        none: 'Put the action in `actions`; an EmptyState inside a link or button can’t hold one.',
      },
    },
  ],
  related: ['Button'],
  examples: ['NoData', 'FirstUse', 'NoResults', 'DeletedLastItem', 'ErrorRecovery', 'InTableCell'],
  composition: [],
});
