import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TextInput, type TextInputProps, type TextInputSize } from './TextInput.js';

const sizes: TextInputSize[] = ['sm', 'md', 'lg'];

/**
 * The stories use the standalone, `aria-label` branch of the props. Storybook's arg types can't
 * follow the three-way name union, and collapse it to `never`.
 */
type StandaloneProps = Extract<TextInputProps, { 'aria-label': string }>;

/**
 * TextInput on its own, named with `aria-label`. Inside a form, use it through FormField, which
 * labels, describes and validates it (see Components/FormField).
 */
const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  args: { 'aria-label': 'Search', onChange: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: sizes },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<StandaloneProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty. */
export const Default: Story = {};

/** The placeholder is a hint, never the label. */
export const Placeholder: Story = { args: { type: 'search', placeholder: 'Products, orders…' } };

export const Filled: Story = { args: { defaultValue: 'Blue lamp' } };

export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = { args: { disabled: true, defaultValue: 'Blue lamp' } };

/** Focusable and submitted, but not editable. */
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'ORD-1042' } };

/**
 * Standalone, the consumer sets `aria-invalid` and describes the error itself. Inside a FormField,
 * pass `error` to the field instead.
 */
export const Invalid: Story = {
  render: (args) => (
    <>
      <TextInput {...args} aria-invalid aria-describedby="search-error" />
      <p id="search-error">Type at least 2 characters.</p>
    </>
  ),
};

/** The args minus the meta's `aria-label`, for a story that names the input another way. */
function withoutLabel(args: StandaloneProps): Omit<StandaloneProps, 'aria-label'> {
  const rest: Partial<StandaloneProps> = { ...args };
  delete rest['aria-label'];
  return rest;
}

/** Named by visible text elsewhere on the page. */
export const LabelledBy: Story = {
  args: { autoComplete: 'off' },
  render: (args) => (
    <>
      <p id="coupon-heading">Coupon code</p>
      <TextInput {...withoutLabel(args)} aria-labelledby="coupon-heading" />
    </>
  ),
};

/** Keyboard focus shows the ring. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('textbox')).toHaveFocus();
  },
};

/** A long value scrolls inside the field; it is never cut off from editing. */
export const LongValue: Story = {
  args: { defaultValue: 'A value much longer than the field is wide, which scrolls as you type' },
};

/** Every size, empty, filled, placeholder, invalid, read-only and disabled. A fixed grid: no controls. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {sizes.map((size) => (
        <div key={size} style={{ display: 'grid', gap: '0.5rem' }}>
          <TextInput size={size} aria-label={`Empty (${size})`} />
          <TextInput size={size} aria-label={`Filled (${size})`} defaultValue="Filled" />
          <TextInput size={size} aria-label={`Placeholder (${size})`} placeholder="Placeholder" />
          <TextInput
            size={size}
            aria-label={`Invalid (${size})`}
            defaultValue="Invalid"
            aria-invalid
          />
          <TextInput
            size={size}
            aria-label={`Read-only (${size})`}
            defaultValue="Read-only"
            readOnly
          />
          <TextInput
            size={size}
            aria-label={`Disabled (${size})`}
            defaultValue="Disabled"
            disabled
          />
        </div>
      ))}
    </div>
  ),
};

/**
 * Matrix, for forced colours: the `forced-colors` tag tells the accessibility gate to screenshot it
 * with forced colours emulated. By hand: DevTools → Rendering → forced-colors: active. Invalid must
 * stay distinguishable by its thicker border, disabled by GrayText.
 */
export const ForcedColors: Story = {
  ...Matrix,
  tags: ['forced-colors'],
  parameters: { controls: { disable: true } },
};
