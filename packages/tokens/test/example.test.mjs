import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { buildTokens } from '../sd.config.mjs';

// examples/example.tokens.json is documentation; this keeps it valid as the pipeline changes.
test('the example token set builds without errors', async () => {
  const url = new URL('../examples/example.tokens.json', import.meta.url);
  const tokens = JSON.parse(await readFile(url, 'utf8'));
  const { errors, css } = await buildTokens({ tokens });
  expect(errors).toEqual([]);
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
});

// Regression: the stock shadow shorthand inlined the light colour, so shadows ignored dark mode.
test('a shadow that references a public colour token follows the theme', async () => {
  const url = new URL('../examples/example.tokens.json', import.meta.url);
  const tokens = JSON.parse(await readFile(url, 'utf8'));
  const { css } = await buildTokens({ tokens });
  expect(css).toContain('--senui-elevation-1: 0px 1px 2px 0px var(--senui-color-shadow);');
});
