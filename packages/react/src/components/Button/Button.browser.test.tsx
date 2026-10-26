import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { composeStories } from '@storybook/react-vite';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import * as stories from './Button.stories.js';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { Button } from './Button.js';

// Real layout and focus (Chromium). jsdom would measure every box as 0.
describe('Button in a browser', () => {
  test.each(['sm', 'md', 'lg'] as const)('loading keeps the width and height (%s)', (size) => {
    const { getByRole, rerender } = render(<Button size={size}>Save changes</Button>);
    const idle = getByRole('button').getBoundingClientRect();
    rerender(
      <Button size={size} loading>
        Save changes
      </Button>,
    );
    const loading = getByRole('button').getBoundingClientRect();
    expect(idle.width).toBeGreaterThan(0);
    expect(loading.width).toBe(idle.width);
    expect(loading.height).toBe(idle.height);
  });

  test('loading keeps the accessible name, with the real CSS applied (L03 decision 4)', () => {
    // Found by Emil's screen-reader run: `visibility: hidden` on the label also removed it from
    // the accessibility tree, so the loading button was announced with no name. jsdom doesn't
    // apply the CSS, so only a browser test can catch this.
    const { getByRole } = render(<Button loading>Save</Button>);
    expect(getByRole('button', { name: 'Save' })).toBeDefined();
  });

  // Real key presses (Playwright), not synthetic click events: the native button turns Enter and
  // Space into a click, and Button must neither block that when idle nor allow it when loading.
  test.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('%s activates it once', async (_key, keys) => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>Save</Button>);
    getByRole('button').focus();
    await userEvent.keyboard(keys);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('%s does nothing while loading', async (_key, keys) => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    getByRole('button').focus();
    await userEvent.keyboard(keys);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('focus stays on the button from idle to loading and back', () => {
    const { getByRole, rerender } = render(<Button>Save</Button>);
    getByRole('button').focus();
    rerender(<Button loading>Save</Button>);
    expect(document.activeElement).toBe(getByRole('button'));
    rerender(<Button>Save</Button>);
    expect(document.activeElement).toBe(getByRole('button'));
  });

  test.each(['sm', 'md', 'lg'] as const)('meets the 24×24 px target minimum (%s)', (size) => {
    const { getByRole } = render(
      <Button size={size} icon={<svg aria-hidden="true" />} aria-label="Close" />,
    );
    const box = getByRole('button').getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  });

  test('draws focus as an offset outline, not a box-shadow (ADR-0005)', () => {
    const { getByRole } = render(<Button>Save</Button>);
    const button = getByRole('button');
    button.focus();
    const style = getComputedStyle(button);
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.boxShadow).toBe('none');
  });
});

// The rendered contrast check jsdom can't do: every story with the real CSS, light theme (the
// page default). Evidence for 1.4.3 and 1.4.11 in Button.a11y.ts.
describe('axe with rendered colour contrast, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container, { contrast: true });
  });
});
