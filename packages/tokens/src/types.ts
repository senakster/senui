/** One public design token, as it appears in `tokens.css` (ADR-0004). */
export interface Token {
  /** The custom property to use in CSS, e.g. `--senui-color-fg-danger`. */
  readonly cssVar: `--senui-${string}`;
  /** The DTCG `$type`, e.g. `color`, `dimension`, `duration`. */
  readonly type: string;
  /** The CSS value; for colours, the light-theme value. */
  readonly value: string;
  /** The dark-theme value. Present on every colour token. */
  readonly dark?: string;
  /** The value under `prefers-reduced-motion: reduce`, where it differs. */
  readonly reducedMotion?: string;
  readonly description?: string;
}
