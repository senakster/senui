import Color from 'colorjs.io';

// WCAG 2 contrast is defined in sRGB, so every colour is gamut-mapped into sRGB before measuring.
const toSrgb = (css) => new Color(css).to('srgb').toGamut({ space: 'srgb' });

// A translucent foreground is measured as it renders: composited over its background.
function composite(fg, bg) {
  const a = Number.isNaN(fg.alpha) ? 1 : fg.alpha;
  if (a >= 1) return fg;
  return new Color(
    'srgb',
    fg.coords.map((c, i) => c * a + bg.coords[i] * (1 - a)),
  );
}

const THEMES = /** @type {const} */ (['value', 'dark']);

/**
 * Checks every declared contrast pair in both themes.
 * @param {Array<{ key: string, type: string, value: string, dark?: string, contrast?: Array<{ against: string, min: number }> }>} entries
 * @returns {string[]} one message per failing pair
 */
export function checkContrast(entries) {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const errors = [];
  for (const entry of entries) {
    for (const { against, min } of entry.contrast ?? []) {
      const bg = byKey.get(against);
      if (!bg || bg.type !== 'color') {
        errors.push(`${entry.key}: contrast target "${against}" is not a public colour token`);
        continue;
      }
      for (const theme of THEMES) {
        const back = toSrgb(bg[theme] ?? bg.value);
        if ((Number.isNaN(back.alpha) ? 1 : back.alpha) < 1) {
          errors.push(`${entry.key}: contrast target "${against}" must be opaque`);
          break;
        }
        const fore = composite(toSrgb(entry[theme] ?? entry.value), back);
        const ratio = fore.contrast(back, 'WCAG21');
        if (ratio < min) {
          const name = theme === 'value' ? 'light' : 'dark';
          errors.push(
            `${entry.key} on ${against} (${name}): ${ratio.toFixed(2)}:1, needs ${String(min)}:1`,
          );
        }
      }
    }
  }
  return errors;
}
