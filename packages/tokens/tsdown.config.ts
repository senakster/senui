import { defineConfig } from 'tsdown';

// ADR-0003. The token build (ADR-0002) lands in L01; this only builds the JS entry.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  publint: true,
});
