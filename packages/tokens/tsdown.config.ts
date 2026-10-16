import { defineConfig } from 'tsdown';

// ADR-0003 and ADR-0004. `node sd.config.mjs` writes src/generated/ first; tsdown bundles the
// typed map and copies tokens.css into dist as a file, never importing it from JS.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  copy: [{ from: 'src/generated/tokens.css' }],
  publint: true,
});
