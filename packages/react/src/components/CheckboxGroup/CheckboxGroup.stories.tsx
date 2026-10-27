import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { Checkbox } from '../Checkbox/Checkbox.js';
import { CheckboxGroup } from './CheckboxGroup.js';

const topics = (
  <>
    <Checkbox value="news" label="News" />
    <Checkbox value="releases" label="Releases" />
    <Checkbox value="events" label="Events" />
  </>
);

const meta = {
  title: 'Components/CheckboxGroup',
  component: CheckboxGroup,
  args: { legend: 'Topics', children: topics, onValueChange: fn() },
  argTypes: {
    error: { control: 'text' },
    description: { control: 'text' },
    required: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: ['releases'] } };

export const WithDescription: Story = {
  args: { description: 'Choose what we write to you about.' },
};

/** The error is described on the fieldset once; each box is marked invalid. */
export const WithError: Story = {
  args: { error: 'Choose at least one topic.' },
};

/** A disabled fieldset disables every box in it. */
export const Disabled: Story = { args: { disabled: true, defaultValue: ['news'] } };

/**
 * A required group in a form: with nothing checked, the submit is blocked, focus moves to the first
 * box, and the group shows the `required` message (L05 decisions 12 and 13).
 */
export const RequiredSubmit: Story = {
  args: { required: 'Choose at least one topic.' },
  render: (args) => (
    <form
      style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <CheckboxGroup {...args} />
      <Button type="submit">Subscribe</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Subscribe' }));
    const first = canvas.getByRole('checkbox', { name: 'News' });
    await expect(first).toHaveFocus();
    await expect(first).toHaveAttribute('aria-invalid', 'true');
  },
};

/** For forced colours: L08's gate screenshots it with forced colours emulated. */
export const ForcedColors: Story = {
  args: { error: 'Choose at least one topic.', defaultValue: ['news'] },
  tags: ['forced-colors'],
};
