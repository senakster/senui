import { describe, expectTypeOf, test } from 'vitest';
import type { CheckboxProps } from '../../components/Checkbox/Checkbox.js';
import type * as checkboxStories from '../../components/Checkbox/Checkbox.stories.js';
import { defineComponentDocs, type ComponentName } from './component-docs.js';

const define = defineComponentDocs<CheckboxProps, typeof checkboxStories>();

const valid = {
  component: 'Checkbox',
  summary: 'A single yes-or-no choice.',
  description: 'Use `label` for its visible name.',
  useWhen: ['A form needs a yes-or-no answer.'],
  dontUseWhen: [
    { when: 'The change applies at once.', alternative: { component: 'Switch' } },
    { when: 'It navigates.', alternative: { element: 'a', note: 'A link goes somewhere.' } },
  ],
  related: ['CheckboxGroup', 'Switch'],
  examples: ['Default', 'Indeterminate'],
  composition: [
    { parent: 'CheckboxGroup', ignored: ['checked', 'required'], required: ['value'], note: 'x' },
  ],
} as const;

describe('ComponentDocs', () => {
  test('ComponentName is exactly the entry’s components', () => {
    expectTypeOf<ComponentName>().toEqualTypeOf<
      | 'AlertDialog'
      | 'Button'
      | 'Checkbox'
      | 'CheckboxGroup'
      | 'Dialog'
      | 'EmptyState'
      | 'FormField'
      | 'Switch'
      | 'TextInput'
    >();
  });

  test('accepts valid guidance', () => {
    define(valid);
  });

  test('rejects a story the module doesn’t export, and the default meta', () => {
    // @ts-expect-error no such story
    define({ ...valid, examples: ['NoSuchStory'] });
    // @ts-expect-error the meta isn't a story
    define({ ...valid, examples: ['default'] });
  });

  test('rejects names that aren’t components, and the component itself', () => {
    // @ts-expect-error a function export, not a component
    define({ ...valid, related: ['focusFirstInvalid'] });
    // @ts-expect-error a component can't be related to itself
    define({ ...valid, related: ['Checkbox'] });
    // @ts-expect-error nor its own alternative
    define({ ...valid, dontUseWhen: [{ when: 'x', alternative: { component: 'Checkbox' } }] });
  });

  test('rejects a composition prop the component doesn’t have', () => {
    // @ts-expect-error no such prop
    define({ ...valid, composition: [{ parent: 'CheckboxGroup', ignored: ['nope'], note: 'x' }] });
  });

  test('requires a note for a native element or a pattern', () => {
    // @ts-expect-error a native alternative needs a note
    define({ ...valid, dontUseWhen: [{ when: 'x', alternative: { element: 'a' } }] });
  });
});
