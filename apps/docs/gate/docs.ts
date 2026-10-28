// L09 decision 9: the docs entries the gate checks as pages, and how a docs page is opened.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type ConsoleMessage, type Page } from '@playwright/test';

const DOCS = fileURLToPath(new URL('..', import.meta.url));

export interface GateDocs {
  id: string;
  title: string;
  /** An MDX page, rather than a component's autodocs page. */
  mdx: boolean;
}

interface IndexEntry {
  type: string;
  id: string;
  title: string;
  tags: string[];
}

/** Every docs entry in the built Storybook's index: each component's page and each MDX page. */
export function loadDocs(): GateDocs[] {
  const index = JSON.parse(readFileSync(join(DOCS, 'storybook-static/index.json'), 'utf8')) as {
    entries: Record<string, IndexEntry>;
  };
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'docs')
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      mdx: entry.tags.includes('unattached-mdx') || entry.tags.includes('attached-mdx'),
    }));
}

/** The name a component page's `<h1>` must carry: the last part of its title. */
export function pageName(docs: GateDocs): string {
  return docs.title.split('/').at(-1) ?? docs.title;
}

// Runs in the page before Storybook boots. `docsRendered` fires once the docs page's React tree has
// rendered; its inline stories render after it, each with `storyRendered`.
function watchDocs(): void {
  const state = { rendered: false, errors: [] as string[] };
  (window as unknown as { __senuiDocs: typeof state }).__senuiDocs = state;
  let channel: unknown;
  Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set(value: { on: (event: string, listener: (payload: unknown) => void) => void }) {
      channel = value;
      value.on('docsRendered', () => {
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

const watched = new WeakSet<Page>();
const SOCKET_ERROR = /net::ERR_(ADDRESS_IN_USE|NO_BUFFER_SPACE)\b/;

/**
 * Opens a docs entry on its own (`iframe.html?viewMode=docs`) and waits until it is complete: the
 * page rendered, every inline story rendered, every framed story loaded and rendered, and every
 * finite animation finished. Fails on a Storybook error, a page error or a `console.error`.
 */
export async function openDocs(page: Page, docs: GateDocs): Promise<void> {
  if (!watched.has(page)) {
    await page.addInitScript(watchDocs);
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
    await page.goto(`/iframe.html?viewMode=docs&id=${docs.id}`);
    await page.waitForFunction(() => {
      const state = (window as unknown as { __senuiDocs?: { rendered: boolean; errors: string[] } })
        .__senuiDocs;
      return Boolean(state && (state.rendered || state.errors.length > 0));
    });
    await storiesRendered(page);
    const storybookErrors = await page.evaluate(
      () => (window as unknown as { __senuiDocs: { errors: string[] } }).__senuiDocs.errors,
    );
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    const errors = [...storybookErrors, ...problems];
    if (attempt === 1 && errors.length > 0 && errors.every((e) => SOCKET_ERROR.test(e))) continue;
    expect(errors, `${docs.id} rendered with errors`).toEqual([]);
    break;
  }
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  await expect(page.locator('meta[name="senui-css"]')).toHaveAttribute('content', 'dist');
}

/**
 * Waits until every story on the docs page has rendered. Inline stories: Storybook's loader leaves
 * each story block once its story has rendered. Framed stories: each frame's own Storybook has
 * rendered its story.
 */
export async function storiesRendered(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const docsRoot = document.querySelector('#storybook-docs');
      if (!docsRoot) return false;
      const inline = [...docsRoot.querySelectorAll('.sb-story')].every(
        (block) => block.querySelector('[id$="-inner"]')?.childElementCount,
      );
      const frames = [
        ...docsRoot.querySelectorAll<HTMLIFrameElement>('iframe[data-senui-docs-story]'),
      ].every((frame) => {
        const root = frame.contentDocument?.querySelector('#storybook-root');
        return Boolean(root?.childElementCount && frame.contentDocument?.readyState === 'complete');
      });
      return inline && frames;
    },
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * What axe leaves out of a docs page: Storybook's own markup outside the docs root, and the story
 * canvases, whose stories are checked by their own entries (with their own exceptions).
 */
export const DOCS_EXCLUDE = [
  '#storybook-root',
  '.sb-preparing-story',
  '.sb-preparing-docs',
  '.sb-errordisplay',
  '.sb-nopreview',
  '#storybook-docs .sb-story',
  '#storybook-docs iframe[data-senui-docs-story]',
] as const;
