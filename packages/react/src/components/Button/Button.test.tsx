import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, type SyntheticEvent } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { Button } from './Button.js';
import * as stories from './Button.stories.js';

describe('Button', () => {
  test('renders a native button, type="button" by default', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  test('a consumer can choose type="submit"', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  test('calls onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  describe('root ownership (CONVENTIONS rule 2)', () => {
    test('always renders its class and resolved defaults', () => {
      render(<Button className="checkout">Pay</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('senui-button', 'checkout');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'md');
    });

    test("a consumer's data-variant can't override the prop", () => {
      render(
        <Button variant="danger" {...{ 'data-variant': 'ghostly' }}>
          Delete
        </Button>,
      );
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
    });
  });

  describe('loading (L03 decisions 3–5)', () => {
    test('stays focusable and ignores activation', () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-state', 'loading');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    test("doesn't submit its form", () => {
      const onSubmit = vi.fn((event: SyntheticEvent) => {
        event.preventDefault();
      });
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading>
            Send
          </Button>
        </form>,
      );
      fireEvent.click(screen.getByRole('button'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('keeps the accessible name and hides the spinner from assistive technology', () => {
      const { container } = render(<Button loading>Save</Button>);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(container.querySelector('.senui-button__spinner')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    test('takes precedence over disabled, so focus is never dropped', () => {
      render(
        <Button loading disabled>
          Save
        </Button>,
      );
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  test('disabled (not loading) uses native disabled', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test("a consumer's aria-disabled also blocks activation", () => {
    const onClick = vi.fn();
    render(
      <Button aria-disabled="true" onClick={onClick}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('icon-only takes its name from aria-label, and hides the icon itself', () => {
    const { container } = render(
      <Button icon={<img src="x.svg" alt="close icon" />} aria-label="Close" />,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(container.querySelector('.senui-button__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  test('onClickCapture is guarded too while unavailable', () => {
    const onClickCapture = vi.fn();
    render(
      <Button loading onClickCapture={onClickCapture}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClickCapture).not.toHaveBeenCalled();
  });

  test('aria-pressed makes it a toggle button', () => {
    render(<Button aria-pressed>Bold</Button>);
    expect(screen.getByRole('button', { name: 'Bold', pressed: true })).toBeInTheDocument();
  });

  test('forwards its ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// A story with controls must render from its args, or the controls silently do nothing (found by
// Emil: IconOnlyLoading ignored `variant`). Fixed grids disable their controls instead.
describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    const { container } = render(<Story variant="danger" />);
    expect(container.querySelector('.senui-button')).toHaveAttribute('data-variant', 'danger');
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
