import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { DistributiveOmit } from '../../types.js';
import { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button.js';

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

/**
 * The args an icon-only story passes through: everything the controls set, minus the meta's default
 * label and any name, because an icon-only button takes exactly one name and the story sets it.
 */
function iconOnlyArgs(args: ButtonProps) {
  const rest: Partial<ButtonProps> = { ...args };
  delete rest.children;
  delete rest['aria-label'];
  delete rest['aria-labelledby'];
  return rest as DistributiveOmit<ButtonProps, 'children' | 'aria-label' | 'aria-labelledby'>;
}

export const IconOnly: Story = {
  render: (args) => <Button {...iconOnlyArgs(args)} icon={<CloseIcon />} aria-label="Close" />,
};

export const IconOnlyLoading: Story = {
  ...IconOnly,
  args: { loading: true },
};

/** Named by visible text elsewhere on the page. */
export const IconOnlyLabelledBy: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span id="filters-heading">Clear filters</span>
      <Button {...iconOnlyArgs(args)} icon={<CloseIcon />} aria-labelledby="filters-heading" />
    </div>
  ),
};

/**
 * Unavailable but focusable, set by the consumer: activation is ignored and it looks disabled, but
 * it stays in the tab order, so a tooltip or description can explain why.
 */
export const AriaDisabled: Story = { args: { 'aria-disabled': 'true' } };

/** A toggle button: `aria-pressed` makes it announce "toggle button, pressed / not pressed". */
export const Toggle: Story = {
  args: { variant: 'secondary', children: 'Bold' },
  render: function Render(args) {
    const [pressed, setPressed] = useState(false);
    return (
      <Button
        {...args}
        aria-pressed={pressed}
        onClick={(event) => {
          setPressed((value) => !value);
          args.onClick?.(event);
        }}
      />
    );
  },
};

export const Pressed: Story = { args: { variant: 'secondary', 'aria-pressed': true } };

/** In a narrow space the label wraps rather than overflowing or being cut off (WCAG 1.4.10). */
export const LongLabel: Story = {
  args: { children: 'Save changes and continue to payment' },
  render: (args) => (
    <div style={{ inlineSize: '12ch' }}>
      <Button {...args} />
    </div>
  ),
};

/** Keyboard focus shows the ring; a mouse click does not. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

/** Every variant at every size, idle, disabled, loading, icon-only and pressed. A fixed grid: no controls. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
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
          <Button
            variant={variant}
            icon={<CloseIcon />}
            aria-label={`Close (${variant}, loading)`}
            loading
          />
          <Button variant={variant} aria-pressed>
            Pressed
          </Button>
        </div>
      ))}
    </div>
  ),
};

/**
 * Matrix, for forced colours. A page can't switch forced colours on itself, so the
 * `forced-colors` tag tells the accessibility gate to screenshot this story with forced colours
 * emulated, in light and dark schemes. By hand: DevTools → Rendering → "Emulate CSS media feature
 * forced-colors: active", or a Windows contrast theme. Every state must stay distinguishable by
 * border, text and the system colours.
 */
export const ForcedColors: Story = {
  ...Matrix,
  tags: ['forced-colors'],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Screenshot with forced colours emulated by the accessibility gate. To check by hand: DevTools → Rendering → forced-colors: active.',
      },
    },
  },
};
