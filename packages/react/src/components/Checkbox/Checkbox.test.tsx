import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { Checkbox } from './Checkbox.js';
import * as stories from './Checkbox.stories.js';

const ids = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '').split(' ').filter(Boolean);

describe('Checkbox', () => {
  test('renders a native checkbox named by its label, which toggles it', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Subscribe" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(box.tagName).toBe('INPUT');
    fireEvent.click(screen.getByText('Subscribe'));
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  test('controlled: checked follows the prop', () => {
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return <Checkbox label="Subscribe" checked={checked} onCheckedChange={setChecked} />;
    }
    render(<Controlled />);
    const box = screen.getByRole('checkbox');
    fireEvent.click(box);
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
  });

  test('native onChange still passes through, for form libraries', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Subscribe" onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  describe('indeterminate (L05 decisions 6 and 7)', () => {
    test('is the DOM property, with no aria-checked', () => {
      render(
        <Checkbox label="Select all" checked={false} indeterminate onCheckedChange={vi.fn()} />,
      );
      const box = screen.getByRole<HTMLInputElement>('checkbox');
      expect(box.indeterminate).toBe(true);
      expect(box).not.toHaveAttribute('aria-checked');
      expect(box).toHaveAttribute('data-indeterminate');
    });

    test('a click clears the property, and the prop re-asserts it on the next render', () => {
      // A consumer that updates `checked` but keeps `indeterminate`: the browser clears the
      // property on click, and the re-render must put it back (L05 decision 7).
      function KeepsMixed() {
        const [checked, setChecked] = useState(false);
        return (
          <Checkbox
            label="Select all"
            checked={checked}
            indeterminate
            onCheckedChange={setChecked}
          />
        );
      }
      render(<KeepsMixed />);
      const box = screen.getByRole<HTMLInputElement>('checkbox');
      fireEvent.click(box);
      expect(box).toBeChecked();
      expect(box.indeterminate).toBe(true);
    });
  });

  describe('description and error', () => {
    test('aria-describedby has the error id only while an error is set', () => {
      const { rerender } = render(<Checkbox label="Terms" description="Read them first." />);
      const box = screen.getByRole('checkbox');
      const description = screen.getByText('Read them first.');
      expect(ids(box, 'aria-describedby')).toEqual([description.id]);
      expect(box).toHaveAttribute('aria-invalid', 'false');

      rerender(<Checkbox label="Terms" description="Read them first." error="Accept the terms." />);
      const error = screen.getByText('Accept the terms.').closest('[id]') as HTMLElement;
      expect(ids(box, 'aria-describedby')).toEqual([description.id, error.id]);
      expect(box).toHaveAttribute('aria-invalid', 'true');
      expect(box).toHaveAccessibleDescription('Read them first. Accept the terms.');

      rerender(<Checkbox label="Terms" description="Read them first." />);
      expect(ids(box, 'aria-describedby')).toEqual([description.id]);
      expect(box).toHaveAttribute('aria-invalid', 'false');
    });

    test('required marks the input required and hides its marker', () => {
      const { container } = render(<Checkbox label="Terms" required />);
      expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeRequired();
      expect(container.querySelector('.senui-checkbox__required')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });
  });

  test('className and style go on the row; other props and the ref on the input', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Checkbox label="Subscribe" className="wide" style={{ order: 2 }} name="news" ref={ref} />,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveClass('senui-checkbox', 'wide');
    expect(row.style.order).toBe('2');
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute('name', 'news');
  });

  test('named by aria-label, it renders no label element', () => {
    const { container } = render(<Checkbox aria-label="Select all rows" />);
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument();
    expect(container.querySelector('label')).toBeNull();
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    const { container } = render(<Story label="Changed label" />);
    expect(container.querySelector('input')).toHaveAccessibleName('Changed label');
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
