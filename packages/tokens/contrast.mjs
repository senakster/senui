import Color from 'colorjs.io';

// WCAG 2 contrast is defined in sRGB, so an out-of-gamut colour has to be brought into sRGB before
// measuring. Browsers differ in how they do that: CSS gamut mapping or plain clipping. Both are
// measured, and the lower ratio counts, so the check never passes a colour some browser renders
// worse.
const GAMUT_METHODS = ['css', 'clip'];
const toSrgb = (css, method) => new Color(css).to('srgb').toGamut({ space: 'srgb', method });
const alphaOf = (c) => (Number.isNaN(c.alpha) ? 1 : c.alpha);

// A translucent foreground is measured as it renders: composited over its background.
function composite(fg, bg) {
  const a = alphaOf(fg);
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
        if (alphaOf(new Color(bg[theme] ?? bg.value)) < 1) {
          errors.push(`${entry.key}: contrast target "${against}" must be opaque`);
          break;
        }
        const ratio = Math.min(
          ...GAMUT_METHODS.map((method) => {
            const back = toSrgb(bg[theme] ?? bg.value, method);
            return composite(toSrgb(entry[theme] ?? entry.value, method), back).contrast(
              back,
              'WCAG21',
            );
          }),
        );
        if (ratio < min) {
          const name = theme === 'value' ? 'light' : 'dark';
          // Three decimals, so a ratio of 4.497 never prints as a passing-looking "4.50".
          errors.push(
            `${entry.key} on ${against} (${name}): ${ratio.toFixed(3)}:1, needs ${String(min)}:1`,
          );
        }
      }
    }
  }
  return errors;
}
