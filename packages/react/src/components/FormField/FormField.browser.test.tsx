import { composeStories } from '@storybook/react-vite';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { Button } from '../Button/Button.js';
import { TextInput } from '../TextInput/TextInput.js';
import { FormField } from './FormField.js';
import * as stories from './FormField.stories.js';

/** Two required fields and a submit button. Native constraint validation only. */
function NativeForm() {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormField label="Name" description="As on your card." required>
        {(field) => <TextInput field={field} />}
      </FormField>
      <FormField label="Email" required>
        {(field) => <TextInput field={field} type="email" />}
      </FormField>
      <Button type="submit">Send</Button>
      <Button type="reset" variant="secondary">
        Clear
      </Button>
    </form>
  );
}

// Real constraint validation, focus and :user-invalid (Chromium). jsdom implements none of the
// timing this depends on.
describe('FormField with native constraint validation', () => {
  test('nothing is invalid before a submit attempt, even after typing and clearing a field', async () => {
    const { getByRole } = render(<NativeForm />);
    const name = getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    await userEvent.type(name, 'Ada');
    await userEvent.clear(name);
    await userEvent.tab();
    // The browser now counts it as user-invalid; senui waits for a submit attempt.
    expect(name.matches(':user-invalid')).toBe(true);
    expect(name).toHaveAttribute('aria-invalid', 'false');
  });

  test('a validity check on an untouched form is not a submit attempt', () => {
    const { getByRole } = render(<NativeForm />);
    const name = getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    // act() renders whatever the `invalid` events set, so the assertion can't pass early.
    act(() => {
      (name.form as HTMLFormElement).checkValidity();
    });
    expect(name).toHaveAttribute('aria-invalid', 'false');
  });

  test('on submit, the first invalid field takes focus and is described by its error (WCAG 3.3.1)', async () => {
    const { getByRole } = render(<NativeForm />);
    await userEvent.click(getByRole('button', { name: 'Send' }));
    const name = getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    await expect.poll(() => document.activeElement).toBe(name);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(`As on your card. ${name.validationMessage}`);
    // Every invalid field shows its error, not only the focused one.
    expect(getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('an error stays until the value is valid, with the current message', async () => {
    const { getByRole } = render(<NativeForm />);
    await userEvent.click(getByRole('button', { name: 'Send' }));
    const email = getByRole('textbox', { name: 'Email' }) as HTMLInputElement;
    const missing = email.validationMessage;

    await userEvent.type(email, 'ada');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email.validationMessage).not.toBe(missing);
    expect(email).toHaveAccessibleDescription(email.validationMessage);

    await userEvent.type(email, '@example.com');
    expect(email).toHaveAttribute('aria-invalid', 'false');
    expect(email).not.toHaveAttribute('aria-describedby');
  });

  test('a form reset clears native errors', async () => {
    const { getByRole } = render(<NativeForm />);
    await userEvent.click(getByRole('button', { name: 'Send' }));
    await userEvent.click(getByRole('button', { name: 'Clear' }));
    expect(getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'false');
    expect(getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'false');
  });

  test('the error prop wins over a native error', async () => {
    const { getByRole } = render(
      <form>
        <FormField label="Email" error="That address is already registered." required>
          {(field) => <TextInput field={field} type="email" />}
        </FormField>
        <Button type="submit">Send</Button>
      </form>,
    );
    await userEvent.click(getByRole('button', { name: 'Send' }));
    expect(getByRole('textbox')).toHaveAccessibleDescription('That address is already registered.');
  });

  test('an invalid field looks the same as a valid one until a submit attempt', async () => {
    // L04 acceptance: no invalid styling before interaction. senui styles [aria-invalid] only.
    const { getByRole } = render(<NativeForm />);
    const name = getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    const email = getByRole('textbox', { name: 'Email' });
    await userEvent.type(email, 'ada@example.com');
    await userEvent.type(name, 'Ada');
    await userEvent.clear(name);
    await userEvent.tab();
    expect(name.matches(':user-invalid')).toBe(true);
    expect(getComputedStyle(name).borderColor).toBe(getComputedStyle(email).borderColor);
    expect(getComputedStyle(name).borderWidth).toBe(getComputedStyle(email).borderWidth);
  });
});

// Review findings (2026-10-19), each locked by a test.
describe('FormField review fixes', () => {
  test('focus reaches an earlier field invalid only through its error prop', async () => {
    const { getByRole } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <FormField label="Name" error="That name is taken.">
          {(field) => <TextInput field={field} defaultValue="Ada" />}
        </FormField>
        <FormField label="Email" required>
          {(field) => <TextInput field={field} type="email" />}
        </FormField>
        <Button type="submit">Send</Button>
      </form>,
    );
    await userEvent.click(getByRole('button', { name: 'Send' }));
    await expect.poll(() => document.activeElement).toBe(getByRole('textbox', { name: 'Name' }));
  });

  test('a native error clears when code sets a valid value', async () => {
    function SavedAddress() {
      const [email, setEmail] = useState('');
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <FormField label="Email" required>
            {(field) => (
              <TextInput
                field={field}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.currentTarget.value);
                }}
              />
            )}
          </FormField>
          <Button
            variant="secondary"
            onClick={() => {
              setEmail('ada@example.com');
            }}
          >
            Use my saved address
          </Button>
          <Button type="submit">Send</Button>
        </form>
      );
    }
    const { getByRole } = render(<SavedAddress />);
    const email = getByRole('textbox', { name: 'Email' });
    await userEvent.click(getByRole('button', { name: 'Send' }));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(getByRole('button', { name: 'Use my saved address' }));
    await expect.poll(() => email.getAttribute('aria-invalid')).toBe('false');
    expect(email).not.toHaveAttribute('aria-describedby');
  });

  test('the gap between label, description and control holds with TextInput’s CSS loaded', () => {
    const { getByRole, getByText } = render(
      <FormField label="Email" description="We reply here.">
        {(field) => <TextInput field={field} />}
      </FormField>,
    );
    const label = getByText('Email').getBoundingClientRect();
    const description = getByText('We reply here.');
    const input = getByRole('textbox').getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(description).marginBlockEnd);
    expect(gap).toBeGreaterThan(0);
    expect(description.getBoundingClientRect().top - label.bottom).toBeCloseTo(gap, 0);
    expect(input.top - description.getBoundingClientRect().bottom).toBeCloseTo(gap, 0);
  });

  test('with announce, native submit errors stay out of the live region', async () => {
    const { container, getByRole } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <FormField label="Email" required announce="polite">
          {(field) => <TextInput field={field} type="email" />}
        </FormField>
        <Button type="submit">Send</Button>
      </form>,
    );
    await userEvent.click(getByRole('button', { name: 'Send' }));
    const email = getByRole('textbox', { name: 'Email' }) as HTMLInputElement;
    expect(email).toHaveAccessibleDescription(email.validationMessage);
    const live = container.querySelector('[aria-live]');
    expect(live).toBeEmptyDOMElement();
  });
});

describe('axe with rendered colour contrast, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container, { contrast: true });
  });
});
