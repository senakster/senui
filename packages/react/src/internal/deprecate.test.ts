import { afterEach, describe, expect, test, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return (await import('./deprecate.js')).deprecate;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('deprecate', () => {
  test('warns once per component and prop, with the migration note', async () => {
    const deprecate = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    deprecate('Button', 'kind', 'Use `variant` instead.');
    deprecate('Button', 'kind', 'Use `variant` instead.');
    deprecate('Button', 'tone', 'Use `variant` instead.');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toBe(
      '[senui] Button: `kind` is deprecated and will be removed in the next major version. Use `variant` instead.',
    );
  });

  test('importing never throws where `process` is undefined', async () => {
    const { isDevelopment } = await import('./dev.js');
    const missingProcess = () => {
      throw new ReferenceError('process is not defined');
    };
    expect(isDevelopment(missingProcess)).toBe(false);
    expect(isDevelopment(() => 'development')).toBe(true);
    expect(isDevelopment(() => undefined)).toBe(true);
  });

  test('is silent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const deprecate = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    deprecate('Button', 'kind', 'Use `variant` instead.');
    expect(warn).not.toHaveBeenCalled();
  });
});
