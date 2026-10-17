import { describe, expect, test } from 'vitest';
import { buildTokens, TOKEN_SCOPE } from '../sd.config.mjs';

const oklch = (l, c, h) => ({ colorSpace: 'oklch', components: [l, c, h] });

// A minimal fixture. The real tokens live in src/*.tokens.json and are written by hand.
const fixture = () => ({
  primitive: {
    color: {
      ink: { $type: 'color', $value: oklch(0.2, 0.02, 260) },
      paper: { $type: 'color', $value: oklch(0.98, 0.005, 260) },
      danger: { $type: 'color', $value: oklch(0.5, 0.2, 25) },
    },
  },
  color: {
    bg: {
      default: {
        $type: 'color',
        $value: '{primitive.color.paper}',
        $extensions: { senui: { dark: '{primitive.color.ink}', surface: true } },
      },
    },
    fg: {
      default: {
        $type: 'color',
        $value: '{primitive.color.ink}',
        $extensions: {
          senui: {
            dark: '{primitive.color.paper}',
            contrast: [{ against: '{color.bg.default}', min: 4.5 }],
          },
        },
      },
      // The [data-theme] base rule (ADR-0005) needs bg.default, fg.default and fg.accent.
      accent: {
        $type: 'color',
        $value: '{primitive.color.ink}',
        $extensions: {
          senui: {
            dark: '{primitive.color.paper}',
            contrast: [{ against: '{color.bg.default}', min: 4.5 }],
          },
        },
      },
    },
  },
  space: { 3: { $type: 'dimension', $value: { value: 12, unit: 'px' } } },
  motion: {
    duration: { fast: { $type: 'duration', $value: { value: 120, unit: 'ms' } } },
    distance: {
      sm: {
        $type: 'dimension',
        $value: { value: 8, unit: 'px' },
        $extensions: { senui: { reducedMotion: { value: 0, unit: 'px' } } },
      },
    },
  },
});

describe('buildTokens', () => {
  test('a valid tree builds without errors', async () => {
    const { errors, entries } = await buildTokens({ tokens: fixture() });
    expect(errors).toEqual([]);
    expect(entries.map((e) => e.key)).toEqual([
      'color.bg.default',
      'color.fg.accent',
      'color.fg.default',
      'motion.distance.sm',
      'motion.duration.fast',
      'space.3',
    ]);
  });

  test('primitives are resolved away, never emitted', async () => {
    const { css, ts } = await buildTokens({ tokens: fixture() });
    expect(css).not.toMatch(/primitive/);
    expect(ts).not.toMatch(/primitive/);
  });

  test('every colour token resolves through light-dark(), authored in oklch', async () => {
    const { css, entries } = await buildTokens({ tokens: fixture() });
    const colours = entries.filter((e) => e.type === 'color');
    expect(css.match(/light-dark\(/g)).toHaveLength(colours.length);
    expect(css).toMatch(/--senui-color-fg-default: light-dark\(oklch\([^)]*\), oklch\([^)]*\)\);/);
  });

  test('all CSS sits inside senui layers, after one layer-order statement', async () => {
    const { css } = await buildTokens({ tokens: fixture() });
    const body = css.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('/*'));
    expect(body[0]).toBe('@layer senui.tokens, senui.base, senui.components;');
    // Every top-level line opens or closes a senui layer; everything else is indented inside one.
    const topLevel = body.slice(1).filter((l) => !l.startsWith('  '));
    expect(topLevel).toEqual(['@layer senui.tokens {', '}', '@layer senui.base {', '}']);
  });

  test('a [data-theme] subtree re-declares its inherited colours (ADR-0005)', async () => {
    const { css } = await buildTokens({ tokens: fixture() });
    const base = css.slice(css.indexOf('@layer senui.base {'));
    expect(base).toContain(
      [
        '  :where([data-theme]) {',
        '    background-color: var(--senui-color-bg-default);',
        '    color: var(--senui-color-fg-default);',
        '    accent-color: var(--senui-color-fg-accent);',
        '  }',
      ].join('\n'),
    );
  });

  test('tokens are declared on every themed subtree, not only the root (ADR-0010)', async () => {
    // Vite's default production build rewrites light-dark() into variables that resolve where the
    // token is declared. Declared only on :root, a data-theme="dark" subtree inherited the root's
    // light values: correct in dev, wrong in production. Probed in a real build before this fix.
    const { css, entries } = await buildTokens({ tokens: fixture() });
    const scopes = [...css.matchAll(/^\s*(:where\([^{]*\)) \{\n\s*--senui-/gm)].map((m) => m[1]);
    expect(scopes).toEqual([TOKEN_SCOPE, TOKEN_SCOPE]); // every token, then reduced motion
    expect(TOKEN_SCOPE).toBe(':where(:root, [data-theme])');
    // color-scheme stays per theme, so a subtree's own scheme isn't reset to `light dark`.
    expect(css).toContain(':where(:root) {\n    color-scheme: light dark;\n  }');
    expect(css.match(/--senui-/g)?.length).toBeGreaterThanOrEqual(entries.length);
  });

  test('DTCG unit objects serialize to CSS', async () => {
    const { css } = await buildTokens({ tokens: fixture() });
    expect(css).toContain('--senui-space-3: 12px;');
    expect(css).toContain('--senui-motion-duration-fast: 120ms;');
  });

  test('reduced-motion values are emitted once, in a media block', async () => {
    const { css } = await buildTokens({ tokens: fixture() });
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('--senui-motion-distance-sm: 0px;');
    expect(css.match(/prefers-reduced-motion/g)).toHaveLength(1);
  });

  test('output is deterministic', async () => {
    const a = await buildTokens({ tokens: fixture() });
    const b = await buildTokens({ tokens: fixture() });
    expect(a.css).toBe(b.css);
    expect(a.ts).toBe(b.ts);
  });
});

describe('buildTokens rejects', () => {
  test('a colour token without a dark value', async () => {
    const tree = fixture();
    delete tree.color.fg.default.$extensions.senui.dark;
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain('color.fg.default: colour tokens need $extensions.senui.dark');
  });

  const NEEDS_PAIRS =
    'color.fg.default: colour tokens need contrast pairs, or "surface": true for a background or a WCAG-exempt colour';

  test('a colour token with neither contrast pairs nor surface', async () => {
    const tree = fixture();
    delete tree.color.fg.default.$extensions.senui.contrast;
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(NEEDS_PAIRS);
  });

  // ADR-0005: `contrast: []` used to opt any colour out of the check without a trace.
  test('an empty contrast list without surface', async () => {
    const tree = fixture();
    tree.color.fg.default.$extensions.senui.contrast = [];
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(NEEDS_PAIRS);
  });

  test('a surface that also declares pairs', async () => {
    const tree = fixture();
    tree.color.bg.default.$extensions.senui.contrast = [{ against: '{color.fg.default}', min: 3 }];
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(
      'color.bg.default: a surface declares no contrast pairs; remove "surface" or "contrast"',
    );
  });

  test('a surface flag that is not true', async () => {
    const tree = fixture();
    tree.color.bg.default.$extensions.senui.surface = 'yes';
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain('color.bg.default: "surface" is either true or left out');
  });

  test('a surface flag on a non-colour token', async () => {
    const tree = fixture();
    tree.space[3].$extensions = { senui: { surface: true } };
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain('space.3: only colour tokens can be a surface');
  });

  test('a token set missing a colour the [data-theme] base rule needs', async () => {
    const tree = fixture();
    delete tree.color.fg.accent;
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(
      'the [data-theme] base rule (ADR-0005) needs these colour tokens: color.fg.accent',
    );
  });

  test('a dark value on a non-colour token', async () => {
    const tree = fixture();
    tree.space[3].$extensions = { senui: { dark: { value: 16, unit: 'px' } } };
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(
      'space.3: only colour tokens can have a dark value (light-dark() is colour-only)',
    );
  });

  test('a pair below its minimum, in the theme where it fails', async () => {
    const tree = fixture();
    // Danger text on the dark background is too dark to read; on the light one it passes.
    tree.color.fg.default.$extensions.senui.dark = '{primitive.color.danger}';
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      /^color\.fg\.default on color\.bg\.default \(dark\): \d+\.\d{3}:1, needs 4\.5:1$/,
    );
  });

  test('a contrast target that is not a public colour', async () => {
    const tree = fixture();
    tree.color.fg.default.$extensions.senui.contrast = [{ against: '{space.3}', min: 4.5 }];
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(
      'color.fg.default: contrast target "space.3" is not a public colour token',
    );
  });

  // Regression: a missing or misspelled `min` used to pass every pair, including 1:1.
  test.each([
    ['a missing min', { against: '{color.bg.default}' }, 'needs a numeric "min"'],
    ['a misspelled min', { against: '{color.bg.default}', minimum: 4.5 }, 'needs a numeric "min"'],
    ['a string min', { against: '{color.bg.default}', min: '4.5' }, 'needs a numeric "min"'],
    ['a min below 1', { against: '{color.bg.default}', min: 0 }, 'needs a numeric "min"'],
    ['an unknown key', { against: '{color.bg.default}', min: 4.5, large: true }, 'unknown keys'],
    ['a bare against', { against: 'color.bg.default', min: 4.5 }, '{token.reference}'],
  ])('a contrast pair with %s', async (_label, pair, message) => {
    const tree = fixture();
    // Same colour on itself (1:1), so a pair that is not rejected would hide a total failure.
    tree.color.fg.default.$value = '{primitive.color.paper}';
    tree.color.fg.default.$extensions.senui.contrast = [pair];
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(message);
  });
});
