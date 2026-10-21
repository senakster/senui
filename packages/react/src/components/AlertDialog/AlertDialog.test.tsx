import { composeStories } from '@storybook/react-vite';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { installDialogPolyfill, pressEscape } from '../../internal/testing/dialog.js';
import { withControls } from '../../internal/testing/stories.js';
import { Button } from '../Button/Button.js';
import { AlertDialog } from './AlertDialog.js';
import * as stories from './AlertDialog.stories.js';

beforeAll(installDialogPolyfill);

const dialogOf = (container: HTMLElement) => {
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('no <dialog> rendered');
  return dialog;
};

describe('AlertDialog', () => {
  const action = <Button variant="danger">Delete</Button>;

  test('has role="alertdialog", the description, and focus on Cancel', () => {
    render(
      <AlertDialog
        title="Delete project?"
        description="This can’t be undone."
        cancelLabel="Cancel"
        action={action}
        defaultOpen
      />,
    );
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Delete project?');
    expect(dialog).toHaveAccessibleDescription('This can’t be undone.');
    expect(dialog).toHaveClass('senui-dialog', 'senui-alert-dialog');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  test('Cancel reports reason "cancel"; Esc reports "escape"', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <AlertDialog
        title="Delete?"
        description="Gone."
        cancelLabel="Cancel"
        action={action}
        open
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: 'cancel' });
    act(() => {
      pressEscape(dialogOf(container));
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: 'escape' });
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    render(<Story defaultOpen title="Changed title" />);
    expect(screen.getByRole('alertdialog', { name: 'Changed title' })).toBeInTheDocument();
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
