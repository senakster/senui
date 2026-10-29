import { defineConfig } from 'tsdown';
import { buildDocs } from './scripts/build-docs.mjs';

// ADR-0003. Peer dependencies (react, react-dom) are external by default. CSS is copied into
// dist and exported as files, never imported from JS (ADR-0001).
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  // L10 decision 11: one file per module, so a bundler drops the components an app doesn't import
  // (`sideEffects` lists only CSS). In one bundled file, each component's `forwardRef(...)` call
  // and `displayName` assignment are statements a bundler must keep.
  unbundle: true,
  // dist mirrors src, so styles/index.css's `@import '../components/<Name>/<Name>.css'` resolves.
  // scripts/check-dist-css.mjs fails the check if one doesn't.
  copy: [
    { from: 'src/styles/*.css', to: 'dist/styles' },
    // flatten: false keeps the path below src/, so the target is dist, not dist/components.
    { from: 'src/components/**/*.css', to: 'dist', flatten: false },
  ],
  hooks: {
    // L09: components.json, llms.txt, llms-full.txt, docs/*.md and USAGE.md. This hook runs after
    // dist is cleaned and before publint, which checks that every `exports` entry exists.
    'build:before': async ({ options }) => {
      await buildDocs(options.cwd);
    },
  },
  publint: true,
});
