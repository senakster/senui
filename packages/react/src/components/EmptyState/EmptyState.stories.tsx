import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../Button/Button.js';
import { FormField } from '../FormField/FormField.js';
import { TextInput } from '../TextInput/TextInput.js';
import { EmptyState } from './EmptyState.js';

/** A generic empty tray, drawn in `currentColor` so it takes the illustration token's colour. */
function TrayIllustration() {
  return (
    <svg viewBox="0 0 48 48" fill="none" focusable="false">
      <path
        d="M6 28l6-16h24l6 16v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V28z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 28h10l2 4h12l2-4h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A magnifier, for no-results. */
function SearchIllustration() {
  return (
    <svg viewBox="0 0 48 48" fill="none" focusable="false">
      <circle cx="21" cy="21" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M30 30l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    headingLevel: 2,
    title: 'No projects yet',
    description: 'Projects you create or are invited to appear here.',
    illustration: <TrayIllustration />,
    actions: <Button>Create project</Button>,
  },
  argTypes: {
    headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5, 6] },
    title: { control: 'text' },
    description: { control: 'text' },
    illustration: { control: false },
    actions: { control: false },
    headingRef: { control: false },
  },
  render: (args) => <EmptyState {...args} />,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No data yet: what is empty, why, and the one thing to do about it. */
export const NoData: Story = {};

/** Title only: the description, illustration and actions are all optional. */
export const TitleOnly: Story = {
  args: { description: undefined, illustration: undefined, actions: undefined },
};

/** First use: a primary action and a secondary link, primary first (L07 decision 6). */
export const FirstUse: Story = {
  args: {
    title: 'Create your first project',
    description: 'A project keeps your files, tasks and discussions in one place.',
    actions: (
      <>
        <Button>Create project</Button>
        <Button variant="secondary">Import from a file</Button>
      </>
    ),
  },
};

/**
 * Error-recovery copy. Not a variant and not an alert (L07 decision 11): the words say what went
 * wrong, and the action recovers.
 */
export const ErrorRecovery: Story = {
  args: {
    title: 'We couldn’t load your projects',
    description: 'Check your connection, then try again. Your projects are safe.',
    actions: <Button>Try again</Button>,
  },
};

/** A 4:3 picture, 800 px wide: fitted into the square box, neither distorted nor overflowing. */
const WIDE_PICTURE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="60" fill="#8a8f98"/><circle cx="400" cy="300" r="150" fill="#d5d8dc"/></svg>',
)}`;

/**
 * Illustrations that aren't a bare square SVG: a wide `<img>` and an icon component that wraps its
 * SVG in a `<span>`. Both fit the box (review).
 */
export const IllustrationShapes: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--senui-space-6)', inlineSize: '40rem' }}>
      <EmptyState {...args} illustration={<img src={WIDE_PICTURE} alt="" />} />
      <EmptyState
        {...args}
        illustration={
          <span className="icon">
            <TrayIllustration />
          </span>
        }
      />
    </div>
  ),
};

/** A long title balances its lines, and a long word breaks instead of overflowing. */
export const LongContent: Story = {
  args: {
    title: 'Nothing has been shared with you in this workspace during the last thirty days',
    description:
      'When someone shares a document with you, it appears here. Ask a colleague to share supercalifragilisticexpialidocious-report-final-v2.pdf again.',
  },
};

/** Right to left: the compact layout mirrors, with the illustration at the inline start. */
export const RightToLeft: Story = {
  args: {
    title: 'لا توجد مشاريع بعد',
    description: 'تظهر هنا المشاريع التي تنشئها أو تُدعى إليها.',
    actions: <Button>إنشاء مشروع</Button>,
  },
  render: (args) => (
    <div dir="rtl" lang="ar" style={{ inlineSize: '20rem' }}>
      <EmptyState {...args} />
    </div>
  ),
};

const PRODUCTS = ['Desk lamp', 'Notebook', 'Pencil case', 'Stapler', 'Wall clock'];

/**
 * How long typing must pause before the status is updated. A screen-reader user typing with key
 * echo is slow: at 300 ms NVDA read a result after every letter (Emil, 2026-10-26).
 */
const STATUS_DEBOUNCE_MS = 1000;

/**
 * No results for a filter. The `role="status"` region is in the page before anything is typed,
 * outside EmptyState, and its text is updated with the result once the user has stopped typing for
 * a second; EmptyState itself announces nothing (L07 decision 7). Focus stays in the input.
 */
export const NoResults: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const matches = PRODUCTS.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
      if (query === '') {
        setStatus('');
        return;
      }
      const timer = setTimeout(() => {
        setStatus(
          matches.length === 0
            ? `No results for “${query}”`
            : `${String(matches.length)} ${matches.length === 1 ? 'result' : 'results'}`,
        );
      }, STATUS_DEBOUNCE_MS);
      return () => {
        clearTimeout(timer);
      };
    }, [query, matches.length]);

    return (
      <div style={{ display: 'grid', gap: 'var(--senui-space-4)', maxInlineSize: '32rem' }}>
        <FormField label="Filter products">
          {(field) => (
            <TextInput
              field={field}
              ref={input}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          )}
        </FormField>
        <p role="status" style={{ margin: 0, fontFamily: 'var(--senui-font-family-sans)' }}>
          {status}
        </p>
        {matches.length > 0 ? (
          <ul>
            {matches.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <EmptyState
            headingLevel={2}
            title={`No results for “${query}”`}
            description="Check the spelling, or try a shorter word."
            illustration={<SearchIllustration />}
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  input.current?.focus();
                }}
              >
                Clear filter
              </Button>
            }
          />
        )}
      </div>
    );
  },
};

/**
 * The last item is deleted, so the button that had focus is gone. The app moves focus to the empty
 * state's first action, not to `<body>` (L07 decision 8), and says what happened in its status
 * region.
 *
 * This story and NoResults have no play function: Storybook runs it when the story opens, so a
 * manual keyboard or screen-reader run would start from the end state (found in Emil's NVDA run,
 * 2026-10-26). `EmptyState.browser.test.tsx` drives both with real keys.
 */
export const DeletedLastItem: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [items, setItems] = useState(['Quarterly report']);
    const [status, setStatus] = useState('');
    const [deleted, setDeleted] = useState<string | null>(null);
    const firstAction = useRef<HTMLButtonElement>(null);

    // Focus first, then the status: set together, NVDA read the status before and again after the
    // focus move (review, 2026-10-26).
    useEffect(() => {
      if (deleted === null || items.length > 0) return;
      firstAction.current?.focus();
      setStatus(`${deleted} deleted`);
    }, [deleted, items.length]);

    return (
      <div style={{ display: 'grid', gap: 'var(--senui-space-4)', maxInlineSize: '32rem' }}>
        <p role="status" style={{ margin: 0, fontFamily: 'var(--senui-font-family-sans)' }}>
          {status}
        </p>
        {items.length > 0 ? (
          <ul>
            {items.map((name) => (
              <li key={name}>
                {name}{' '}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setItems((current) => current.filter((item) => item !== name));
                    setDeleted(name);
                  }}
                >
                  Delete {name}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            headingLevel={2}
            title="No reports"
            description="Reports you create appear here."
            illustration={<TrayIllustration />}
            actions={<Button ref={firstAction}>Create report</Button>}
          />
        )}
      </div>
    );
  },
};

/**
 * The heading takes focus from your script (`headingRef`), for when no action is rendered. After
 * keyboard use it shows the focus ring.
 */
export const FocusVisible: Story = {
  args: { actions: undefined },
  render: function Render(args) {
    const heading = useRef<HTMLHeadingElement>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--senui-space-4)', justifyItems: 'start' }}>
        <Button onClick={() => heading.current?.focus()}>Focus the heading</Button>
        <EmptyState {...args} headingRef={heading} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('heading', { name: 'No projects yet' })).toHaveFocus();
  },
};

/** In a page: the page's `<h1>`, then the empty state at level 2. Wide, so stacked and centred. */
export const InPage: Story = {
  parameters: { controls: { disable: true }, layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--senui-space-6)' }}>
      <h1 style={{ marginBlockStart: 0 }}>Projects</h1>
      <EmptyState
        headingLevel={2}
        title="No projects yet"
        description="Projects you create or are invited to appear here."
        illustration={<TrayIllustration />}
        actions={<Button>Create project</Button>}
      />
    </div>
  ),
};

/** In a card: under the card's level-2 heading, at level 3. Narrow, so compact. */
export const InCard: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        inlineSize: '22rem',
        padding: 'var(--senui-space-4)',
        border: 'var(--senui-border-width-default) solid var(--senui-color-border-default)',
        borderRadius: 'var(--senui-radius-lg)',
        background: 'var(--senui-color-bg-raised)',
      }}
    >
      <h2 style={{ margin: 0 }}>Recent activity</h2>
      <EmptyState
        headingLevel={3}
        title="Nothing yet this week"
        description="Comments and changes appear here."
        illustration={<TrayIllustration />}
      />
    </div>
  ),
};

/**
 * In an auto-layout table cell. The cell is shrink-to-fit, so it gets an explicit width; without
 * one, EmptyState's inline-size containment would collapse it to zero (L07 decision 10).
 */
export const InTableCell: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <>
      <h2 style={{ marginBlockStart: 0 }}>Invoices</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th scope="col">Number</th>
            <th scope="col">Customer</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} style={{ inlineSize: '24rem' }}>
              <EmptyState
                headingLevel={3}
                title="No invoices this month"
                description="Invoices you send appear here."
                illustration={<TrayIllustration />}
                actions={
                  <Button size="sm" variant="secondary">
                    New invoice
                  </Button>
                }
              />
            </td>
          </tr>
        </tbody>
      </table>
    </>
  ),
};

/**
 * Compact and stacked side by side.
 * - `parameters.forcedColors: 'active'` tells L08's Playwright gate to screenshot this story with
 *   forced colours emulated, in light and dark schemes.
 * - By hand: DevTools → Rendering → "Emulate CSS media feature forced-colors: active". The text and
 *   illustration take the system colours.
 */
export const ForcedColors: Story = {
  parameters: {
    controls: { disable: true },
    forcedColors: 'active',
    docs: {
      description: {
        story:
          'Screenshot with forced colours emulated by the L08 gate. To check by hand: DevTools → Rendering → forced-colors: active.',
      },
    },
  },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--senui-space-6)' }}>
      <div style={{ inlineSize: '20rem' }}>
        <EmptyState {...args} />
      </div>
      <div style={{ inlineSize: '40rem' }}>
        <EmptyState {...args} />
      </div>
    </div>
  ),
};
