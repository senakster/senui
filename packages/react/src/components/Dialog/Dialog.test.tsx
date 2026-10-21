import { composeStories } from '@storybook/react-vite';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import { installDialogPolyfill, pressEscape } from '../../internal/testing/dialog.js';
import { withControls } from '../../internal/testing/stories.js';
import { AlertDialog } from '../AlertDialog/AlertDialog.js';
import { Button } from '../Button/Button.js';
import { Dialog, type DialogOpenChangeDetails } from './Dialog.js';
import * as stories from './Dialog.stories.js';

beforeAll(installDialogPolyfill);

const dialogOf = (container: HTMLElement) => {
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('no <dialog> rendered');
  return dialog;
};

/** A dialog whose owner keeps it open whatever it is asked, to see what it reports. */
function Stubborn({
  onOpenChange,
}: {
  onOpenChange: (open: boolean, d: DialogOpenChangeDetails) => void;
}) {
  return (
    <Dialog title="Archive" closeLabel="Close" open onOpenChange={onOpenChange}>
      <form method="dialog">
        <button value="archive">Archive</button>
        <button value="a">A</button>
      </form>
    </Dialog>
  );
}

describe('Dialog', () => {
  test('is a native <dialog>, named by its title, with the description wired', () => {
    render(
      <Dialog
        title="Edit profile"
        closeLabel="Close"
        description="Visible to your team."
        defaultOpen
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAccessibleName('Edit profile');
    expect(dialog).toHaveAccessibleDescription('Visible to your team.');
    expect(screen.getByRole('heading', { level: 2, name: 'Edit profile' })).toBeInTheDocument();
  });

  test('aria-describedby is present only with a description, and merges the consumer’s ids', () => {
    const { container, rerender } = render(<Dialog title="Edit" closeLabel="Close" defaultOpen />);
    expect(dialogOf(container)).not.toHaveAttribute('aria-describedby');
    rerender(
      <Dialog
        title="Edit"
        closeLabel="Close"
        defaultOpen
        aria-describedby="extra"
        description="Short."
      />,
    );
    expect(dialogOf(container).getAttribute('aria-describedby')).toMatch(/^extra \S+-description$/);
  });

  test('an ARIA name replaces the title, and titleLevel sets the heading', () => {
    const { rerender } = render(
      <Dialog aria-label="Photo" hideCloseButton dismiss="any" defaultOpen />,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Photo');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Dialog title="Edit" titleLevel={3} closeLabel="Close" defaultOpen />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  test('the open attribute is never in the server-rendered markup (L06 decision 1)', () => {
    for (const element of [
      <Dialog key="d" title="Edit" closeLabel="Close" defaultOpen />,
      <Dialog key="c" title="Edit" closeLabel="Close" open onOpenChange={() => undefined} />,
      <AlertDialog
        key="a"
        title="Delete?"
        description="Gone."
        cancelLabel="Cancel"
        action={<Button variant="danger">Delete</Button>}
        defaultOpen
      />,
    ]) {
      expect(renderToString(element)).not.toMatch(/<dialog[^>]*\sopen[\s=>]/);
    }
  });

  test('content renders only while open (L06 decision 18)', () => {
    render(
      <Dialog title="Edit" closeLabel="Close">
        <p>Body</p>
      </Dialog>,
    );
    expect(screen.queryByText('Body')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });

  test('Esc reports reason "escape", and a controlled dialog stays open', () => {
    const onOpenChange = vi.fn();
    const { container } = render(<Stubborn onOpenChange={onOpenChange} />);
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    act(() => {
      pressEscape(dialog);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'escape' });
    expect(dialog.open).toBe(true);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  test('a <form method="dialog"> submit reports the submitter’s value and stays open while controlled', () => {
    const onOpenChange = vi.fn();
    const { container } = render(<Stubborn onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'form', returnValue: 'archive' });
    expect(dialogOf(container).open).toBe(true);
  });

  test('a returnValue never leaks into a later close (L06 decision 22)', async () => {
    const reports: DialogOpenChangeDetails[] = [];
    function Owner() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button
            onClick={() => {
              setOpen(true);
            }}
          >
            Reopen
          </button>
          <Dialog
            title="Pick"
            closeLabel="Close"
            open={open}
            onOpenChange={(next, details) => {
              reports.push(details);
              setOpen(next);
            }}
          >
            <form method="dialog">
              <button value="a">A</button>
            </form>
          </Dialog>
        </>
      );
    }
    const { container } = render(<Owner />);
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    await waitFor(() => {
      expect(dialogOf(container).open).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(dialogOf(container).open).toBe(true);
    act(() => {
      pressEscape(dialogOf(container));
    });
    expect(reports).toEqual([{ reason: 'form', returnValue: 'a' }, { reason: 'escape' }]);
  });

  test('a close the browser forces is reported as "forced", and the dialog can open again (review)', () => {
    const reports: DialogOpenChangeDetails[] = [];
    function Owner() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button
            onClick={() => {
              setOpen(true);
            }}
          >
            Reopen
          </button>
          <Dialog
            title="Edit"
            closeLabel="Close"
            open={open}
            onOpenChange={(next, details) => {
              reports.push(details);
              setOpen(next);
            }}
          />
        </>
      );
    }
    const { container } = render(<Owner />);
    act(() => {
      dialogOf(container).close();
    });
    expect(reports).toEqual([{ reason: 'forced' }]);
    expect(dialogOf(container).open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(dialogOf(container).open).toBe(true);
  });

  test('a submit from a form without method="dialog" is left alone', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog title="Search" closeLabel="Close" defaultOpen onOpenChange={onOpenChange}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <button>Search</button>
        </form>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('cancelLabel renders Cancel first in the footer; it reports reason "cancel" and closes', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog
        title="Edit"
        closeLabel="Close"
        defaultOpen
        cancelLabel="Cancel"
        footer={<Button>Save</Button>}
        onOpenChange={onOpenChange}
      />,
    );
    const footer = dialogOf(container).querySelector('.senui-dialog__footer');
    expect(Array.from(footer?.querySelectorAll('button') ?? []).map((b) => b.textContent)).toEqual([
      'Cancel',
      'Save',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'cancel' });
    await waitFor(() => {
      expect(dialogOf(container).open).toBe(false);
    });
  });

  test('a footer renders only with cancelLabel or footer content', () => {
    const { container } = render(<Dialog title="Edit" closeLabel="Close" defaultOpen />);
    expect(dialogOf(container).querySelector('.senui-dialog__footer')).toBeNull();
  });

  test('the close button reports reason "close-button"; uncontrolled, the dialog closes', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dialog title="Edit" closeLabel="Close" defaultOpen onOpenChange={onOpenChange}>
        <p>Body</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'close-button' });
    await waitFor(() => {
      expect(dialogOf(container).open).toBe(false);
    });
    expect(screen.queryByText('Body')).toBeNull();
  });

  test('initialFocus: the dialog by default; "first" skips the close button; a ref', () => {
    const { container, unmount } = render(<Dialog title="Edit" closeLabel="Close" defaultOpen />);
    expect(dialogOf(container)).toHaveFocus();
    unmount();

    const first = render(
      <Dialog title="Edit" closeLabel="Close" defaultOpen initialFocus="first">
        <input aria-label="Name" />
      </Dialog>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    first.unmount();

    const ref = createRef<HTMLButtonElement>();
    render(
      <Dialog
        title="Edit"
        closeLabel="Close"
        defaultOpen
        initialFocus={ref}
        footer={<Button ref={ref}>Save</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  test('the autofocus attribute is set only for the showModal() call', () => {
    const { container } = render(<Dialog title="Edit" closeLabel="Close" defaultOpen />);
    expect(dialogOf(container)).not.toHaveAttribute('autofocus');
  });

  test('owns its root: class merged, data attributes, tabindex, ref (CONVENTIONS rule 2)', () => {
    const ref = createRef<HTMLDialogElement>();
    const { container } = render(
      // A consumer's data-size (never excess-checked: it is hyphenated) is overwritten, never honoured.
      <Dialog
        title="Edit"
        closeLabel="Close"
        className="wide"
        data-size="huge"
        size="lg"
        ref={ref}
        id="edit"
      />,
    );
    const dialog = dialogOf(container);
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass('senui-dialog', 'wide');
    expect(dialog).toHaveAttribute('data-size', 'lg');
    expect(dialog).toHaveAttribute('data-state', 'closed');
    expect(dialog).toHaveAttribute('tabindex', '-1');
    expect(dialog).toHaveAttribute('id', 'edit');
  });

  test('warns once when controlled without onOpenChange', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // The type forbids it (review); the warning is for JavaScript consumers.
    // @ts-expect-error -- controlled without onOpenChange
    render(<Dialog title="Edit" closeLabel="Close" open={false} />);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Dialog has `open` but no `onOpenChange`'),
    );
    warn.mockRestore();
  });
});

describe('every story with controls passes its args through', () => {
  test.each(withControls(composeStories(stories)))('%s', (_name, Story) => {
    render(<Story defaultOpen title="Changed title" />);
    expect(screen.getByRole('dialog', { name: 'Changed title' })).toBeInTheDocument();
  });
});

describe('axe, for every story', () => {
  test.each(Object.entries(composeStories(stories)))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await expectNoAxeViolations(container);
  });
});
