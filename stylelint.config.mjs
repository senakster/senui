// ADR-0007, amended by ADR-0009: component CSS uses tokens only (principle 4), and base selectors
// stay overridable (ADR-0001). Run on packages/react/src/**/*.css by `pnpm lint`; the docs app's
// CSS and the generated tokens.css are not component CSS.
const TOKEN = String.raw`var\(--senui-[a-z0-9-]+\)`;
const KEYWORDS = ['inherit', 'initial', 'unset', 'revert', 'none'];
const TOKEN_VALUE = [new RegExp(`^${TOKEN}$`), ...KEYWORDS];
const TOKEN_LIST = [new RegExp(`^${TOKEN}(\\s*,\\s*${TOKEN})*$`), ...KEYWORDS];

// Easing keywords, matched as whole words so token names such as `--senui-motion-easing-linear`
// don't trip it.
const EASING_KEYWORD =
  /(?<![\w-])(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)(?![\w-])/;

// Four space-separated values (`margin: 0 1rem 0 2rem`): top, right, bottom, left. A token value
// with commas or nested parentheses is one value, so split on whitespace outside parentheses.
const FOUR_VALUES =
  /^(?:[^\s()]+|[^\s()]*\([^()]*(?:\([^()]*\)[^()]*)*\))(?:\s+(?:[^\s()]+|[^\s()]*\([^()]*(?:\([^()]*\)[^()]*)*\))){3}$/;

/** @type {import('stylelint').Config} */
export default {
  rules: {
    // ADR-0001: base selectors sit in :where(), so one consumer class wins. At most one class,
    // attribute or pseudo-class may sit outside it: `:where(.senui-button)[data-variant='danger']`.
    'selector-max-specificity': '0,1,0',
    'selector-max-id': 0,

    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
      'color-mix',
      'light-dark',
      'cubic-bezier',
      'steps',
      'linear',
    ],
    // ADR-0009: an allow-list, so a unit CSS adds later is rejected until someone decides on it.
    // These are layout units, not design values; lengths and durations come from tokens.
    // ADR-0015: rem is also allowed, but only in size media features, the one place a token can't
    // reach (no var() in media queries, no @custom-media yet). Three built-in rules together: the
    // allow-list admits rem, declarations reject it, and media features take it only for sizes.
    'unit-allowed-list': ['%', 'fr', 'ch', 'deg', 'turn', 'rem'],
    'declaration-property-unit-disallowed-list': { '/.*/': ['rem'] },
    'media-feature-name-unit-allowed-list': {
      '/^(min-|max-)?(width|height)$/': ['rem'],
      // Every other feature takes no rem (a lookahead, because the rule only checks the features it
      // lists). The empty list adds nothing: the allow-list above still decides every other unit.
      '/^(?!(min-|max-)?(width|height)$)/': ['dpi', 'dppx', 'x'],
    },
    'declaration-property-value-disallowed-list': {
      '/.*/': [/--senui-primitive-/, /--senui-color-[a-z]+-\d+/],
      '/^(transition|animation)$/': [EASING_KEYWORD],
      // L08 decision 10: inline-direction values and four-value shorthands are physical, so they
      // don't mirror in right-to-left text. Use `start`/`end` and the logical longhands.
      'text-align': [/^(left|right)$/],
      '/^(margin|padding|inset|scroll-margin|scroll-padding|border-radius)$/': [FOUR_VALUES],
    },
    // ADR-0018: bundlers lower `:dir()` to a `:lang()` list (Vite's default build does), which a
    // `dir="rtl"` page with another language never matches. Mirror with logical properties instead.
    'selector-pseudo-class-disallowed-list': ['dir'],
    // L08 decision 10: physical inline properties don't mirror in right-to-left text. Use the
    // logical ones (`margin-inline-start`, `inset-inline-end`, `border-start-end-radius`…).
    'property-disallowed-list': [
      'float',
      'clear',
      /^(left|right)$/,
      /^(margin|padding|border|inset|scroll-margin|scroll-padding)-(left|right)(-|$)/,
      /^border-(top|bottom)-(left|right)-radius$/,
    ],
    // Properties whose raw values use no unit or colour function, so the rules above can't see them.
    'declaration-property-value-allowed-list': {
      font: TOKEN_VALUE,
      'font-family': TOKEN_VALUE,
      'font-weight': TOKEN_VALUE,
      'font-size': TOKEN_VALUE,
      'line-height': TOKEN_VALUE,
      'letter-spacing': TOKEN_VALUE,
      'z-index': TOKEN_VALUE,
      'box-shadow': TOKEN_LIST,
      'transition-timing-function': TOKEN_VALUE,
      'animation-timing-function': TOKEN_VALUE,
    },
  },
};
