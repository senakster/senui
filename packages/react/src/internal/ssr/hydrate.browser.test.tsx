import { act, version } from 'react';
import { version as domVersion } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, expect, inject, test, vi } from 'vitest';
import { commands } from 'vitest/browser';
import '@senakster/senui-tokens/tokens.css';
import '../../styles/index.css';
import { expectReactVersion } from '../testing/react-version.js';
import { allStories, FIXTURES, MANIFEST, type Manifest } from './stories.js';

// L08 decision 9: each story hydrates the markup render.ssr.test.tsx made in Node in this same run,
// with no mismatch. React 19 reports a mismatch through `onRecoverableError`; React 18.3 also
// through the console, so both are collected. Run with the `ssr` project (`vitest run`, or
// `--project ssr --project browser`): fixtures from any other run are refused, not hydrated.
const stories = allStories();
let manifest: Manifest | undefined;
let root: Root | undefined;
let container: HTMLElement | undefined;

beforeAll(async () => {
  try {
    manifest = JSON.parse(await commands.readFile(`${FIXTURES}/${MANIFEST}`)) as Manifest;
  } catch {
    manifest = undefined;
  }
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = container = undefined;
  vi.restoreAllMocks();
});

test('resolves the React the run expects', () => {
  expectReactVersion({ react: version, 'react-dom': domVersion });
});

test('the server markup is from this run, for every story', () => {
  expect(manifest?.run, 'run the ssr project in the same run (vitest run)').toBe(inject('ssrRun'));
  // The same set; Node and the browser may order the glob's matches differently.
  expect([...(manifest?.ids ?? [])].sort()).toEqual(stories.map(([id]) => id).sort());
});

test.each(stories)('%s hydrates the server markup', async (id, Story) => {
  expect(manifest?.run, 'no server markup from this run').toBe(inject('ssrRun'));
  const markup = await commands.readFile(`${FIXTURES}/${id}.html`).catch((cause: unknown) => {
    throw new Error(`No server markup for ${id}: it failed to render in the ssr project.`, {
      cause,
    });
  });
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  container = host;

  const reported: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => reported.push(args));
  // Async, so effects and the recoverable-error queue flush before the assertion.
  await act(() => {
    root = hydrateRoot(host, <Story />, {
      onRecoverableError: (error) => reported.push(error),
    });
    return Promise.resolve();
  });

  expect(reported).toEqual([]);
});
