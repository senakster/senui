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
    'unit-allowed-list': ['%', 'fr', 'ch', 'deg', 'turn'],
    'declaration-property-value-disallowed-list': {
      '/.*/': [/--senui-primitive-/, /--senui-color-[a-z]+-\d+/],
      '/^(transition|animation)$/': [EASING_KEYWORD],
    },
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
