import { defineConfig } from 'tsdown';

// ADR-0003. Peer dependencies (react, react-dom) are external by default. CSS is copied into
// dist and exported as files, never imported from JS (ADR-0001).
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  // dist mirrors src, so styles/index.css's `@import '../components/<Name>/<Name>.css'` resolves.
  // scripts/check-dist-css.mjs fails the check if one doesn't.
  copy: [
    { from: 'src/styles/*.css', to: 'dist/styles' },
    // flatten: false keeps the path below src/, so the target is dist, not dist/components.
    { from: 'src/components/**/*.css', to: 'dist', flatten: false },
  ],
  publint: true,
});
