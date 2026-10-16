import { tokens } from './generated/tokens.js';

export { tokens };
export type { Token } from './types.js';

/** The key of a public token, e.g. `'color.fg.danger'`. */
export type TokenKey = keyof typeof tokens;
