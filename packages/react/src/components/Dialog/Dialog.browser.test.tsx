import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { expectNoAxeViolations } from '../../internal/testing/axe.js';
import * as alertStories from '../AlertDialog/AlertDialog.stories.js';
import { Button } from '../Button/Button.js';
import { Dialog, type DialogOpenChangeDetails, type DialogProps } from './Dialog.js';
import * as dialogStories from './Dialog.stories.js';

// Real modality, focus, key presses, pointer, scroll and layout for Dialog: the L06 criteria the plan
// assigns to Playwright, run here in Vitest browser mode (scope-decisions § L06). AlertDialog's own
// behaviour is in AlertDialog.browser.test.tsx; the axe pass below covers both components' stories.
// All three engines: SENUI_BROWSERS=chromium,firefox,webkit.

type Extra = Partial<
  Pick<DialogProps, 'dismiss' | 'initialFocus' | 'finalFocus' | 'footer' | 'size'>
>;

/** A trigger and an uncontrolled-looking Dialog whose open state lives here, as in an app. */
function Opener({
  children,
  onOpenChange,
  ...extra
}: Extra & {
  children?: ReactNode;
  onOpenChange?: (open: boolean, d: DialogOpenChangeDetails) => void;
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
      <Dialog
        title="Edit profile"
        closeLabel="Close"
        {...extra}
        open={open}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          setOpen(next);
        }}
      >
        {children}
      </Dialog>
    </>
  );
}

const dialogEl = () => document.querySelector<HTMLDialogElement>('dialog:modal');
/**
 * Opens with the keyboard. WebKit, like Safari, doesn't focus a button on a mouse click, so a
 * mouse-opened dialog has no trigger to return to there (a known issue in the contract); the
 * keyboard path behaves the same in every engine.
 */
const activate = async (button: HTMLElement) => {
  button.focus();
  await userEvent.keyboard('{Enter}');
};
const open = async () => {
  await activate(screen.getByRole('button', { name: 'Open' }));
  await expect.poll(dialogEl).not.toBeNull();
  return dialogEl() as HTMLDialogElement;
};
// Longer than Dialog's own 1 s fallback for an exit animation that never finishes: a loaded runner
// can stall WebKit's animation until that fallback fires, as the poll's 1 s default gives up.
const closed = async (dialog: HTMLDialogElement) => {
  await expect.poll(() => dialog.open, { timeout: 3000 }).toBe(false);
};

afterEach(async () => {
  await page.viewport(414, 896);
  await commands.emulateReducedMotion(false);
});

describe('Dialog in a browser', () => {
  test('is modal: showModal() put it in the top layer', async () => {
    render(<Opener />);
    const dialog = await open();
    expect(dialog.matches(':modal')).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  test.each(['md', 'fullscreen'] as const)(
    'size %s: the focus ring starts at the padding edge, so the sticky header can’t paint over it',
    async (size) => {
      render(<Opener size={size} />);
      const dialog = await open();
      await expect.poll(() => dialog.matches(':focus-visible')).toBe(true);
      const style = getComputedStyle(dialog);
      const border = parseFloat(style.borderTopWidth);
      // The ring's inner edge is `outline-offset` from the border edge: minus the border width puts
      // it exactly on the padding edge, outside everything the dialog's content can paint.
      expect(-parseFloat(style.outlineOffset)).toBe(border);
      expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(border);
      if (size === 'fullscreen') {
        // Nothing outside the border to draw on: the border holds the whole ring.
        expect(parseFloat(style.outlineWidth)).toBe(border);
      }
    },
  );

  test('initialFocus "dialog" (default) focuses the dialog itself', async () => {
    render(<Opener />);
    const dialog = await open();
    await expect.poll(() => document.activeElement).toBe(dialog);
  });

  test('initialFocus "first" focuses the first control in the body, not the close button', async () => {
    render(
      <Opener initialFocus="first">
        <input aria-label="Name" />
      </Opener>,
    );
    await open();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('textbox', { name: 'Name' }));
  });

  test('initialFocus can be a ref', async () => {
    function WithRef() {
      const save = useRef<HTMLButtonElement>(null);
      return <Opener initialFocus={save} footer={<Button ref={save}>Save</Button>} />;
    }
    render(<WithRef />);
    await open();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Save' }));
  });

  test('opened by a mouse click, focus returns to the trigger (Safari doesn’t focus it on click)', async () => {
    render(<Opener />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);
    await expect.poll(dialogEl).not.toBeNull();
    const dialog = dialogEl() as HTMLDialogElement;
    await userEvent.keyboard('{Escape}');
    await closed(dialog);
    await expect.poll(() => document.activeElement).toBe(trigger);
  });

  test('nested and opened by a mouse click, focus returns to the control in the outer dialog', async () => {
    function Nested() {
      const [inner, setInner] = useState(false);
      return (
        <Dialog title="Settings" closeLabel="Close" defaultOpen>
          <Button
            onClick={() => {
              setInner(true);
            }}
          >
            Advanced
          </Button>
          <Dialog title="Advanced" closeLabel="Close inner" open={inner} onOpenChange={setInner} />
        </Dialog>
      );
    }
    render(<Nested />);
    const advanced = await screen.findByRole('button', { name: 'Advanced' });
    await userEvent.click(advanced);
    const dialogs = () => Array.from(document.querySelectorAll<HTMLDialogElement>('dialog:modal'));
    await expect.poll(() => dialogs().length).toBe(2);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogs().length).toBe(1);
    await expect.poll(() => document.activeElement).toBe(advanced);
  });

  test('a close() from outside is reported as "forced", and the trigger opens it again (review)', async () => {
    const onOpenChange = vi.fn();
    render(<Opener onOpenChange={onOpenChange} />);
    const dialog = await open();
    dialog.close();
    await expect.poll(() => onOpenChange.mock.calls).toEqual([[false, { reason: 'forced' }]]);
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Open' }));
    await open();
    expect(dialog.open).toBe(true);
  });

  test('two Esc presses with no click between: the owner’s state follows the dialog (review)', async () => {
    // The owner refuses Esc, as the unsaved-changes recipe does, but accepts a forced close. The
    // second Esc carries no fresh user activation, so the browser may close regardless (Chromium
    // does); whichever happens, `open` must agree with the dialog afterwards.
    const reports: DialogOpenChangeDetails[] = [];
    function Refusing() {
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
          <Dialog
            title="Unsaved changes"
            closeLabel="Close"
            open={open}
            onOpenChange={(next, details) => {
              reports.push(details);
              if (details.reason === 'forced') setOpen(next);
            }}
          />
        </>
      );
    }
    render(<Refusing />);
    const dialog = await open();
    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (dialog.open) {
      expect(reports.every((d) => d.reason === 'escape')).toBe(true);
    } else {
      expect(reports.at(-1)).toEqual({ reason: 'forced' });
      await open();
      expect(dialog.open).toBe(true);
    }
  });

  test('a controlled owner can refuse Esc: the dialog stays modal', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog title="Unsaved changes" closeLabel="Close" open onOpenChange={onOpenChange}>
        <Button>Keep editing</Button>
      </Dialog>,
    );
    await expect.poll(dialogEl).not.toBeNull();
    const dialog = dialogEl() as HTMLDialogElement;
    // The page gave the user activation by clicking; one refused close request is allowed then.
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'escape' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(dialog.open).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
  });

  test('focus moves in on open, the page behind is inert, and focus returns to the opener on close (WCAG 2.4.3)', async () => {
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Open' });
    const dialog = await open();
    await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
    // Behind a modal dialog the page is inert: focus can't land on it, even by script.
    opener.focus();
    expect(document.activeElement).not.toBe(opener);
    screen.getByRole('button', { name: 'Close' }).click();
    await closed(dialog);
    await expect.poll(() => document.activeElement).toBe(opener);
  });

  test('with the close button hidden, Esc still closes it (WCAG 2.1.2)', async () => {
    function NoCloseButton() {
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
          <Dialog
            title="Edit profile"
            hideCloseButton
            cancelLabel="Cancel"
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
            }}
          >
            Body
          </Dialog>
        </>
      );
    }
    render(<NoCloseButton />);
    const dialog = await open();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    await closed(dialog);
  });

  test('Escape: closes it and focus returns to the trigger (WCAG 2.1.2, 2.4.3)', async () => {
    const onOpenChange = vi.fn();
    render(<Opener onOpenChange={onOpenChange} />);
    const dialog = await open();
    await userEvent.keyboard('{Escape}');
    await closed(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'escape' });
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Open' }));
  });

  test('the exit animation runs before close()', async () => {
    render(<Opener />);
    const dialog = await open();
    const exit = recordStates(dialog);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await closed(dialog);
    // Still modal while it animated out, with its own transitions running; closed only after.
    await expect.poll(() => exit.states.length).toBe(2);
    expect(exit.states).toEqual(['closing open animating', 'closed shut']);
    expect(exit.exitMs()).toBeGreaterThanOrEqual(100);
  });

  test('a <form method="dialog"> close runs the exit animation too', async () => {
    const onOpenChange = vi.fn();
    render(
      <Opener onOpenChange={onOpenChange}>
        <form method="dialog">
          <Button type="submit" value="archive">
            Archive
          </Button>
        </form>
      </Opener>,
    );
    const dialog = await open();
    const exit = recordStates(dialog);
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'form', returnValue: 'archive' });
    await closed(dialog);
    await expect.poll(() => exit.states.length).toBe(2);
    expect(exit.states).toEqual(['closing open animating', 'closed shut']);
    expect(exit.exitMs()).toBeGreaterThanOrEqual(100);
  });

  test('with reduced motion only the fade remains', async () => {
    // The properties the dialog's own exit transitions animate. A property whose start and end
    // values are equal gets no transition, so under reduced motion translate and scale drop out.
    const exiting = (dialog: HTMLDialogElement) =>
      dialog
        .getAnimations()
        .filter((animation): animation is CSSTransition => animation instanceof CSSTransition)
        .map((transition) => transition.transitionProperty)
        .sort();

    render(<Opener />);
    let dialog = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.poll(() => dialog.dataset.state).toBe('closing');
    expect(exiting(dialog)).toEqual(['opacity', 'scale', 'translate']);
    await closed(dialog);

    await commands.emulateReducedMotion(true);
    dialog = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expect.poll(() => dialog.dataset.state).toBe('closing');
    expect(exiting(dialog)).toEqual(['opacity']);
    await closed(dialog);
  });

  test('a backdrop click closes it only with dismiss="any"', async () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(<Opener onOpenChange={onOpenChange} />);
    let dialog = await open();
    await commands.clickBackdrop();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
    unmount();

    render(<Opener dismiss="any" onOpenChange={onOpenChange} />);
    dialog = await open();
    await commands.clickBackdrop();
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'backdrop' });
    await closed(dialog);
  });

  test('a click inside the dialog never counts as a backdrop click', async () => {
    const onOpenChange = vi.fn();
    render(
      <Opener dismiss="any" onOpenChange={onOpenChange}>
        <p>Body</p>
      </Opener>,
    );
    await open();
    await userEvent.click(screen.getByText('Body'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('Tab, Shift+Tab: never focus an element outside the open dialog', async () => {
    render(
      <>
        <button>Outside</button>
        <Opener footer={<Button>Save</Button>}>
          <input aria-label="Name" />
        </Opener>
      </>,
    );
    const dialog = await open();
    const outside = screen.getByRole('button', { name: 'Outside' });
    const trigger = screen.getByRole('button', { name: 'Open' });
    for (let press = 0; press < 8; press++) {
      // Literal presses, so check-keyboard-trace.mjs can read both keys.
      if (press % 3 === 2) await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      else await userEvent.keyboard('{Tab}');
      const active = document.activeElement;
      expect(active).not.toBe(outside);
      expect(active).not.toBe(trigger);
      // Past the last control, focus may go to the browser's own UI (L06 decision 12); the document
      // then reports <body>, never a page control.
      if (active !== document.body) expect(dialog.contains(active)).toBe(true);
    }
  });

  test('ArrowDown, ArrowUp, PageDown, PageUp: scroll long content while the dialog has focus', async () => {
    render(
      <Opener footer={<Button>Accept</Button>}>
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index}>Clause {index + 1}. The terms run longer than the viewport.</p>
        ))}
      </Opener>,
    );
    const dialog = await open();
    expect(document.activeElement).toBe(dialog);
    expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
    // Keyboard scrolling may be smooth: wait for it to start, then read the position once it stops
    // changing. (Settling alone could pass two samples taken before the first frame.) Stopped means
    // unchanged for 300 ms: under load, WebKit's smooth scroll can skip a frame, and two equal
    // samples in a row read as stopped mid-scroll.
    const settled = async (from: number) => {
      await expect.poll(() => dialog.scrollTop).not.toBe(from);
      let last = -1;
      let since = performance.now();
      await expect
        .poll(
          () => {
            if (dialog.scrollTop !== last) {
              last = dialog.scrollTop;
              since = performance.now();
            }
            return performance.now() - since >= 300;
          },
          { interval: 100 },
        )
        .toBe(true);
      return last;
    };
    await userEvent.keyboard('{ArrowDown}');
    const arrowed = await settled(0);
    expect(arrowed).toBeGreaterThan(0);
    await userEvent.keyboard('{PageDown}');
    const paged = await settled(arrowed);
    expect(paged).toBeGreaterThan(arrowed);
    await userEvent.keyboard('{ArrowUp}');
    const back = await settled(paged);
    expect(back).toBeLessThan(paged);
    await userEvent.keyboard('{PageUp}');
    expect(await settled(back)).toBeLessThan(back);
  });

  test('a wheel over the backdrop doesn’t scroll the page (ADR-0014)', async () => {
    render(
      <>
        <div style={{ blockSize: '400vh' }}>Tall page</div>
        <Opener />
      </>,
    );
    await open();
    expect(getComputedStyle(document.documentElement).overflow).toBe('hidden');
    // Set after opening: clicking the trigger at the bottom of the page scrolls it into view.
    const root = document.scrollingElement as HTMLElement;
    root.scrollTop = 200;
    await expect.poll(() => root.scrollTop).toBe(200);
    await commands.wheelOverBackdrop(800);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(root.scrollTop).toBe(200);
  });

  test('the root lock is scoped to senui dialogs', async () => {
    function Plain() {
      const ref = useRef<HTMLDialogElement>(null);
      return (
        <>
          <button onClick={() => ref.current?.showModal()}>Open plain</button>
          <dialog ref={ref} aria-label="Plain">
            Plain
          </dialog>
        </>
      );
    }
    render(<Plain />);
    await userEvent.click(screen.getByRole('button', { name: 'Open plain' }));
    await expect.poll(() => document.querySelector('dialog:modal')).not.toBeNull();
    expect(getComputedStyle(document.documentElement).overflow).not.toBe('hidden');
    document.querySelector('dialog')?.close();
  });

  test('at 320 × 256 CSS px (1280 × 1024 at 400 %): no horizontal scroll, every control reachable, focus never under the header or footer', async () => {
    await page.viewport(320, 256);
    const fields = Array.from({ length: 8 }, (_, index) => `Field ${String(index + 1)}`);
    render(
      <Opener footer={<Button>Save</Button>}>
        {fields.map((name) => (
          <input key={name} aria-label={name} />
        ))}
      </Opener>,
    );
    const dialog = await open();
    expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const box = dialog.getBoundingClientRect();
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
    // Header and footer scroll with the content here, so no padding is reserved for them (review).
    expect(getComputedStyle(dialog).scrollPaddingTop).toBe('0px');
    expect(getComputedStyle(dialog).scrollPaddingBottom).toBe('0px');

    const header = dialog.querySelector('.senui-dialog__header') as HTMLElement;
    const footer = dialog.querySelector('.senui-dialog__footer') as HTMLElement;
    const reached = new Set<string>();
    for (let press = 0; press < fields.length + 3; press++) {
      const active = document.activeElement as HTMLElement;
      if (dialog.contains(active) && active !== dialog) {
        reached.add(active.getAttribute('aria-label') ?? active.textContent);
        assertNotObscured(active, header, footer);
      }
      await userEvent.keyboard('{Tab}');
    }
    for (const name of [...fields, 'Save', 'Close']) expect(reached).toContain(name);
  });

  test('fullscreen fills the viewport even when a theme overrides the size tokens (review)', async () => {
    await page.viewport(800, 600);
    function Themed() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          title="Edit profile"
          closeLabel="Close"
          size="fullscreen"
          open={open}
          onOpenChange={setOpen}
          // A consumer's theme, as it would set these on a class or on :root.
          style={
            {
              '--senui-dialog-inline-size': '20rem',
              '--senui-dialog-viewport-gap': '3rem',
              '--senui-dialog-radius': '1rem',
            } as CSSProperties
          }
        />
      );
    }
    render(<Themed />);
    await expect.poll(dialogEl).not.toBeNull();
    const dialog = dialogEl() as HTMLDialogElement;
    // Measure after the enter animation: it scales the dialog from 0.96.
    await Promise.all(
      dialog.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
    const box = dialog.getBoundingClientRect();
    expect(box.width).toBe(window.innerWidth);
    expect(box.height).toBe(window.innerHeight);
    expect(getComputedStyle(dialog).borderTopLeftRadius).toBe('0px');
  });

  test('on a taller viewport, the sticky header and footer never cover the focused control', async () => {
    await page.viewport(414, 640);
    const fields = Array.from({ length: 16 }, (_, index) => `Field ${String(index + 1)}`);
    render(
      <Opener initialFocus="first" footer={<Button>Save</Button>}>
        {fields.map((name) => (
          <input key={name} aria-label={name} />
        ))}
      </Opener>,
    );
    const dialog = await open();
    const header = dialog.querySelector('.senui-dialog__header') as HTMLElement;
    const footer = dialog.querySelector('.senui-dialog__footer') as HTMLElement;
    expect(getComputedStyle(header).position).toBe('sticky');
    expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
    for (let press = 0; press < fields.length; press++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      assertNotObscured(document.activeElement as HTMLElement, header, footer);
      await userEvent.keyboard('{Tab}');
    }
    for (let press = 0; press < fields.length; press++) {
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await new Promise((resolve) => setTimeout(resolve, 50));
      const active = document.activeElement as HTMLElement;
      if (dialog.contains(active) && active !== dialog) assertNotObscured(active, header, footer);
    }
  });

  test('nested: Esc closes the inner dialog only, and focus returns into the outer one', async () => {
    function Nested() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(false);
      return (
        <Dialog title="Settings" closeLabel="Close" open={outer} onOpenChange={setOuter}>
          <Button
            onClick={() => {
              setInner(true);
            }}
          >
            Advanced
          </Button>
          <Dialog title="Advanced" closeLabel="Close inner" open={inner} onOpenChange={setInner} />
        </Dialog>
      );
    }
    render(<Nested />);
    await activate(await screen.findByRole('button', { name: 'Advanced' }));
    const dialogs = () => Array.from(document.querySelectorAll<HTMLDialogElement>('dialog:modal'));
    await expect.poll(() => dialogs().length).toBe(2);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogs().length).toBe(1);
    expect(dialogs()[0]).toHaveAccessibleName('Settings');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Advanced' }));
  });

  test('when the trigger is gone, focus goes to finalFocus', async () => {
    function Rows({ withFinal }: { withFinal: boolean }) {
      const [rows, setRows] = useState(['Row 1', 'Row 2']);
      const [editing, setEditing] = useState<string | null>(null);
      const heading = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Rows
          </h2>
          {rows.map((row) => (
            <Button
              key={row}
              onClick={() => {
                setEditing(row);
              }}
            >
              {`Edit ${row}`}
            </Button>
          ))}
          <Dialog
            title="Edit row"
            closeLabel="Close"
            open={editing !== null}
            onOpenChange={() => {
              setEditing(null);
            }}
            {...(withFinal ? { finalFocus: () => heading.current } : {})}
          >
            <Button
              onClick={() => {
                setRows((all) => all.filter((row) => row !== editing));
                setEditing(null);
              }}
            >
              Delete row
            </Button>
          </Dialog>
        </>
      );
    }

    const { unmount } = render(<Rows withFinal />);
    await activate(screen.getByRole('button', { name: 'Edit Row 1' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete row' }));
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('heading', { name: 'Rows' }));
    unmount();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Rows withFinal={false} />);
    await activate(screen.getByRole('button', { name: 'Edit Row 2' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete row' }));
    await expect
      .poll(() => warn.mock.calls.flat().join(' '))
      .toContain('Dialog closed after the element that opened it was removed');
    warn.mockRestore();
  });
});

describe('axe with rendered contrast, every story', () => {
  const stories = [
    ...Object.entries(composeStories(dialogStories)),
    ...Object.entries(composeStories(alertStories)).map(
      ([name, story]) => [`AlertDialog ${name}`, story] as const,
    ),
  ];
  test.each(stories)('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expectNoAxeViolations(container, { contrast: true });
  });
});

/** The focused control lies wholly between the sticky header and footer (WCAG 2.4.11). */
function assertNotObscured(element: HTMLElement, header: HTMLElement, footer: HTMLElement): void {
  // The close button and the footer's actions are part of the sticky regions, so never under them.
  if (header.contains(element) || footer.contains(element)) return;
  const box = element.getBoundingClientRect();
  const sticky = (part: HTMLElement) => getComputedStyle(part).position === 'sticky';
  // WebKit scrolls a focused control into view 2 to 3 px short of the scroll padding. 2.4.11 (AA)
  // is about a control being entirely hidden, so a few pixels under a sticky part still passes.
  const slack = 4;
  if (sticky(header))
    expect(box.top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom - slack);
  if (sticky(footer))
    expect(box.bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top + slack);
}

/**
 * Every `data-state` change from now on, with whether the dialog was still open and animating at
 * that moment. A MutationObserver, because a 120 ms exit can fall between two polls.
 */
function recordStates(dialog: HTMLDialogElement): { states: string[]; exitMs: () => number } {
  const states: string[] = [];
  const at: Record<string, number> = {};
  new MutationObserver(() => {
    const state = dialog.dataset.state ?? '';
    at[state] = performance.now();
    const animating = dialog.getAnimations({ subtree: true }).length > 0 ? ' animating' : '';
    states.push(`${state} ${dialog.open ? 'open' : 'shut'}${animating}`);
  }).observe(dialog, { attributes: true, attributeFilter: ['data-state'] });
  // From `closing` to `closed`: close() ran only after the exit transitions finished.
  return { states, exitMs: () => (at.closed ?? 0) - (at.closing ?? 0) };
}
