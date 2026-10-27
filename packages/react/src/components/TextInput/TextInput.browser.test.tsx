import { composeStories } from '@storybook/react-vite';
import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { TextInput } from './TextInput.js';
import * as stories from './TextInput.stories.js';

// Real layout, focus and computed styles (Chromium).
describe('TextInput in a browser', () => {
  test.each(['sm', 'md', 'lg'] as const)('meets the 24 px target minimum (%s)', (size) => {
    const { getByRole } = render(<TextInput size={size} aria-label="Search" />);
    const box = getByRole('textbox').getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  });

  test.each(['sm', 'md', 'lg'] as const)(
    'invalid changes neither size nor text position (%s)',
    (size) => {
      const { getByRole, rerender } = render(<TextInput size={size} aria-label="Search" />);
      const input = getByRole('textbox');
      const measure = () => {
        const style = getComputedStyle(input);
        const border = parseFloat(style.borderInlineStartWidth);
        return {
          box: input.getBoundingClientRect(),
          border,
          textInset: border + parseFloat(style.paddingInlineStart),
        };
      };
      const valid = measure();
      rerender(<TextInput size={size} aria-label="Search" aria-invalid />);
      const invalid = measure();
      expect(invalid.box.width).toBe(valid.box.width);
      expect(invalid.box.height).toBe(valid.box.height);
      expect(invalid.textInset).toBe(valid.textInset);
      // Shape, not colour alone (WCAG 1.4.1): the border is thicker.
      expect(invalid.border).toBeGreaterThan(valid.border);
    },
  );

  test('draws focus as an offset outline, not a box-shadow (ADR-0005)', async () => {
    const { getByRole } = render(<TextInput aria-label="Search" />);
    await userEvent.tab();
    const style = getComputedStyle(getByRole('textbox'));
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.boxShadow).toBe('none');
  });

  test('a standalone native error sets aria-invalid on submit; the browser keeps its own focus move', async () => {
    const { getByRole } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextInput aria-label="Email" type="email" required />
        <button type="submit">Send</button>
      </form>,
    );
    await userEvent.click(getByRole('button'));
    const input = getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    await userEvent.type(input, 'ada@example.com');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});

// The contract's keyboard rows, one key-named test each, traced by check-keyboard-trace.mjs (L08).
describe('TextInput keyboard', () => {
  test('printable character: types into the field', async () => {
    const { getByRole } = render(<TextInput aria-label="Name" />);
    const input = getByRole('textbox');
    await userEvent.type(input, 'Ada');
    expect(input).toHaveValue('Ada');
  });

  test('Enter: submits its form (implicit submission)', async () => {
    const onSubmit = vi.fn();
    const { getByRole } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <TextInput aria-label="Search" />
      </form>,
    );
    getByRole('textbox').focus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  test('Home, End: move the caret to the start and the end', async () => {
    const { getByRole } = render(<TextInput aria-label="Name" defaultValue="Ada" />);
    const input = getByRole('textbox') as HTMLInputElement;
    input.focus();
    // From the middle, so each press has to move the caret.
    input.setSelectionRange(1, 1);
    await userEvent.keyboard('{Home}');
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 0]);
    await userEvent.keyboard('{End}');
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
  });
});

describe('axe with rendered colour contrast, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container, { contrast: true });
  });
});
