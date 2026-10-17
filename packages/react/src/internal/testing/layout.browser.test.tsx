import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

// Guards the harness: browser tests exist because jsdom measures every box as 0. If this project
// ever falls back to jsdom, this test fails instead of every layout assertion passing vacuously.
describe('browser project', () => {
  test('has real layout and focus', () => {
    const { getByRole } = render(
      <button type="button" style={{ inlineSize: '120px' }}>
        Save
      </button>,
    );
    const button = getByRole('button');
    expect(button.getBoundingClientRect().width).toBe(120);
    button.focus();
    expect(button.matches(':focus-visible')).toBe(true);
  });
});
