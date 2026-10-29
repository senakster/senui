import "react";
//#region src/internal/field/useFormFieldControl.d.ts
declare const sealed: unique symbol;
/**
 * What FormField hands its control: the ids and state that connect the control to the field's
 * label, description and error. It is sealed, so only FormField can make one, and a control given
 * one is named by the field's label (CONVENTIONS rule 3):
 *
 * ```tsx
 * <FormField label="Email">{(field) => <TextInput field={field} type="email" />}</FormField>
 * ```
 */
export interface FormFieldBinding {
  readonly [sealed]: 'FormFieldBinding';
}
//#endregion
export {};