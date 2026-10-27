// L08: the stories the gate checks, the contract each one answers to, and how a story is opened.
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, type ConsoleMessage, type Page } from '@playwright/test';
import type { A11yContract } from '../../../packages/react/src/internal/a11y/a11y-contract.js';

const DOCS = fileURLToPath(new URL('..', import.meta.url));

export interface GateStory {
  id: string;
  title: string;
  name: string;
  /** The component's directory name, e.g. `Button`. */
  component: string;
  tags: readonly string[];
}

interface IndexEntry {
  type: string;
  id: string;
  title: string;
  name: string;
  tags: string[];
  componentPath?: string;
}

/**
 * Every story in the built Storybook's index (L08 "Story list"). A new story is checked the moment
 * it exists; nothing here lists stories by hand.
 */
export function loadStories(): GateStory[] {
  const index = JSON.parse(readFileSync(join(DOCS, 'storybook-static/index.json'), 'utf8')) as {
    entries: Record<string, IndexEntry>;
  };
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story')
    .map((entry) => {
      if (!entry.componentPath) throw new Error(`${entry.id}: the story names no component`);
      return {
        id: entry.id,
        title: entry.title,
        name: entry.name,
        component: basename(dirname(entry.componentPath)),
        tags: entry.tags,
      };
    });
}

const contracts = new Map<string, A11yContract>();

/** The story's component contract, from the sibling `<Name>.a11y.ts` (L08 "Story → contract"). */
export async function contractFor(story: GateStory): Promise<A11yContract> {
  const cached = contracts.get(story.component);
  if (cached) return cached;
  const path = join(
    DOCS,
    '../../packages/react/src/components',
    story.component,
    `${story.component}.a11y.ts`,
  );
  const module = (await import(pathToFileURL(path).href)) as { a11y?: A11yContract };
  if (!module.a11y) throw new Error(`${story.component}: no a11y contract at ${path}`);
  contracts.set(story.component, module.a11y);
  return module.a11y;
}

/** Injects the in-page helpers (`window.__senuiMeasure`, `browser/measure.js`). */
export async function injectMeasure(page: Page): Promise<void> {
  await page.addScriptTag({ path: join(DOCS, 'gate/browser/measure.js') });
}

/** `EmptyState` → `senui-empty-state`, the component's public root class. */
export function rootClass(component: string): string {
  return `senui-${component.replace(/(?<=[a-z])(?=[A-Z])/g, '-').toLowerCase()}`;
}

// Runs in the page before Storybook boots: listens on the preview channel as soon as it exists.
// `storyRendered` fires after the play function, so a designed end state is what gets checked.
function watchStory(): void {
  const state = { rendered: false, errors: [] as string[] };
  (window as unknown as { __senuiGate: typeof state }).__senuiGate = state;
  let channel: unknown;
  Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set(value: { on: (event: string, listener: (payload: unknown) => void) => void }) {
      channel = value;
      value.on('storyRendered', () => {
        state.rendered = true;
      });
      for (const event of [
        'storyErrored',
        'storyThrewException',
        'playFunctionThrewException',
        'storyMissing',
      ]) {
        value.on(event, (payload) => {
          const message = (payload as { message?: string } | undefined)?.message;
          state.errors.push(`${event}: ${message ?? JSON.stringify(payload)}`);
        });
      }
    },
  });
}

/** Pages that already have the channel watcher (`addInitScript` persists across navigations). */
const watched = new WeakSet<Page>();
/** OS-level socket failures on a loaded machine (seen on Windows), never a story's own error. */
const SOCKET_ERROR = /net::ERR_(ADDRESS_IN_USE|NO_BUFFER_SPACE)\b/;

/**
 * Opens a story in its own page and waits until it has rendered, play function included. Fails on
 * a Storybook error, a page error, a `console.error`, or a Storybook built against source CSS.
 */
export async function openStory(page: Page, story: GateStory): Promise<void> {
  if (!watched.has(page)) {
    await page.addInitScript(watchStory);
    watched.add(page);
  }
  for (let attempt = 1; ; attempt += 1) {
    const problems: string[] = [];
    const onPageError = (error: Error) => problems.push(`pageerror: ${error.message}`);
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForFunction(() => {
      const state = (window as unknown as { __senuiGate?: { rendered: boolean; errors: string[] } })
        .__senuiGate;
      return Boolean(state && (state.rendered || state.errors.length > 0));
    });
    const storybookErrors = await page.evaluate(
      () => (window as unknown as { __senuiGate: { errors: string[] } }).__senuiGate.errors,
    );
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    const errors = [...storybookErrors, ...problems];
    // The operating system refusing a socket is the machine, not the story: on Windows a full gate
    // run (a fresh context per test) exhausted local ports and socket buffers. Load once more; any
    // other error, or the same one twice, fails.
    if (attempt === 1 && errors.length > 0 && errors.every((e) => SOCKET_ERROR.test(e))) continue;
    expect(errors, `${story.id} rendered with errors`).toEqual([]);
    break;
  }
  // Checks measure the designed state, not a frame of an enter animation: mid-animation, boxes and
  // colours are the animation's (rule 42), and axe reported a dialog title as obscured. Infinite
  // animations (a loading spinner) never finish and are left running. The motion checks record
  // animations from first paint separately (L08 decision 4).
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  // L08 decision 2: the gate checks the consumer's CSS, the package's built stylesheet.
  await expect(page.locator('meta[name="senui-css"]')).toHaveAttribute('content', 'dist');
}
