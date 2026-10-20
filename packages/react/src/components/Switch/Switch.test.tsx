import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { Switch } from './Switch.js';
import * as stories from './Switch.stories.js';

describe('Switch', () => {
  test('is a native checkbox with role="switch"', () => {
    render(<Switch label="Wi-Fi" />);
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(control.tagName).toBe('INPUT');
    expect(control).toHaveAttribute('type', 'checkbox');
    expect(control).not.toHaveAttribute('aria-checked');
  });

  test('its accessible name is the same on and off (L05 decision 10)', () => {
    render(<Switch label="Wi-Fi" />);
    const control = screen.getByRole('switch');
    const off = control.getAttribute('aria-label') ?? '';
    expect(control).toHaveAccessibleName('Wi-Fi');
    fireEvent.click(control);
    expect(control).toBeChecked();
    expect(control).toHaveAccessibleName('Wi-Fi');
    expect(control.getAttribute('aria-label') ?? '').toBe(off);
  });

  test('clicking the label toggles it and reports the new state', () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Wi-Fi" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText('Wi-Fi'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  test('className goes on the row; other props and the ref on the input', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(<Switch label="Wi-Fi" className="wide" name="wifi" ref={ref} />);
    expect(container.firstElementChild).toHaveClass('senui-switch', 'wide');
    expect(ref.current).toHaveAttribute('name', 'wifi');
  });

  test('the description is linked', () => {
    render(<Switch label="Dark mode" description="Follows your system." />);
    expect(screen.getByRole('switch')).toHaveAccessibleDescription('Follows your system.');
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    render(<Story label="Changed label" />);
    expect(screen.getByRole('switch', { name: 'Changed label' })).toBeInTheDocument();
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
