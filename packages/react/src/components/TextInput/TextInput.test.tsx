import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { TextInput } from './TextInput.js';
import * as stories from './TextInput.stories.js';

describe('TextInput', () => {
  test('renders a native text input, type="text" by default', () => {
    render(<TextInput aria-label="Search" />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'text');
  });

  test('root ownership: merged class, resolved size (CONVENTIONS rule 2)', () => {
    render(<TextInput aria-label="Search" className="wide" {...{ 'data-size': 'xl' }} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('senui-text-input', 'wide');
    expect(input).toHaveAttribute('data-size', 'md');
  });

  test('standalone aria-invalid is a boolean, rendered "false" when not invalid (ADR-0013)', () => {
    const { rerender } = render(<TextInput aria-label="Search" aria-invalid={false} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
    rerender(<TextInput aria-label="Search" aria-invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  test('paste is not prevented, and the pasted value reaches onChange (WCAG 3.3.8)', () => {
    const onChange = vi.fn();
    render(<TextInput aria-label="Email" type="email" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    // fireEvent returns false if any handler called preventDefault().
    expect(fireEvent.paste(input, { clipboardData: { getData: () => 'ada@example.com' } })).toBe(
      true,
    );
    // jsdom doesn't insert clipboard text, so apply the browser's default action by hand.
    fireEvent.change(input, { target: { value: 'ada@example.com' } });
    expect(input).toHaveValue('ada@example.com');
    expect(onChange).toHaveBeenCalledOnce();
  });

  test('autoComplete and other native attributes pass through', () => {
    render(<TextInput aria-label="Email" autoComplete="email" name="email" maxLength={80} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('maxlength', '80');
  });

  test('forwards its ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextInput aria-label="Search" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    const { container } = render(<Story size="lg" />);
    expect(container.querySelector('.senui-text-input')).toHaveAttribute('data-size', 'lg');
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
