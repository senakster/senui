import { NativeProps } from "../dom/native-props.js";
import "./useModalDialog.js";
import { ReactNode } from "react";
//#region src/internal/dialog/ModalDialog.d.ts
export type DialogHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
/** Native `<dialog>` attributes a senui dialog passes through. The dialog owns the rest. */
export type DialogNativeProps = Omit<NativeProps<'dialog'>, 'open' | 'title' | 'onCancel' | 'onClose' | 'tabIndex' | 'autoFocus' | 'aria-label' | 'aria-labelledby' | 'aria-modal'>;
//#endregion