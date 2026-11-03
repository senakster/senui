import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { REDUCED, reduceMotion } from '../../internal/testing/motion.js';
import { Switch } from './Switch.js';

// Real key presses, clicks and computed styles (Chromium) for Switch, the L05 criteria the plan
// assigns to Playwright. Its hit area and the shared review fixes are in Checkbox.browser.test.tsx.
describe('Switch in a browser', () => {
  test('Space: toggles it; Enter does not', async () => {
    const { getByRole } = render(<Switch label="Wi-Fi" />);
    const control = getByRole('switch');
    control.focus();
    await userEvent.keyboard('{Enter}');
    expect(control).not.toBeChecked();
    await userEvent.keyboard(' ');
    expect(control).toBeChecked();
  });

  test('a click on the label toggles it', async () => {
    const { getByRole, container } = render(<Switch label="Wi-Fi" />);
    await userEvent.click(container.querySelector('label') as HTMLLabelElement);
    expect(getByRole('switch')).toBeChecked();
  });

  test('draws focus as an offset outline, not a box-shadow (ADR-0005)', async () => {
    const { getByRole } = render(<Switch label="Wi-Fi" />);
    await userEvent.tab();
    const style = getComputedStyle(getByRole('switch'));
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.boxShadow).toBe('none');
  });
});

describe('Switch thumb', () => {
  // The thumb moves by its start margin (ADR-0018: a logical property, no `:dir()`). Read physically:
  // the left margin pushes it right, the right margin pushes it left. Read while it may still be
  // transitioning, so the tests poll for the side, not an exact distance.
  const margin = (control: HTMLElement, side: 'left' | 'right') =>
    parseFloat(getComputedStyle(control, '::before').getPropertyValue(`margin-${side}`));

  test('moves to the end when on', async () => {
    const { getByRole } = render(<Switch label="Wi-Fi" />);
    const control = getByRole('switch');
    expect(margin(control, 'left')).toBe(0);
    await userEvent.click(control);
    await expect.poll(() => margin(control, 'left')).toBeGreaterThan(0);
  });

  test('moves to the start when on in right-to-left', async () => {
    const { getByRole } = render(
      <div dir="rtl">
        <Switch label="Wi-Fi" />
      </div>,
    );
    const control = getByRole('switch');
    await userEvent.click(control);
    await expect.poll(() => margin(control, 'right')).toBeGreaterThan(0);
    expect(margin(control, 'left')).toBe(0);
  });

  // ADR-0024's Instant pattern. Toggled by `click()` and read in the same frame, because a real
  // click can outlast the transition. A zero-length transition creates nothing and fires no event,
  // so the end position is read, not waited for.
  const thumbTransitions = (control: HTMLElement) =>
    control
      .getAnimations({ subtree: true })
      .filter(
        (animation): animation is CSSTransition =>
          animation instanceof CSSTransition &&
          animation.effect instanceof KeyframeEffect &&
          animation.effect.pseudoElement === '::before',
      )
      .map((transition) => transition.transitionProperty);
  const isMargin = (property: string) => property.startsWith('margin');

  test('slides the thumb by default', () => {
    const { getByRole } = render(<Switch label="Wi-Fi" />);
    const control = getByRole('switch');
    control.click();
    expect(thumbTransitions(control).filter(isMargin)).toHaveLength(1);
  });

  test.each(REDUCED)(
    'with %s, the thumb reaches its end at once, and its colour still fades',
    async (how) => {
      await reduceMotion(how);
      const { getByRole } = render(<Switch label="Wi-Fi" />);
      const control = getByRole('switch');
      control.click();
      const transitions = thumbTransitions(control);
      expect(transitions.filter(isMargin)).toEqual([]);
      expect(transitions).toContain('background-color');
      const at = margin(control, 'left');
      expect(at).toBeGreaterThan(0);
      await Promise.all(
        control.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
      );
      expect(margin(control, 'left')).toBe(at);
    },
  );
});
