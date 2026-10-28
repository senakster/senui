import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { TextInput } from '../TextInput/TextInput.js';
import { FormField, focusFirstInvalid, type FormFieldProps } from './FormField.js';
import * as stories from './FormField.stories.js';

function Field(props: Partial<FormFieldProps>) {
  return (
    <FormField label="Email" {...props}>
      {props.children ?? ((field) => <TextInput field={field} type="email" />)}
    </FormField>
  );
}

const ids = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '').split(' ').filter(Boolean);

describe('FormField', () => {
  test('the label names the control', () => {
    render(<Field />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  test("a consumer's id becomes the control's id, and the label still points at it", () => {
    render(<Field id="contact-email" />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('id', 'contact-email');
  });

  describe('description and error wiring (L04 decision 1)', () => {
    test('aria-describedby has the description, and the error only while one is set (WCAG 3.3.1)', () => {
      const { rerender } = render(<Field description="We reply here." />);
      const input = screen.getByRole('textbox');
      const description = screen.getByText('We reply here.');
      expect(ids(input, 'aria-describedby')).toEqual([description.id]);
      expect(input).toHaveAccessibleDescription('We reply here.');

      rerender(<Field description="We reply here." error="Enter an email address." />);
      // The message node, not the text span inside it.
      const error = screen.getByText('Enter an email address.').closest('[id]') as HTMLElement;
      expect(ids(input, 'aria-describedby')).toEqual([description.id, error.id]);
      expect(input).toHaveAccessibleDescription('We reply here. Enter an email address.');

      rerender(<Field description="We reply here." />);
      expect(ids(input, 'aria-describedby')).toEqual([description.id]);
    });

    test('aria-invalid is "false" when valid, never absent (ADR-0013; WCAG 3.3.1)', () => {
      const { rerender } = render(<Field />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      rerender(<Field error="Enter an email address." />);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      rerender(<Field error="" />);
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    test("the control's own aria-describedby is merged, not replaced (CONVENTIONS rule 10)", () => {
      render(
        <Field description="We reply here.">
          {(field) => <TextInput field={field} aria-describedby="privacy-note" />}
        </Field>,
      );
      expect(ids(screen.getByRole('textbox'), 'aria-describedby')).toContain('privacy-note');
      expect(ids(screen.getByRole('textbox'), 'aria-describedby')).toHaveLength(2);
    });

    test('with announce, the live region exists, empty, before the error arrives in it (WCAG 4.1.3)', () => {
      const { container, rerender } = render(<Field announce="polite" />);
      const region = container.querySelector('.senui-form-field__error');
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toBeEmptyDOMElement();
      rerender(<Field announce="polite" error="Enter an email address." />);
      // The same node: a live region rendered with its message would not be announced.
      expect(container.querySelector('.senui-form-field__error')).toBe(region);
      expect(region).toHaveTextContent('Enter an email address.');
    });

    test('the error node is always rendered, and is a live region only with announce (WCAG 4.1.3)', () => {
      const { container, rerender } = render(<Field />);
      const errorNode = container.querySelector('.senui-form-field__error');
      expect(errorNode).toBeEmptyDOMElement();
      expect(errorNode).not.toHaveAttribute('aria-live');
      rerender(<Field announce="polite" />);
      expect(errorNode).toHaveAttribute('aria-live', 'polite');
    });
  });

  test('required marks the control required and hides its marker (L04 decision 7)', () => {
    const { container } = render(<Field required />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeRequired();
    expect(container.querySelector('.senui-form-field__required')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('root ownership: merges its class (CONVENTIONS rule 2)', () => {
    const { container } = render(<Field className="checkout" />);
    expect(container.firstElementChild).toHaveClass('senui-form-field', 'checkout');
  });

  test('forwards its ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FormField ref={ref} label="Email">
        {(field) => <TextInput field={field} />}
      </FormField>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

test('`true` cast past the type is no error: nothing is marked invalid', () => {
  render(<Field error={true as unknown as string} />);
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
});

describe('development warnings', () => {
  // dev.ts keeps a module-level "already warned" set, so each test gets fresh modules.
  async function load() {
    vi.resetModules();
    const { FormField: Fresh } = await import('./FormField.js');
    const { TextInput: FreshInput } = await import('../TextInput/TextInput.js');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    return { FormField: Fresh, TextInput: FreshInput, warn };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a binding that reaches no control', async () => {
    const { FormField: Fresh, TextInput: FreshInput, warn } = await load();
    render(<Fresh label="Email">{() => <FreshInput aria-label="Email" />}</Fresh>);
    expect(warn.mock.calls[0]?.[0]).toContain('FormField rendered no control with its binding');
  });

  test('a binding passed to two controls', async () => {
    const { FormField: Fresh, TextInput: FreshInput, warn } = await load();
    render(
      <Fresh label="Email">
        {(field) => (
          <>
            <FreshInput field={field} />
            <FreshInput field={field} />
          </>
        )}
      </Fresh>,
    );
    expect(warn.mock.calls.map(([message]) => String(message)).join('\n')).toContain(
      'passed to more than one control',
    );
  });

  test('an empty label, even with the required marker, leaves the control unnamed', async () => {
    const { FormField: Fresh, TextInput: FreshInput, warn } = await load();
    render(
      <Fresh label="" required>
        {(field) => <FreshInput field={field} />}
      </Fresh>,
    );
    expect(warn.mock.calls[0]?.[0]).toContain('TextInput has no accessible name');
  });

  test('a correctly bound field is silent', async () => {
    const { FormField: Fresh, TextInput: FreshInput, warn } = await load();
    render(
      <Fresh label="Email" required>
        {(field) => <FreshInput field={field} />}
      </Fresh>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('focusFirstInvalid', () => {
  test('focuses the first aria-invalid control in document order, and returns it', () => {
    const { container } = render(
      <form>
        <Field label="Name" />
        <Field label="Email" error="Enter an email address." />
        <Field label="Phone" error="Enter a phone number." />
      </form>,
    );
    const form = container.querySelector('form') as HTMLFormElement;
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(focusFirstInvalid(form)).toBe(email);
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription('Enter an email address.');
  });

  test('skips a control that shows an error but cannot take focus', () => {
    const { container } = render(
      <form>
        <Field label="Plan" error="Pick a plan.">
          {(field) => <TextInput field={field} disabled />}
        </Field>
        <Field label="Email" error="Enter an email address." />
      </form>,
    );
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(focusFirstInvalid(container.querySelector('form') as HTMLFormElement)).toBe(email);
    expect(email).toHaveFocus();
  });

  test('ignores a natively invalid control that shows no error (a noValidate form)', () => {
    const { container } = render(
      <form noValidate>
        <Field label="Phone">
          {(field) => <TextInput field={field} type="tel" pattern="\d+" defaultValue="1 2" />}
        </Field>
        <Field label="Email" error="Enter an email address." />
      </form>,
    );
    expect(focusFirstInvalid(container.querySelector('form') as HTMLFormElement)).toBe(
      screen.getByRole('textbox', { name: 'Email' }),
    );
  });

  test('returns null, and leaves focus alone, when everything is valid', () => {
    const { container } = render(
      <form>
        <Field />
      </form>,
    );
    expect(focusFirstInvalid(container.querySelector('form') as HTMLFormElement)).toBeNull();
    expect(document.body).toHaveFocus();
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    const { container } = render(<Story label="Changed label" />);
    // The input's name, not a role query (a password input has no textbox role) or the label's text
    // (which includes the hidden required marker).
    expect(container.querySelector('input')).toHaveAccessibleName('Changed label');
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
