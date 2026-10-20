import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox, type CheckboxProps } from './Checkbox.js';

/**
 * The stories use the `label` branch of the props. Storybook's arg types can't follow the three-way
 * name union, and collapse it to `never`.
 */
type LabelledProps = Extract<CheckboxProps, { label: ReactNode }>;

/** For fixed mixed-state examples, which never change. */
const noop = () => undefined;

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: 'Email me about new releases', onCheckedChange: fn() },
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    error: { control: 'text' },
    description: { control: 'text' },
  },
} satisfies Meta<LabelledProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Unchecked. */
export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

/** The mixed state, from the native property (never aria-checked). */
/**
 * The mixed state, controlled (L05 decision 6): a click checks it and the story clears
 * `indeterminate` in `onCheckedChange`, as a consumer would (decision 7).
 */
export const Indeterminate: Story = {
  render: function Render(args) {
    const [state, setState] = useState({ checked: false, indeterminate: true });
    return (
      <Checkbox
        {...args}
        checked={state.checked}
        indeterminate={state.indeterminate}
        onCheckedChange={(checked) => {
          setState({ checked, indeterminate: false });
          args.onCheckedChange?.(checked);
        }}
      />
    );
  },
};

export const WithDescription: Story = {
  args: { description: 'About one email a month. Unsubscribe at any time.' },
};

/** A consent box: must be checked to submit. The marker is hidden; `required` is announced. */
export const Required: Story = { args: { label: 'I accept the terms', required: true } };

export const WithError: Story = {
  args: {
    label: 'I accept the terms',
    required: true,
    error: 'Accept the terms to continue.',
  },
};

/**
 * A consent box in a form, with the browser's own constraint: submitting it unchecked moves focus
 * to the box, marks it invalid and shows the browser's message; checking it clears them.
 */
export const RequiredSubmit: Story = {
  args: { label: 'I accept the terms', required: true },
  render: (args) => (
    <form
      style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Checkbox {...args} />
      <button type="submit">Continue</button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    const box = canvas.getByRole('checkbox');
    await expect(box).toHaveFocus();
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(box);
    await expect(box).toHaveAttribute('aria-invalid', 'false');
  },
};

export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };

/** Long labels wrap beside the box; nothing is cut off (WCAG 1.4.10). */
export const LongLabel: Story = {
  args: {
    label:
      'Send me a summary of everything that changed in my projects this week, including comments and mentions',
  },
  render: (args) => (
    <div style={{ inlineSize: '24ch' }}>
      <Checkbox {...args} />
    </div>
  ),
};

/** Keyboard focus rings the box, not the row. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('checkbox')).toHaveFocus();
  },
};

/**
 * Select all: the parent's checked and indeterminate states are computed by the consumer from its
 * rows (L05: select-all logic is the consumer's). The parent is named with `aria-label` here, as in
 * a table header with no visible text of its own.
 */
export const SelectAll: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const rows = ['Invoice 1042', 'Invoice 1043', 'Invoice 1044'];
    const [selected, setSelected] = useState<string[]>(['Invoice 1043']);
    const all = selected.length === rows.length;
    const some = selected.length > 0 && !all;
    return (
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <Checkbox
          aria-label="Select all invoices"
          checked={all}
          indeterminate={some}
          onCheckedChange={(checked) => {
            setSelected(checked ? rows : []);
          }}
        />
        {rows.map((row) => (
          <Checkbox
            key={row}
            label={row}
            checked={selected.includes(row)}
            onCheckedChange={(checked) => {
              setSelected((current) =>
                checked ? [...current, row] : current.filter((item) => item !== row),
              );
            }}
          />
        ))}
      </div>
    );
  },
};

/** Every state: unchecked, checked, indeterminate, invalid, disabled. A fixed grid: no controls. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <Checkbox label="Unchecked" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate checked={false} onCheckedChange={noop} />
      <Checkbox label="Invalid" error="An error message." />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled, checked" disabled defaultChecked />
      <Checkbox
        label="Disabled, indeterminate"
        disabled
        indeterminate
        checked={false}
        onCheckedChange={noop}
      />
    </div>
  ),
};

/**
 * Matrix, for forced colours: `parameters.forcedColors: 'active'` tells L08's gate to screenshot it
 * with forced colours emulated. By hand: DevTools → Rendering → forced-colors: active. The box, the
 * check and the dash must stay visible in every state.
 */
export const ForcedColors: Story = {
  ...Matrix,
  parameters: { controls: { disable: true }, forcedColors: 'active' },
};
