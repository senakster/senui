// @vitest-environment node
// L10 decision 7: deprecation is data, stated in words, and checked. Nothing in the package is
// deprecated yet, so these run the generator's checks and wording on made-up entries; the L10 probes
// (scope-decisions.md) ran them on a deprecated Button prop, value, branch and token.
import { describe, expect, test } from 'vitest';
import { deprecationErrors } from '../../../scripts/build-docs.mjs';
import { deprecatedText, propCells } from '../../../scripts/docs/wording.mjs';
import type { ManifestProp } from '../../manifest.js';

const size: ManifestProp = {
  name: 'size',
  type: 'ButtonSize',
  required: false,
  description: 'Every size meets the target minimum.',
  values: ['lg', 'md', 'sm'],
  deprecated: { useInstead: 'Use `scale` instead.' },
};
const noCss = { deprecated: {} };
const noMarkup = { dataAttributes: {} };

describe('deprecation', () => {
  test('reads as text, first in the description, for the prop and for a value', () => {
    expect(deprecatedText({ useInstead: 'Use `variant` instead.' })).toBe(
      'Deprecated. Use `variant` instead.',
    );
    expect(propCells(size).description).toBe(
      'Deprecated. Use `scale` instead. Every size meets the target minimum.',
    );
    const variant: ManifestProp = {
      name: 'variant',
      type: 'ButtonVariant',
      required: false,
      description: 'Visual emphasis.',
      values: ['ghost', 'subtle'],
      deprecatedValues: { subtle: { useInstead: 'Use `ghost` instead.' } },
    };
    expect(propCells(variant).description).toBe(
      "`'subtle'` is deprecated. Use `ghost` instead. Visual emphasis.",
    );
  });

  test('a deprecated prop must call deprecate(), outside a comment', () => {
    const props = { props: [size], axes: [] };
    const call = "deprecate('Button', 'size', 'Use `scale` instead.');";
    expect(deprecationErrors('Button', props, noCss, noMarkup, 'export {};')).toEqual([
      "Button: prop 'size' is @deprecated, but Button.tsx never calls deprecate('Button', 'size', …)",
    ]);
    expect(deprecationErrors('Button', props, noCss, noMarkup, `// ${call}`)).toHaveLength(1);
    expect(deprecationErrors('Button', props, noCss, noMarkup, `/* ${call} */`)).toHaveLength(1);
    expect(deprecationErrors('Button', props, noCss, noMarkup, `if (size) ${call}`)).toEqual([]);
  });

  test('a deprecated data value and its replacement both still render', () => {
    const css = {
      deprecated: {
        "[data-variant='subtle']": { useInstead: "Use `[data-variant='ghost']` instead." },
      },
    };
    const none = { props: [], axes: [] };
    expect(
      deprecationErrors(
        'Button',
        none,
        css,
        { dataAttributes: { 'data-variant': ['ghost', 'subtle'] } },
        '',
      ),
    ).toEqual([]);
    expect(
      deprecationErrors('Button', none, css, { dataAttributes: { 'data-variant': ['ghost'] } }, ''),
    ).toEqual([
      "Button.css: deprecated [data-variant='subtle'] needs both values rendered, but Button never renders [data-variant='subtle']",
    ]);
  });
});
