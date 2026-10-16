// Development-only diagnostics. Consumers' bundlers replace `process.env.NODE_ENV` at build time, as
// they do for React itself, so every warning below is removed from production bundles.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether to run development checks. Where nothing defines `process` (a browser loading the package
 * through an import map, some ESM CDNs), reading it throws; that counts as production, so importing
 * the package never fails. A `typeof process` guard is deliberately avoided: webpack 5 doesn't
 * polyfill `process`, so the guard would switch warnings off in webpack development builds, where
 * the bundler replaces the expression below.
 */
export function isDevelopment(readNodeEnv: () => string | undefined): boolean {
  try {
    return readNodeEnv() !== 'production';
  } catch {
    return false;
  }
}

export const DEV = isDevelopment(() => process.env.NODE_ENV);

const warned = new Set<string>();

/** Logs `message` once per `key` per page load, in development only. */
export function warnOnce(key: string, message: string): void {
  if (!DEV || warned.has(key)) return;
  warned.add(key);
  console.warn(`[senui] ${message}`);
}
