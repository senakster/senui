import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { AlertDialog, type AlertDialogProps } from './AlertDialog.js';

/** The stories use the `title` branch: Storybook's arg types collapse the name union to `never`. */
type TitledProps = Extract<AlertDialogProps, { title: ReactNode }>;

/**
 * A trigger and a controlled AlertDialog, rendered from the story's args. The action closes it, as
 * the consumer's handler would after doing the work. `loading` shows the action working (a request
 * in flight); Button keeps focus and its width.
 */
function Demo({
  defaultOpen = false,
  onOpenChange,
  loading = false,
  ...args
}: TitledProps & { loading?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete project
      </Button>
      <AlertDialog
        {...args}
        open={open}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          setOpen(next);
        }}
        action={
          <Button
            variant="danger"
            loading={loading}
            onClick={() => {
              setOpen(false);
            }}
          >
            Delete project
          </Button>
        }
      />
    </>
  );
}

const meta = {
  title: 'Components/AlertDialog',
  component: AlertDialog,
  args: {
    title: 'Delete project?',
    description: 'Its files and history are deleted for everyone. This can’t be undone.',
    cancelLabel: 'Cancel',
    action: <Button variant="danger">Delete project</Button>,
    onOpenChange: fn(),
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    titleLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
    description: { control: 'text' },
    action: { control: false },
    children: { control: false },
  },
  parameters: { docs: { story: { inline: false, iframeHeight: 360 } } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<TitledProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the trigger opens it, and focus starts on Cancel. Esc cancels; the backdrop does nothing. */
export const Default: Story = {};

/** A destructive confirmation, open. */
export const Open: Story = { args: { defaultOpen: true } };

/** More detail after the description: what will be deleted. */
export const WithDetails: Story = {
  args: {
    defaultOpen: true,
    size: 'md',
    children: (
      <ul style={{ margin: 0 }}>
        <li>12 documents</li>
        <li>3 shared links, which stop working</li>
        <li>The activity history</li>
      </ul>
    ),
  },
};

/** Keyboard open: focus starts on Cancel, the least destructive choice, with its focus ring. */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    const cancel = await canvas.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());
  },
};

/** The action is working: it keeps focus and width while loading, as Button does. */
export const ActionLoading: Story = {
  args: { defaultOpen: true },
  render: (args) => <Demo {...args} loading />,
};

/** Right to left: the actions align to the left, the end of the reading direction. */
export const RightToLeft: Story = {
  args: {
    defaultOpen: true,
    title: 'حذف المشروع؟',
    description: 'يتم حذف ملفاته وسجله للجميع. لا يمكن التراجع عن ذلك.',
    cancelLabel: 'إلغاء',
  },
  render: (args) => (
    <div dir="rtl">
      <Demo {...args} />
    </div>
  ),
};

export const ForcedColors: Story = {
  args: { defaultOpen: true },
  tags: ['forced-colors'],
  parameters: {
    docs: {
      description: {
        story:
          'Screenshot with forced colours emulated by the accessibility gate. To check by hand: DevTools → Rendering → forced-colors: active.',
      },
    },
  },
};
