import { ComponentPropsWithoutRef, ElementType } from "react";
//#region src/internal/dom/native-props.d.ts
/**
 * The native attributes a component passes through (CONVENTIONS rule 2), minus what it must not:
 *
 * - `color`: an HTML attribute React types as `string`, which reads as a free re-skinning prop.
 * - `children`: each component declares its own, so a union can require or shape it (rule 3).
 * - `role`: the element and role are named in the a11y contract (ADR-0006); a consumer can't
 *   change them.
 *
 * Without the ref: components use `forwardRef` (rule 4), which adds it.
 */
export type NativeProps<E extends ElementType> = Omit<ComponentPropsWithoutRef<E>, 'color' | 'children' | 'role'>;
//#endregion