import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button, type ButtonSize, type ButtonVariant } from './Button.js';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const sizes: ButtonSize[] = ['sm', 'md', 'lg'];

/** A stand-in icon. Icons passed to Button are decorative: the button carries the name. */
function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="1em" height="1em" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const meta = {
  title: 'Components/Button',
  component: Button,
  // `onClick: fn()` logs every activation (click, Enter, Space) in the Actions panel, so keyboard
  // testing has something to observe. A loading or disabled button logs nothing.
  args: { children: 'Save', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: variants },
    size: { control: 'inline-radio', options: sizes },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete' } };

export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = { args: { disabled: true } };

/** Still focusable; activation is ignored; the width doesn't change. */
export const Loading: Story = { args: { loading: true } };

/** Rendered rather than set through args: the meta's default label can't be combined with `icon`. */
export const IconOnly: Story = {
  render: () => <Button icon={<CloseIcon />} aria-label="Close" />,
};

/** Keyboard focus shows the ring; a mouse click does not. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

/** Every variant at every size, idle, disabled and loading. */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {sizes.map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} {size}
            </Button>
          ))}
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
          <Button variant={variant} icon={<CloseIcon />} aria-label={`Close (${variant})`} />
        </div>
      ))}
    </div>
  ),
};

/**
 * Forced colours: open DevTools → Rendering → "Emulate CSS media feature forced-colors: active",
 * or turn on a Windows contrast theme. Every state must stay distinguishable by border and text.
 */
export const ForcedColors: Story = {
  ...Matrix,
  parameters: { docs: { description: { story: 'Check with forced-colors emulation on.' } } },
};
