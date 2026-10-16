import { describe, expect, test } from 'vitest';
import { checkContrast } from '../contrast.mjs';

const pair = (fg, bg, min) => [
  { key: 'bg', type: 'color', value: bg, dark: bg },
  { key: 'fg', type: 'color', value: fg, dark: fg, contrast: [{ against: 'bg', min }] },
];

describe('checkContrast', () => {
  test('a passing pair reports nothing', () => {
    expect(checkContrast(pair('black', 'white', 4.5))).toEqual([]);
  });

  test('a translucent foreground is measured composited over its background', () => {
    // Black at 20% over white composites to a light grey: about 1.7:1, not black's 21:1.
    const errors = checkContrast(pair('rgb(0 0 0 / 0.2)', 'white', 3));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^fg on bg \(light\): 1\.\d{3}:1, needs 3:1$/);
  });

  test('a translucent background is rejected, because its rendered colour is unknown', () => {
    expect(checkContrast(pair('black', 'rgb(255 255 255 / 0.5)', 4.5))).toEqual([
      'fg: contrast target "bg" must be opaque',
    ]);
  });

  test('an out-of-gamut colour is held to the worse of gamut mapping and clipping', () => {
    // Mapped into sRGB this green measures about 2.38:1 against white; clipped, about 2.15:1.
    // A minimum of 2.2 sits between them, so only the lower (clipped) ratio fails it.
    const errors = checkContrast(pair('oklch(0.7 0.35 145)', 'white', 2.2));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^fg on bg \(light\): 2\.1\d{2}:1, needs 2\.2:1$/);
  });

  test('a ratio just under the minimum prints three decimals, never a passing-looking 4.50', () => {
    // #767676 on white is 4.54:1; #777777 is 4.48:1.
    const [error] = checkContrast(pair('#777777', 'white', 4.5));
    expect(error).toMatch(/: 4\.4\d{2}:1, needs 4\.5:1$/);
  });
});
