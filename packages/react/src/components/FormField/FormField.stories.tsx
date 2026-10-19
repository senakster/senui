import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type SubmitEvent } from 'react';
import { flushSync } from 'react-dom';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { TextInput } from '../TextInput/TextInput.js';
import { FormField, focusFirstInvalid } from './FormField.js';

const meta = {
  title: 'Components/FormField',
  component: FormField,
  args: {
    label: 'Email',
    children: (field) => <TextInput field={field} type="email" autoComplete="email" />,
  },
  argTypes: {
    required: { control: 'boolean' },
    error: { control: 'text' },
    description: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty, with a label only. */
export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'We only use it to reply to you.' },
};

/** The marker is hidden from assistive technology; the input's own `required` is announced. */
export const Required: Story = { args: { required: true } };

export const Filled: Story = {
  args: {
    children: (field) => <TextInput field={field} type="email" defaultValue="ada@example.com" />,
  },
};

/** An error from your own validation or the server: the `error` prop. */
export const WithError: Story = {
  args: {
    description: 'We only use it to reply to you.',
    error: 'Enter an email address like name@example.com.',
    children: (field) => <TextInput field={field} type="email" defaultValue="ada@" />,
  },
};

export const Disabled: Story = {
  args: {
    children: (field) => <TextInput field={field} defaultValue="ada@example.com" disabled />,
  },
};

export const ReadOnly: Story = {
  args: {
    label: 'Order number',
    description: 'Assigned when the order was placed.',
    children: (field) => <TextInput field={field} defaultValue="ORD-1042" readOnly />,
  },
};

/** Long labels and messages wrap; nothing is cut off (WCAG 1.4.10). */
export const LongText: Story = {
  args: {
    label: 'The email address we should send the order confirmation and the delivery updates to',
    description: 'Use an address you check often: the delivery window is only confirmed by email.',
    error: 'This address bounced last time we wrote to it. Check it, or use a different one.',
  },
};

/**
 * The browser's own constraints (`required`, `type="email"`) with no validation code. Nothing looks
 * invalid before a submit attempt. On submit, the first invalid field takes focus and every invalid
 * field shows the browser's message here instead of in a bubble; an error clears once the value is
 * valid.
 */
export const NativeValidation: Story = {
  render: () => (
    <form
      style={{ display: 'grid', gap: '1rem' }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormField label="Name" required>
        {(field) => <TextInput field={field} autoComplete="name" />}
      </FormField>
      <FormField label="Email" required>
        {(field) => <TextInput field={field} type="email" autoComplete="email" />}
      </FormField>
      <div>
        <Button type="submit">Send</Button>
      </div>
    </form>
  ),
  // A whole form: one field's controls can't drive it.
  parameters: { controls: { disable: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole('textbox', { name: 'Name' });
    // Typing and clearing a field makes it :user-invalid to the browser, but it isn't shown as
    // invalid until a submit attempt.
    await userEvent.type(name, 'Ada');
    await userEvent.clear(name);
    await userEvent.tab();
    await expect(name).not.toHaveAttribute('aria-invalid');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(name).toHaveFocus();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
  },
};

/**
 * The submit pattern for your own validation (L04 decision 3): set `error`s, let React render them,
 * then focus the first invalid field, which reads its label, description and error together.
 */
export const SubmitWithErrors: Story = {
  render: function Render() {
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const text = (key: string) => {
        const value = data.get(key);
        return typeof value === 'string' ? value.trim() : '';
      };
      const next: typeof errors = {};
      if (!text('name')) next.name = 'Enter your name.';
      if (!/^\S+@\S+\.\S+$/.test(text('email')))
        next.email = 'Enter an email address like name@example.com.';
      flushSync(() => {
        setErrors(next);
      });
      focusFirstInvalid(form);
    }

    return (
      <form noValidate onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <FormField label="Name" error={errors.name} required>
          {(field) => <TextInput field={field} name="name" autoComplete="name" />}
        </FormField>
        <FormField
          label="Email"
          description="We only use it to reply to you."
          error={errors.email}
          required
        >
          {(field) => <TextInput field={field} name="email" type="email" autoComplete="email" />}
        </FormField>
        <div>
          <Button type="submit">Send</Button>
        </div>
      </form>
    );
  },
  parameters: { controls: { disable: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name' }), 'Ada');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    const email = canvas.getByRole('textbox', { name: 'Email' });
    await expect(email).toHaveFocus();
    await expect(email).toHaveAccessibleDescription(
      'We only use it to reply to you. Enter an email address like name@example.com.',
    );
  },
};

/**
 * Validation as the user types, with `announce="polite"`: the message is announced when it changes,
 * without moving focus. Use this only for on-change validation.
 */
export const AnnounceOnChange: Story = {
  args: { label: 'New password' },
  // The error comes from the typed value, so it has no control.
  argTypes: { error: { control: false } },
  render: function Render(args) {
    const [value, setValue] = useState('');
    const error = value.length > 0 && value.length < 8 ? 'Use at least 8 characters.' : undefined;
    return (
      <FormField {...args} announce="polite" error={error}>
        {(field) => (
          <TextInput
            field={field}
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value);
            }}
          />
        )}
      </FormField>
    );
  },
};

/** Every state together, for forced colours. L08's gate screenshots it with forced colours emulated. */
export const ForcedColors: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <FormField label="Default" description="A description.">
        {(field) => <TextInput field={field} />}
      </FormField>
      <FormField label="Required" required>
        {(field) => <TextInput field={field} />}
      </FormField>
      <FormField label="Invalid" error="An error message.">
        {(field) => <TextInput field={field} defaultValue="Wrong" />}
      </FormField>
      <FormField label="Disabled">
        {(field) => <TextInput field={field} defaultValue="Disabled" disabled />}
      </FormField>
    </div>
  ),
  parameters: { controls: { disable: true }, forcedColors: 'active' },
};
