import { defineConfig } from 'tsdown';

// ADR-0003. Peer dependencies (react, react-dom) are external by default. CSS is copied into
// dist and exported as files, never imported from JS (ADR-0001); that wiring lands with L03.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  publint: true,
});
