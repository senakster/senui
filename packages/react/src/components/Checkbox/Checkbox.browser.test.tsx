import { composeStories } from '@storybook/react-vite';
import { render } from '@testing-library/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { Button } from '../Button/Button.js';
import { CheckboxGroup } from '../CheckboxGroup/CheckboxGroup.js';
import * as groupStories from '../CheckboxGroup/CheckboxGroup.stories.js';
import { Switch } from '../Switch/Switch.js';
import { TextInput } from '../TextInput/TextInput.js';
import * as switchStories from '../Switch/Switch.stories.js';
import { Checkbox } from './Checkbox.js';
import * as checkboxStories from './Checkbox.stories.js';

// Real key presses, clicks, layout and computed styles (Chromium) for Checkbox, CheckboxGroup and
// Switch: the L05 criteria the plan assigns to Playwright.
describe.each([
  ['Checkbox', 'checkbox', () => <Checkbox label="Subscribe" />],
  ['Switch', 'switch', () => <Switch label="Wi-Fi" />],
] as const)('%s in a browser', (_name, role, element) => {
  test('Space toggles it; Enter does not', async () => {
    const { getByRole } = render(element());
    const control = getByRole(role);
    control.focus();
    await userEvent.keyboard('{Enter}');
    expect(control).not.toBeChecked();
    await userEvent.keyboard(' ');
    expect(control).toBeChecked();
  });

  test('a click on the label toggles it', async () => {
    const { getByRole, container } = render(element());
    await userEvent.click(container.querySelector('label') as HTMLLabelElement);
    expect(getByRole(role)).toBeChecked();
  });

  test('draws focus as an offset outline, not a box-shadow (ADR-0005)', async () => {
    const { getByRole } = render(element());
    await userEvent.tab();
    const style = getComputedStyle(getByRole(role));
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.boxShadow).toBe('none');
  });
});

describe('hit area (WCAG 2.5.8, L05 decision 15)', () => {
  test.each([
    ['Checkbox', 'checkbox', <Checkbox key="c" aria-label="Select all" />],
    ['Switch', 'switch', <Switch key="s" aria-label="Wi-Fi" />],
  ] as const)('%s is at least 24×24 px with no visible label', (_name, role, element) => {
    const { getByRole } = render(element);
    const box = getByRole(role).getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
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
});

// L05 review (2026-10-20), each fix locked by a test.
describe('L05 review fixes', () => {
  const submitForm = (children: ReactNode) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {children}
      <Button type="submit">Send</Button>
      <Button type="reset" variant="secondary">
        Clear
      </Button>
    </form>
  );

  test('a required group still blocks when its first option is disabled', async () => {
    const { getByRole } = render(
      submitForm(
        <CheckboxGroup legend="Topics" required="Choose at least one topic.">
          <Checkbox value="legacy" label="Legacy" disabled />
          <Checkbox value="news" label="News" />
        </CheckboxGroup>,
      ),
    );
    await userEvent.click(getByRole('button', { name: 'Send' }));
    const news = getByRole('checkbox', { name: 'News' });
    await expect.poll(() => document.activeElement).toBe(news);
    expect(news).toHaveAttribute('aria-invalid', 'true');
  });

  test('a required group still blocks when its options mount after it', async () => {
    function Late() {
      const [topics, setTopics] = useState<string[]>([]);
      useEffect(() => {
        setTopics(['News', 'Events']);
      }, []);
      return (
        <CheckboxGroup legend="Topics" required="Choose at least one topic.">
          {topics.map((topic) => (
            <Checkbox key={topic} value={topic} label={topic} />
          ))}
        </CheckboxGroup>
      );
    }
    const { getByRole } = render(submitForm(<Late />));
    await expect.poll(() => document.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    await userEvent.click(getByRole('button', { name: 'Send' }));
    await expect.poll(() => document.activeElement).toBe(getByRole('checkbox', { name: 'News' }));
  });

  test('a form reset puts the group back, so a required group blocks again', async () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(
      submitForm(
        <CheckboxGroup
          legend="Topics"
          required="Choose at least one topic."
          onValueChange={onValueChange}
        >
          <Checkbox value="news" label="News" />
          <Checkbox value="events" label="Events" />
        </CheckboxGroup>,
      ),
    );
    const news = getByRole('checkbox', { name: 'News' });
    await userEvent.click(news);
    await userEvent.click(getByRole('button', { name: 'Clear' }));
    expect(news).not.toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    await userEvent.click(getByRole('button', { name: 'Send' }));
    await expect.poll(() => document.activeElement).toBe(news);
  });

  test.each([
    ['Checkbox', 'checkbox', () => <Checkbox label="Subscribe" />],
    ['Switch', 'switch', () => <Switch label="Wi-Fi" />],
  ] as const)('a form reset keeps an uncontrolled %s in step', async (_name, role, element) => {
    const { getByRole } = render(submitForm(element()));
    const control = getByRole(role);
    await userEvent.click(control);
    await userEvent.click(getByRole('button', { name: 'Clear' }));
    expect(control).not.toBeChecked();
    // State and DOM agree: one click checks it again (out of step, it would stay unchecked).
    await userEvent.click(control);
    expect(control).toBeChecked();
  });

  test('a required consent box: submit marks and focuses it; checking it clears that', async () => {
    const { getByRole } = render(submitForm(<Checkbox label="I accept the terms" required />));
    await userEvent.click(getByRole('button', { name: 'Send' }));
    const box = getByRole('checkbox') as HTMLInputElement;
    await expect.poll(() => document.activeElement).toBe(box);
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(box.validationMessage);
    await userEvent.click(box);
    expect(box).toHaveAttribute('aria-invalid', 'false');
    expect(box).not.toHaveAttribute('aria-describedby');
  });

  test.each([
    [
      'Switch with a small track token',
      () => (
        <Switch
          label="Wi-Fi"
          style={{ '--senui-switch-track-size': 'var(--senui-space-4)' } as CSSProperties}
        />
      ),
      'switch',
      24,
    ],
    [
      'Checkbox with a large box token',
      () => (
        <Checkbox
          label="Subscribe"
          style={{ '--senui-checkbox-box': 'var(--senui-space-8)' } as CSSProperties}
        />
      ),
      'checkbox',
      32,
    ],
  ] as const)('%s keeps the input at least the target and the box', (_case, element, role, min) => {
    const { getByRole } = render(element());
    const box = getByRole(role).getBoundingClientRect();
    expect(box.height).toBeGreaterThanOrEqual(min);
  });
});

describe('CheckboxGroup required submit (L05 decisions 12 and 13)', () => {
  test('blocks the submit, focuses the first box, and shows the message on the group', async () => {
    const { getByRole } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <CheckboxGroup legend="Topics" required="Choose at least one topic.">
          <Checkbox value="news" label="News" />
          <Checkbox value="releases" label="Releases" />
        </CheckboxGroup>
        <Button type="submit">Subscribe</Button>
      </form>,
    );
    await userEvent.click(getByRole('button', { name: 'Subscribe' }));
    const first = getByRole('checkbox', { name: 'News' });
    await expect.poll(() => document.activeElement).toBe(first);
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(first).toHaveAccessibleDescription('Choose at least one topic.');

    await userEvent.click(getByRole('checkbox', { name: 'Releases' }));
    await expect.poll(() => first.getAttribute('aria-invalid')).toBe('false');
  });
});

// ADR-0013 (found by Emil with Narrator, 2026-10-20): with no aria-invalid attribute, Chromium
// exposes a natively invalid control as invalid to assistive technology from page load. A probe of
// the accessibility tree showed an explicit "false" overrides it. Each case below is natively
// invalid before any interaction, so each must carry aria-invalid="false" until a submit attempt.
describe('natively invalid but untouched: aria-invalid is "false", not absent (ADR-0013)', () => {
  test.each([
    ['a required Checkbox', () => <Checkbox label="I accept the terms" required />, 'checkbox'],
    [
      'the first box of a required CheckboxGroup',
      () => (
        <CheckboxGroup legend="Topics" required="Choose at least one topic.">
          <Checkbox value="news" label="News" />
          <Checkbox value="releases" label="Releases" />
        </CheckboxGroup>
      ),
      'checkbox',
    ],
    [
      'a TextInput with an invalid value',
      () => <TextInput aria-label="Email" type="email" defaultValue="ada@" />,
      'textbox',
    ],
  ] as const)('%s', (_case, element, role) => {
    const { getAllByRole } = render(element());
    const control = getAllByRole(role)[0] as HTMLInputElement;
    expect(control.matches(':invalid')).toBe(true);
    expect(control).toHaveAttribute('aria-invalid', 'false');
  });
});

// The rendered contrast check jsdom can't do: every story with the real CSS.
describe.each([
  ['Checkbox', checkboxStories],
  ['CheckboxGroup', groupStories],
  ['Switch', switchStories],
] as const)('axe with rendered colour contrast: %s stories', (_name, stories) => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_story, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container, { contrast: true });
  });
});
