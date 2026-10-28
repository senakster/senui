import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
// Only AlertDialog's own stylesheet, as a consumer of `styles/AlertDialog.css` loads it. Each
// browser test file runs in its own frame, so nothing else from the package is loaded here.
import './AlertDialog.css';
import { Button } from '../Button/Button.js';
import type { DialogOpenChangeDetails } from '../Dialog/Dialog.js';
import { AlertDialog } from './AlertDialog.js';

// Real modality, focus and key presses for AlertDialog (Chromium; all three engines with
// SENUI_BROWSERS). What it shares with Dialog is tested in Dialog.browser.test.tsx.
describe('AlertDialog in a browser', () => {
  function Confirm({
    onOpenChange,
    onDelete,
  }: {
    onOpenChange?: (open: boolean, d: DialogOpenChangeDetails) => void;
    onDelete?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Open
        </Button>
        <AlertDialog
          title="Delete project?"
          description="This can’t be undone."
          cancelLabel="Cancel"
          action={
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          }
          open={open}
          onOpenChange={(next, details) => {
            onOpenChange?.(next, details);
            setOpen(next);
          }}
        />
      </>
    );
  }

  const dialogEl = () => document.querySelector<HTMLDialogElement>('dialog:modal');
  /** Opens with the keyboard, which behaves the same in every engine (see Dialog's tests). */
  const open = async () => {
    screen.getByRole('button', { name: 'Open' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(dialogEl).not.toBeNull();
    return dialogEl() as HTMLDialogElement;
  };
  const closed = async (dialog: HTMLDialogElement) => {
    await expect.poll(() => dialog.open).toBe(false);
  };
  const cancel = () => screen.getByRole('button', { name: 'Cancel' });
  const remove = () => screen.getByRole('button', { name: 'Delete' });

  test('focuses Cancel on open', async () => {
    render(<Confirm />);
    await open();
    await expect.poll(() => document.activeElement).toBe(cancel());
  });

  test('focus starts on Cancel, and returns to the opener when it closes (WCAG 2.4.3)', async () => {
    render(<Confirm />);
    const opener = screen.getByRole('button', { name: 'Open' });
    const dialog = await open();
    await expect.poll(() => document.activeElement).toBe(cancel());
    cancel().click();
    await closed(dialog);
    await expect.poll(() => document.activeElement).toBe(opener);
  });

  // The contract's keyboard rows, one key-named test each, traced by check-keyboard-trace.mjs (L08).
  test('Escape: asks to close, like Cancel (WCAG 2.1.2)', async () => {
    const onOpenChange = vi.fn();
    render(<Confirm onOpenChange={onOpenChange} />);
    const dialog = await open();
    await userEvent.keyboard('{Escape}');
    await closed(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'escape' });
  });

  test('Tab, Shift+Tab: move between Cancel and the action', async () => {
    render(<Confirm />);
    await open();
    await expect.poll(() => document.activeElement).toBe(cancel());
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(remove());
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(cancel());
  });

  test('Enter, Space: activate the focused button (WCAG 2.1.2)', async () => {
    const onOpenChange = vi.fn();
    const onDelete = vi.fn();
    render(<Confirm onOpenChange={onOpenChange} onDelete={onDelete} />);
    const dialog = await open();
    await expect.poll(() => document.activeElement).toBe(cancel());
    await userEvent.keyboard('{Enter}');
    await closed(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'cancel' });

    await open();
    await expect.poll(() => document.activeElement).toBe(cancel());
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard(' ');
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test('a backdrop click never closes it', async () => {
    const onOpenChange = vi.fn();
    render(<Confirm onOpenChange={onOpenChange} />);
    const dialog = await open();
    await commands.clickBackdrop();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });
});

// This file also checks the per-component stylesheet: it brings Dialog's styles with it, in
// senui.components itself, not a sub-layer.
describe('styles/AlertDialog.css on its own', () => {
  test('styles the dialog: Dialog.css comes with it', async () => {
    // Wide enough that the size token, not the viewport clamp, sets the width.
    await page.viewport(1024, 768);
    render(
      <AlertDialog
        title="Delete project?"
        description="This can’t be undone."
        cancelLabel="Cancel"
        action={<Button variant="danger">Delete</Button>}
        defaultOpen
      />,
    );
    const dialog = await screen.findByRole('alertdialog');
    const style = getComputedStyle(dialog);
    // --senui-size-dialog-sm is 24rem: 384 px at the default font size.
    expect(style.inlineSize).toBe('384px');
    expect(style.paddingTop).toBe('0px');
    // AlertDialog.css's own rule: the description at full strength, not Dialog's muted default.
    expect(style.getPropertyValue('--senui-dialog-description-color')).toBe(
      getComputedStyle(document.documentElement).getPropertyValue('--senui-color-fg-default'),
    );
  });

  test('Dialog’s rules sit in senui.components itself, not a nested layer', () => {
    const layers = Array.from(document.styleSheets).flatMap((sheet) => layerNames(sheet.cssRules));
    expect(layers).not.toContain('senui.components.senui.components');
    expect(layers).toContain('senui.components');
  });
});

function layerNames(rules: CSSRuleList, parent = ''): string[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSImportRule) {
      const name = rule.layerName ? [parent, rule.layerName].filter(Boolean).join('.') : parent;
      return [
        ...(rule.layerName ? [name] : []),
        ...layerNames(rule.styleSheet?.cssRules ?? ([] as unknown as CSSRuleList), name),
      ];
    }
    if (rule instanceof CSSLayerBlockRule) {
      const name = [parent, rule.name].filter(Boolean).join('.');
      return [name, ...layerNames(rule.cssRules, name)];
    }
    return [];
  });
}
