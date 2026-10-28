import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Switch, type SwitchProps } from './Switch.js';

/**
 * The stories use the `label` branch of the props. Storybook's arg types can't follow the three-way
 * name union, and collapse it to `never`.
 */
type LabelledProps = Extract<SwitchProps, { label: ReactNode }>;

const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { label: 'Wi-Fi', onCheckedChange: fn() },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    description: { control: 'text' },
  },
} satisfies Meta<LabelledProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Off. */
export const Default: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const WithDescription: Story = {
  args: { label: 'Dark mode', description: 'Follows your system until you change it here.' },
};

export const Disabled: Story = { args: { disabled: true } };
export const DisabledOn: Story = { args: { disabled: true, defaultChecked: true } };

/** Keyboard focus rings the track. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('switch')).toHaveFocus();
  },
};

/** A long label wraps beside the track, aligned to its first line (WCAG 1.4.10). */
export const LongLabel: Story = {
  args: {
    label: 'Send me a summary of everything that changed in my projects this week',
    description: 'Arrives on Monday mornings.',
  },
  render: (args) => (
    <div style={{ inlineSize: '24ch' }}>
      <Switch {...args} />
    </div>
  ),
};

/** Right to left: on is on the left. */
export const RightToLeft: Story = {
  args: { label: 'Wi-Fi', defaultChecked: true },
  render: (args) => (
    <div dir="rtl">
      <Switch {...args} />
    </div>
  ),
};

/** Every state: off, on, disabled. A fixed grid: no controls. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <Switch label="Off" />
      <Switch label="On" defaultChecked />
      <Switch label="Disabled, off" disabled />
      <Switch label="Disabled, on" disabled defaultChecked />
    </div>
  ),
};

/**
 * Matrix, for forced colours: the accessibility gate screenshots it with forced colours emulated.
 * By hand: DevTools → Rendering → forced-colors: active. The thumb must stay visible, on and off.
 */
export const ForcedColors: Story = {
  ...Matrix,
  tags: ['forced-colors'],
  parameters: { controls: { disable: true } },
};
