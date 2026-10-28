import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { withControls } from '../../internal/testing/stories.js';
import { Checkbox } from '../Checkbox/Checkbox.js';
import { CheckboxGroup } from './CheckboxGroup.js';
import * as stories from './CheckboxGroup.stories.js';

const ids = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '').split(' ').filter(Boolean);

function Topics(props: Partial<Parameters<typeof CheckboxGroup>[0]>) {
  return (
    <CheckboxGroup legend="Topics" {...props}>
      <Checkbox value="news" label="News" />
      <Checkbox value="releases" label="Releases" />
    </CheckboxGroup>
  );
}

describe('CheckboxGroup', () => {
  test('renders fieldset > legend, named by the legend', () => {
    const { container } = render(<Topics />);
    const group = screen.getByRole('group', { name: 'Topics' });
    expect(group.tagName).toBe('FIELDSET');
    expect(container.querySelector('fieldset > legend')).toHaveTextContent('Topics');
  });

  test('every box is aria-invalid and described by the description and error; the fieldset is not (WCAG 3.3.1)', () => {
    // NVDA reads a group's name on entry but never its description (Emil's run, 2026-10-20), so
    // the description and error describe every box, whichever one takes focus.
    render(<Topics description="Pick any." error="Choose at least one topic." />);
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby');
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('aria-invalid', 'true');
      expect(box).toHaveAccessibleDescription('Pick any. Choose at least one topic.');
    }
  });

  test("a consumer's aria-describedby on the group stays on the fieldset", () => {
    render(<Topics aria-describedby="extra-hint" />);
    expect(ids(screen.getByRole('group'), 'aria-describedby')).toEqual(['extra-hint']);
  });

  test('warns about props a group overrides, and about an empty required message', async () => {
    vi.resetModules();
    const { CheckboxGroup: Group } = await import('./CheckboxGroup.js');
    const { Checkbox: Box } = await import('../Checkbox/Checkbox.js');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Group legend="Topics" required="">
        <Box value="news" label="News" defaultChecked required />
      </Group>,
    );
    const messages = warn.mock.calls.map(([message]) => String(message)).join('\n');
    expect(messages).toContain('ignores `defaultChecked`, `required`');
    expect(messages).toContain('empty `required` message');
    vi.restoreAllMocks();
  });

  test('no box is aria-invalid while the group is valid', () => {
    render(<Topics />);
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('aria-invalid', 'false');
    }
  });

  test('value: checking and unchecking reports the checked values', () => {
    const onValueChange = vi.fn();
    render(<Topics defaultValue={['news']} onValueChange={onValueChange} />);
    expect(screen.getByRole('checkbox', { name: 'News' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Releases' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['news', 'releases']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'News' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['releases']);
  });

  test('the group name is the default for every box', () => {
    render(<Topics name="topics" />);
    for (const box of screen.getAllByRole('checkbox'))
      expect(box).toHaveAttribute('name', 'topics');
  });

  describe('required (L05 decision 12)', () => {
    test('no box carries required; the legend shows a hidden marker', () => {
      const { container } = render(<Topics required="Choose at least one topic." />);
      for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeRequired();
      expect(container.querySelector('.senui-checkbox-group__required')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    test('blocks the form while nothing is checked; checking one clears it', () => {
      const { container } = render(
        <form>
          <Topics required="Choose at least one topic." />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;
      expect(form.checkValidity()).toBe(false);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Releases' }));
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('development warnings', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('a child Checkbox without a value', async () => {
      vi.resetModules();
      const { CheckboxGroup: Group } = await import('./CheckboxGroup.js');
      const { Checkbox: Box } = await import('../Checkbox/Checkbox.js');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Group legend="Topics">
          <Box label="News" />
        </Group>,
      );
      expect(warn.mock.calls[0]?.[0]).toContain('has no `value`');
    });
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    render(<Story legend="Changed legend" />);
    expect(screen.getByRole('group', { name: 'Changed legend' })).toBeInTheDocument();
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
