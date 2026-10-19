import { render } from '@testing-library/react';
import { createRef, forwardRef, type ComponentPropsWithoutRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

// dev.ts keeps a module-level "already warned" set, so each test gets fresh modules.
async function load() {
  vi.resetModules();
  const { useComposedRefs } = await import('./refs.js');
  const { useNameCheck } = await import('./useNameCheck.js');
  const Example = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(
    function Example(props, forwardedRef) {
      const ref = useComposedRefs(forwardedRef, useNameCheck('Example'));
      return <button type="button" {...props} ref={ref} />;
    },
  );
  return Example;
}

afterEach(() => {
  vi.restoreAllMocks();
});

const icon = <svg aria-hidden="true" />;

describe('useNameCheck', () => {
  test.each([
    ['visible text', { children: 'Save' }],
    ['aria-label', { 'aria-label': 'Close', children: icon }],
    ['aria-labelledby', { 'aria-labelledby': 'title', children: icon }],
  ])('is silent for a name from %s', async (_label, props) => {
    const Example = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Example {...props} />);
    expect(warn).not.toHaveBeenCalled();
  });

  test('warns about an empty aria-label', async () => {
    const Example = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Example aria-label=" ">{icon}</Example>);
    expect(warn.mock.calls[0]?.[0]).toContain('Example has an empty `aria-label`');
  });

  test('warns about an icon with no name', async () => {
    const Example = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Example>{icon}</Example>);
    expect(warn.mock.calls[0]?.[0]).toContain('Example has no accessible name');
  });

  test('is silent for an input named by a <label> element', async () => {
    vi.resetModules();
    const { useNameCheck } = await import('./useNameCheck.js');
    function Input() {
      return <input id="email" ref={useNameCheck('Input')} />;
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <>
        <label htmlFor="email">Email</label>
        <Input />
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test('warns about an input whose only label is empty, or holds only hidden text', async () => {
    vi.resetModules();
    const { useNameCheck } = await import('./useNameCheck.js');
    function Input() {
      return <input id="email" ref={useNameCheck('Input')} />;
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <>
        <label htmlFor="email">
          <span aria-hidden="true">*</span>
        </label>
        <Input />
      </>,
    );
    expect(warn.mock.calls[0]?.[0]).toContain('Input has no accessible name');
  });

  test('the forwarded ref still receives the element', async () => {
    const Example = await load();
    const ref = createRef<HTMLButtonElement>();
    render(<Example ref={ref}>Save</Example>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
