import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useState, type ReactNode } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { FormField } from '../FormField/FormField.js';
import { TextInput } from '../TextInput/TextInput.js';
import { Dialog, type DialogOpenChangeDetails, type DialogProps } from './Dialog.js';

/**
 * The stories use the `title` + `closeLabel` branch of the props. Storybook's arg types can't follow
 * the name and close-button unions, and collapse them to `never`.
 */
type TitledProps = Extract<DialogProps, { title: ReactNode; closeLabel: string }>;

/**
 * A trigger and a controlled Dialog, rendered from the story's args. The dialog's open state lives
 * here, as it would in an app; `onOpenChange` is still reported to the Actions panel.
 */
function Demo({ defaultOpen = false, onOpenChange, trigger = 'Open dialog', ...args }: DemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {trigger}
      </Button>
      <Dialog
        {...args}
        open={open}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          setOpen(next);
        }}
      />
    </>
  );
}
type DemoProps = TitledProps & { trigger?: string };

const paragraph =
  'Your profile is visible to everyone in your workspace. Changes take effect as soon as you save them, and appear in the activity log.';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: {
    title: 'Edit profile',
    closeLabel: 'Close',
    children: <p style={{ margin: 0 }}>{paragraph}</p>,
    onOpenChange: fn(),
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'fullscreen'] },
    dismiss: { control: 'inline-radio', options: ['closerequest', 'any'] },
    titleLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
    description: { control: 'text' },
    children: { control: false },
    footer: { control: false },
    cancelLabel: { control: 'text' },
  },
  // Each story opens a modal, so on the docs page every story gets its own frame.
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<TitledProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: a trigger opens it. Focus moves to the dialog, and back to the trigger on close. */
export const Default: Story = {};

/** Open, with a title, the close button and body text. */
export const Open: Story = { args: { defaultOpen: true } };

export const WithDescription: Story = {
  args: {
    defaultOpen: true,
    title: 'Leave the workspace?',
    description: 'You lose access to its projects until someone invites you again.',
  },
};

/**
 * Actions in a footer that stays put while the body scrolls. `cancelLabel` adds a Cancel that
 * closes the dialog, first, as in AlertDialog; your own actions close it by setting `open`.
 */
export const WithFooter: Story = {
  args: {
    defaultOpen: true,
    cancelLabel: 'Cancel',
    footer: <Button>Save</Button>,
  },
};

/** A footer action that is working: Save keeps focus and width while loading (Button, L03). */
export const FooterLoading: Story = {
  args: {
    defaultOpen: true,
    cancelLabel: 'Cancel',
    footer: <Button loading>Save</Button>,
  },
};

export const Small: Story = { args: { defaultOpen: true, size: 'sm' } };
export const Large: Story = { args: { defaultOpen: true, size: 'lg' } };

/** Fills the viewport. Choose it from your own breakpoint (L06 decision 21). */
export const Fullscreen: Story = { args: { defaultOpen: true, size: 'fullscreen' } };

/**
 * Long content: the dialog itself scrolls, under a sticky header and footer. With focus on the
 * dialog, the arrow keys and Page Down scroll it. On a short viewport the header and footer scroll
 * away with the content.
 */
export const LongContent: Story = {
  args: {
    defaultOpen: true,
    title: 'Terms of service',
    children: Array.from({ length: 14 }, (_, index) => (
      <p key={index} style={{ margin: 0 }}>
        {index + 1}. {paragraph}
      </p>
    )),
    footer: <Button>Accept</Button>,
  },
};

/** A title that wraps instead of pushing the close button out. */
export const LongTitle: Story = {
  args: {
    defaultOpen: true,
    size: 'sm',
    title: 'Move every project in this workspace to the archive and notify their owners',
  },
};

/** `dismiss="any"`: a click on the backdrop closes it too. */
export const LightDismiss: Story = { args: { defaultOpen: true, dismiss: 'any' } };

/**
 * No visible heading and no close button: named by `aria-label`. Hiding the close button needs
 * another visible way out, here a `cancelLabel` ("Done").
 */
export const NoTitleNoCloseButton: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Open image
        </Button>
        <Dialog
          aria-label="Sunset over the harbour"
          hideCloseButton
          cancelLabel="Done"
          open={open}
          onOpenChange={setOpen}
        >
          <div
            style={{
              blockSize: '12rem',
              background:
                'linear-gradient(var(--senui-color-bg-accent), var(--senui-color-bg-danger))',
            }}
          />
        </Dialog>
      </>
    );
  },
};

/** Keyboard open: the dialog shows a focus ring on its border (L06 decision 10, scope deviation 11). */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    const dialog = await canvas.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveFocus());
  },
};

/**
 * A form: `initialFocus="first"` puts focus in the first field, and the footer's submit buttons
 * belong to the form through `form=`. A `method="dialog"` submit closes it with the button's value
 * as `details.returnValue`; native validation and FormField's errors run first (L04).
 */
export const Form: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const formId = useId();
    const [open, setOpen] = useState(true);
    const [result, setResult] = useState('');
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          New contact
        </Button>
        <p role="status">{result}</p>
        <Dialog
          title="New contact"
          closeLabel="Close"
          initialFocus="first"
          open={open}
          onOpenChange={(next, details) => {
            if (details.reason === 'form') setResult(`Saved (${details.returnValue}).`);
            setOpen(next);
          }}
          cancelLabel="Cancel"
          footer={
            <Button type="submit" form={formId} value="save">
              Save
            </Button>
          }
        >
          <form
            id={formId}
            method="dialog"
            style={{ display: 'grid', gap: 'var(--senui-space-4)' }}
          >
            <FormField label="Name" required>
              {(field) => <TextInput field={field} name="name" autoComplete="name" />}
            </FormField>
            <FormField label="Email" required>
              {(field) => (
                <TextInput field={field} name="email" type="email" autoComplete="email" />
              )}
            </FormField>
          </form>
        </Dialog>
      </>
    );
  },
};

/**
 * Recipe: unsaved changes. A controlled owner refuses the close and asks inside the dialog, rather
 * than relying on blocking Esc, which browsers allow only once without a fresh user action
 * (L06 decision 3). A second Esc then arrives as `'forced'`: the dialog has closed, so accept it.
 */
export const UnsavedChangesRecipe: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [open, setOpen] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const close = () => {
      setOpen(false);
      setDirty(false);
      setConfirming(false);
    };
    const onOpenChange = (next: boolean, details: DialogOpenChangeDetails) => {
      // A form submit saves, and 'forced' has already closed: neither can be refused.
      if (!next && dirty && details.reason !== 'form' && details.reason !== 'forced') {
        setConfirming(true);
        return;
      }
      if (!next) close();
    };
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Edit note
        </Button>
        <Dialog
          title="Edit note"
          closeLabel="Close"
          initialFocus="first"
          open={open}
          onOpenChange={onOpenChange}
          footer={
            confirming ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirming(false);
                  }}
                >
                  Keep editing
                </Button>
                <Button variant="danger" onClick={close}>
                  Discard changes
                </Button>
              </>
            ) : (
              <Button onClick={close}>Save</Button>
            )
          }
        >
          <FormField label="Note">
            {(field) => (
              <TextInput
                field={field}
                defaultValue="Call the supplier"
                onChange={() => {
                  setDirty(true);
                }}
              />
            )}
          </FormField>
          {confirming && <p role="status">You have unsaved changes. Discard them?</p>}
        </Dialog>
      </>
    );
  },
};

/** A dialog opened from a dialog: Esc closes the inner one only, and focus returns into the outer one. */
export const Nested: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [outer, setOuter] = useState(true);
    const [inner, setInner] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOuter(true);
          }}
        >
          Open settings
        </Button>
        <Dialog title="Settings" closeLabel="Close" open={outer} onOpenChange={setOuter}>
          <p style={{ margin: 0 }}>{paragraph}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setInner(true);
            }}
          >
            Advanced…
          </Button>
          <Dialog
            title="Advanced settings"
            closeLabel="Close"
            size="sm"
            open={inner}
            onOpenChange={setInner}
          >
            <p style={{ margin: 0 }}>These apply to every project.</p>
          </Dialog>
        </Dialog>
      </>
    );
  },
};

export const ForcedColors: Story = {
  args: {
    defaultOpen: true,
    description: 'The border is the only edge in forced colours: shadows are removed.',
    footer: <Button>Save</Button>,
  },
  parameters: {
    forcedColors: 'active',
    docs: {
      description: {
        story:
          'Screenshot with forced colours emulated by the L08 gate. To check by hand: DevTools → Rendering → forced-colors: active, then open with the keyboard to see the ring.',
      },
    },
  },
};

/** Right to left: the close button sits on the left, at the end of the reading direction. */
export const RightToLeft: Story = {
  args: { defaultOpen: true, title: 'تعديل الملف الشخصي', closeLabel: 'إغلاق' },
  render: (args) => (
    <div dir="rtl">
      <Demo {...args} />
    </div>
  ),
};
