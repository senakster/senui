import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { axeViolations, expectNoAxeViolations } from './axe.js';

describe('axe helper', () => {
  test('passes accessible markup', async () => {
    const { container } = render(<button type="button">Save</button>);
    await expectNoAxeViolations(container);
  });

  test('reports each violation with its rule and element', async () => {
    const { container } = render(
      <div>
        <button type="button" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- the fixture must violate axe */}
        <img src="x.png" />
      </div>,
    );
    const violations = await axeViolations(container);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^button-name \(critical\): .* at button$/),
        expect.stringMatching(/^image-alt \(critical\): /),
      ]),
    );
  });
});
