// Loads the TypeScript data modules (contracts, usage guidance, stories) through one Vite module
// runner, as one environment (L09 "Loading the data"). Node's own type stripping can't load them:
// they import each other with `.js` suffixes.
import { createServer, createServerModuleRunner } from 'vite';

/**
 * Runs `use(load)` with a loader for `/src/...` paths, then closes the runner and the server.
 *
 * @param {string} root The package root.
 * @param {(load: (path: string) => Promise<Record<string, unknown>>) => Promise<T>} use
 * @returns {Promise<T>}
 * @template T
 */
export async function withModuleLoader(root, use) {
  const server = await createServer({
    root,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    // Stories render JSX; React's automatic runtime, as the package's tsconfig sets it.
    oxc: { jsx: { runtime: 'automatic' } },
    server: { middlewareMode: true, hmr: false, ws: false },
  });
  const runner = createServerModuleRunner(server.environments.ssr, { hmr: false });
  try {
    return await use((path) => runner.import(path));
  } finally {
    await runner.close();
    await server.close();
  }
}
