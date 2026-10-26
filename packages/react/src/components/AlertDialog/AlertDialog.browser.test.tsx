import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
// Only AlertDialog's own stylesheet, as a consumer of `styles/AlertDialog.css` loads it. Each
// browser test file runs in its own frame, so nothing else from the package is loaded here.
import './AlertDialog.css';
import { Button } from '../Button/Button.js';
import { AlertDialog } from './AlertDialog.js';

// Behaviour is tested with Dialog's (Dialog.browser.test.tsx). This file checks the per-component
// stylesheet: it brings Dialog's styles with it, in senui.components itself, not a sub-layer.
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
