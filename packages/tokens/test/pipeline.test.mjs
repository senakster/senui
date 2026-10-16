import { describe, expect, test } from 'vitest';
import { buildTokens } from '../sd.config.mjs';

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
        $extensions: { senui: { dark: '{primitive.color.ink}', contrast: [] } },
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

  test('all CSS sits inside the tokens layer, after one layer-order statement', async () => {
    const { css } = await buildTokens({ tokens: fixture() });
    const body = css.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('/*'));
    expect(body[0]).toBe('@layer senui.tokens, senui.base, senui.components;');
    expect(body[1]).toBe('@layer senui.tokens {');
    expect(body.at(-1)).toBe('}');
    expect(body.slice(2, -1).every((l) => l.startsWith('  '))).toBe(true);
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

  test('a colour token that does not declare its contrast pairs', async () => {
    const tree = fixture();
    delete tree.color.bg.default.$extensions.senui.contrast;
    const { errors } = await buildTokens({ tokens: tree });
    expect(errors).toContain(
      'color.bg.default: colour tokens need $extensions.senui.contrast ([] for a surface)',
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
      /^color\.fg\.default on color\.bg\.default \(dark\): [\d.]+:1, needs 4\.5:1$/,
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
});
