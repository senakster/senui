//#region src/types.d.ts
/**
 * `Omit` for union props. A plain `Omit<ButtonProps, 'variant'>` keeps only the keys every branch
 * shares, which collapses a discriminated union and drops type-level requirements such as an
 * icon-only button's accessible name. Use this when wrapping a senui component:
 *
 * ```tsx
 * type DangerButtonProps = DistributiveOmit<ButtonProps, 'variant'>;
 * ```
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
//#endregion