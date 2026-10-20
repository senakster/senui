import { createContext } from 'react';

/** What a CheckboxGroup gives the Checkboxes inside it. Internal. */
export interface CheckboxGroupState {
  /** The checked options' values. */
  readonly value: readonly string[];
  /** Checks or unchecks the option with this value. */
  readonly toggle: (value: string, checked: boolean) => void;
  /** The group's `name`, the default for every child. */
  readonly name: string | undefined;
  /** The group shows an error: every child is `aria-invalid` (L05 decision 13). */
  readonly invalid: boolean;
  /**
   * The ids of the group's description and, while one shows, its error message. Every child is
   * described by them, not the fieldset: NVDA reads a group's name but never its description
   * (Emil's run, 2026-10-20).
   */
  readonly describedBy: string | undefined;
  /** Shows the browser's message for the group's "choose at least one" rule, or clears it. */
  readonly reportNative: (message: string | null) => void;
}

export const CheckboxGroupContext = createContext<CheckboxGroupState | null>(null);
