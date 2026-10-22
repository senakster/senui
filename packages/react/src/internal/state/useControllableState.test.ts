import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

// dev.ts keeps a module-level "already warned" set, so each test gets a fresh module.
async function load() {
  vi.resetModules();
  return (await import('./useControllableState.js')).useControllableState;
}

const name = { component: 'Switch', prop: 'checked' };
const noop = () => undefined;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useControllableState', () => {
  test('uncontrolled: owns the value and reports changes', async () => {
    const useControllableState = await load();
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: false, onChange, name }),
    );
    expect(result.current[0]).toBe(false);
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  test('controlled: the prop wins, and setValue only reports', async () => {
    const useControllableState = await load();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: boolean }) =>
        useControllableState({ value, defaultValue: false, onChange, name }),
      { initialProps: { value: false } },
    );
    act(() => {
      result.current[1](true);
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(result.current[0]).toBe(false); // unchanged until the owner passes the new value
    rerender({ value: true });
    expect(result.current[0]).toBe(true);
  });

  test('does not report a change to the same value', async () => {
    const useControllableState = await load();
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 'a', onChange, name }),
    );
    act(() => {
      result.current[1]('a');
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('ignores defaultValue changes after mount, as native inputs do', async () => {
    const useControllableState = await load();
    const { result, rerender } = renderHook(
      ({ defaultValue }: { defaultValue: number }) =>
        useControllableState({ value: undefined, defaultValue, name }),
      { initialProps: { defaultValue: 1 } },
    );
    rerender({ defaultValue: 2 });
    expect(result.current[0]).toBe(1);
  });

  test.each([
    ['uncontrolled to controlled', undefined, true, 'from uncontrolled to controlled'],
    ['controlled to uncontrolled', true, undefined, 'from controlled to uncontrolled'],
  ])('switching %s warns once in development', async (_label, first, second, phrase) => {
    const useControllableState = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = renderHook(
      ({ value }: { value: boolean | undefined }) =>
        useControllableState({ value, defaultValue: false, onChange: noop, name }),
      { initialProps: { value: first } },
    );
    rerender({ value: second });
    rerender({ value: first });
    rerender({ value: second });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain(`Switch is changing ${phrase}`);
    expect(warn.mock.calls[0]?.[0]).toContain('`defaultChecked`');
  });

  test('staying controlled or uncontrolled never warns', async () => {
    const useControllableState = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = renderHook(
      ({ value }: { value: boolean }) =>
        useControllableState({ value, defaultValue: false, onChange: noop, name }),
      { initialProps: { value: false } },
    );
    rerender({ value: true });
    rerender({ value: false });
    expect(warn).not.toHaveBeenCalled();
  });

  test('setValue keeps its identity across value changes', async () => {
    const useControllableState = await load();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 0, name }),
    );
    const first = result.current[1];
    act(() => {
      first(1);
    });
    expect(result.current[0]).toBe(1);
    expect(result.current[1]).toBe(first);
  });

  test('uncontrolled: updater calls in one handler chain', async () => {
    const useControllableState = await load();
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 0, onChange, name }),
    );
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  test('controlled with no onChange warns once that the control is frozen', async () => {
    const useControllableState = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = renderHook(
      ({ value }: { value: boolean }) => useControllableState({ value, defaultValue: false, name }),
      { initialProps: { value: false } },
    );
    rerender({ value: true });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('Switch has `checked` but no `onCheckedChange`');
  });

  test('readOnly silences the frozen-control warning', async () => {
    const useControllableState = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() =>
      useControllableState({ value: true, defaultValue: false, name, readOnly: true }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test('controlled to uncontrolled continues from the last controlled value', async () => {
    const useControllableState = await load();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const initialProps: { value: string | undefined } = { value: 'a' };
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 'default', onChange: noop, name }),
      { initialProps },
    );
    rerender({ value: 'b' });
    rerender({ value: undefined });
    expect(result.current[0]).toBe('b');
  });
});
