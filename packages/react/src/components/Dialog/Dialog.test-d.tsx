import { createRef, useState } from 'react';
import { describe, test } from 'vitest';
import type { DistributiveOmit } from '../../types.js';
import { AlertDialog } from '../AlertDialog/AlertDialog.js';
import { Button } from '../Button/Button.js';
import { Dialog, type DialogOpenChangeDetails, type DialogProps } from './Dialog.js';

// Only a form close carries a returnValue (L06 decision 22), so a stale one can't be read on Esc.
type OtherDetails = Exclude<DialogOpenChangeDetails, { reason: 'form' }>;
// @ts-expect-error -- an Esc, backdrop, close-button or Cancel close has no returnValue
export type StaleReturnValue = OtherDetails['returnValue'];

// Type tests for Dialog and AlertDialog (L06 acceptance criteria).
describe('Dialog types', () => {
  test('a name is required: title XOR aria-label / aria-labelledby (L06 decision 6)', () => {
    void (<Dialog title="Edit profile" closeLabel="Close" />);
    void (<Dialog aria-label="Photo" closeLabel="Close" />);
    void (<Dialog aria-labelledby="photo-caption" closeLabel="Close" />);
    // @ts-expect-error -- no name
    void (<Dialog closeLabel="Close" />);
    // @ts-expect-error -- a title and an ARIA name compete
    void (<Dialog title="Edit profile" aria-label="Edit" closeLabel="Close" />);
    // @ts-expect-error -- a title that may be missing
    void (<Dialog title={undefined as string | undefined} closeLabel="Close" />);
    // @ts-expect-error -- titleLevel only goes with a visible title
    void (<Dialog aria-label="Photo" titleLevel={3} closeLabel="Close" />);
    // @ts-expect-error -- there is no level 7 heading
    void (<Dialog title="Edit" titleLevel={7} closeLabel="Close" />);
  });

  test('cancelLabel is an optional string (L06 review: footer close aligned with AlertDialog)', () => {
    void (<Dialog title="Edit" closeLabel="Close" cancelLabel="Cancel" />);
    // @ts-expect-error -- a Cancel button needs words, not a node
    void (<Dialog title="Edit" closeLabel="Close" cancelLabel={<b>Cancel</b>} />);
  });

  test('closeLabel is required unless the close button is hidden (L06 decision 14)', () => {
    // Hidden, with another visible way out (review).
    void (<Dialog title="Edit" hideCloseButton cancelLabel="Done" />);
    void (<Dialog title="Edit" hideCloseButton footer={<Button>Save</Button>} />);
    void (<Dialog aria-label="Photo" hideCloseButton dismiss="any" />);
    // @ts-expect-error -- hidden with no other visible way out: a touch screen has no Esc
    void (<Dialog title="Edit" hideCloseButton />);
    // @ts-expect-error -- 'closerequest' is still only Esc
    void (<Dialog title="Edit" hideCloseButton dismiss="closerequest" />);
    // @ts-expect-error -- the close button needs a name
    void (<Dialog title="Edit" />);
    // @ts-expect-error -- a hidden button takes no name
    void (<Dialog title="Edit" hideCloseButton closeLabel="Close" />);
  });

  test('size and dismiss are closed unions (L06 decisions 4 and 17)', () => {
    void (<Dialog title="Edit" closeLabel="Close" size="fullscreen" dismiss="any" />);
    // @ts-expect-error -- there is no xl size
    void (<Dialog title="Edit" closeLabel="Close" size="xl" />);
    // @ts-expect-error -- no 'none': it would allow a keyboard trap
    void (<Dialog title="Edit" closeLabel="Close" dismiss="none" />);
  });

  test('open state and the close reason', () => {
    const [open, setOpen] = useState(false);
    void (<Dialog title="Edit" closeLabel="Close" open={open} onOpenChange={setOpen} />);
    void (
      <Dialog
        title="Edit"
        closeLabel="Close"
        open={open}
        onOpenChange={(next: boolean, details: DialogOpenChangeDetails) => {
          if (details.reason === 'form') return details.returnValue.length > 0 || next;
          return next;
        }}
      />
    );
  });

  test('initialFocus takes a keyword or a ref; finalFocus returns an element', () => {
    const field = createRef<HTMLInputElement>();
    void (<Dialog title="Edit" closeLabel="Close" initialFocus="first" />);
    void (<Dialog title="Edit" closeLabel="Close" initialFocus={field} />);
    void (<Dialog title="Edit" closeLabel="Close" finalFocus={() => document.body} />);
    // @ts-expect-error -- not a keyword
    void (<Dialog title="Edit" closeLabel="Close" initialFocus="last" />);
  });

  test('one name only, and the dialog owns its focus props (review)', () => {
    const close = { closeLabel: 'Close' };
    // @ts-expect-error -- a title and aria-labelledby compete
    void (<Dialog title="Edit" aria-labelledby="x" {...close} />);
    // @ts-expect-error -- aria-label and aria-labelledby compete
    void (<Dialog aria-label="Edit" aria-labelledby="x" {...close} />);
    // @ts-expect-error -- the dialog is focusable by design (tabindex="-1")
    void (<Dialog title="Edit" tabIndex={0} {...close} />);
    // @ts-expect-error -- every close arrives in onOpenChange
    void (<Dialog title="Edit" onClose={() => undefined} {...close} />);
  });

  test('controlled needs onOpenChange, and never with defaultOpen (review)', () => {
    const close = { closeLabel: 'Close' };
    const onOpenChange = () => undefined;
    void (<Dialog title="Edit" {...close} open onOpenChange={onOpenChange} />);
    void (<Dialog title="Edit" {...close} defaultOpen />);
    // @ts-expect-error -- controlled with no onOpenChange: every close request would do nothing
    void (<Dialog title="Edit" {...close} open />);
    // @ts-expect-error -- controlled and uncontrolled at once
    void (<Dialog title="Edit" {...close} open onOpenChange={onOpenChange} defaultOpen />);
  });

  test('the dialog owns open, focus and modality', () => {
    const ref = createRef<HTMLDialogElement>();
    void (<Dialog title="Edit" closeLabel="Close" ref={ref} className="wide" id="edit" />);
    void (
      (
        // @ts-expect-error -- modal dialogs are implicitly aria-modal
        <Dialog title="Edit" closeLabel="Close" aria-modal="true" />
      )
    );
    void (
      (
        // @ts-expect-error -- use initialFocus (spread, so jsx-a11y/no-autofocus doesn't flag the test itself)
        <Dialog title="Edit" closeLabel="Close" {...{ autoFocus: true }} />
      )
    );
    void (
      (
        // @ts-expect-error -- every close request arrives in onOpenChange
        <Dialog title="Edit" closeLabel="Close" onCancel={() => undefined} />
      )
    );
    void (
      (
        // @ts-expect-error -- no role prop (ADR-0006)
        <Dialog title="Edit" closeLabel="Close" role="alertdialog" />
      )
    );
  });

  test('DistributiveOmit keeps the name requirement', () => {
    type Wrapped = DistributiveOmit<DialogProps, 'size'>;
    const Wrapper = (props: Wrapped) => <Dialog {...props} size="sm" />;
    void (<Wrapper title="Edit" closeLabel="Close" />);
    // @ts-expect-error -- still needs a name
    void (<Wrapper closeLabel="Close" />);
  });
});

describe('AlertDialog types', () => {
  const action = <Button variant="danger">Delete</Button>;

  test('description, cancelLabel and action are required (L06 decision 13)', () => {
    void (
      <AlertDialog
        title="Delete?"
        description="It can't be undone."
        cancelLabel="Cancel"
        action={action}
      />
    );
    // @ts-expect-error -- no description
    void (<AlertDialog title="Delete?" cancelLabel="Cancel" action={action} />);
    // @ts-expect-error -- no cancelLabel
    void (<AlertDialog title="Delete?" description="Gone for good." action={action} />);
    // @ts-expect-error -- no action
    void (<AlertDialog title="Delete?" description="Gone for good." cancelLabel="Cancel" />);
    // @ts-expect-error -- no name
    void (<AlertDialog description="Gone for good." cancelLabel="Cancel" action={action} />);
  });

  test('action is one element; the alert owns its name, modality and focus (review)', () => {
    const base = { title: 'Delete?', description: 'Gone.', cancelLabel: 'Cancel' };
    // @ts-expect-error -- plain text leaves no way to confirm
    void (<AlertDialog {...base} action="Delete" />);
    // @ts-expect-error -- modal dialogs are implicitly aria-modal
    void (<AlertDialog {...base} action={action} aria-modal="true" />);
    // @ts-expect-error -- there is no close button to hide
    void (<AlertDialog {...base} action={action} hideCloseButton />);
    // @ts-expect-error -- focusable by design (tabindex="-1")
    void (<AlertDialog {...base} action={action} tabIndex={0} />);
    // @ts-expect-error -- every close arrives in onOpenChange
    void (<AlertDialog {...base} action={action} onClose={() => undefined} />);
    // @ts-expect-error -- a title and aria-label compete
    void (<AlertDialog {...base} action={action} aria-label="Delete" />);
    // @ts-expect-error -- controlled with no onOpenChange
    void (<AlertDialog {...base} action={action} open />);
  });

  test('no backdrop dismiss, close button, initial focus choice or footer', () => {
    const props = { title: 'Delete?', description: 'Gone.', cancelLabel: 'Cancel', action };
    // @ts-expect-error -- never dismissed from the backdrop
    void (<AlertDialog {...props} dismiss="any" />);
    // @ts-expect-error -- Cancel is the way out
    void (<AlertDialog {...props} closeLabel="Close" />);
    // @ts-expect-error -- focus always starts on Cancel
    void (<AlertDialog {...props} initialFocus="first" />);
    // @ts-expect-error -- the footer holds Cancel and the action
    void (<AlertDialog {...props} footer={action} />);
    // @ts-expect-error -- no fullscreen alert
    void (<AlertDialog {...props} size="fullscreen" />);
  });
});
