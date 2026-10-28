/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import { docsErrors, type AnyComponentDocs } from './component-docs-check.js';
import { publishedTextErrors } from './published-text.js';

// Every component's usage guidance and stories. Vite resolves the globs at build time, so a new
// component is picked up without registering it anywhere.
const allDocs = import.meta.glob<AnyComponentDocs>('../../components/*/*.docs.ts', {
  eager: true,
  import: 'docs',
});
const stories = import.meta.glob<Record<string, unknown>>('../../components/*/*.stories.tsx', {
  eager: true,
});
const contracts = import.meta.glob('../../components/*/*.a11y.ts');

const dirOf = (path: string) => /\/components\/([^/]+)\//.exec(path)?.[1] ?? '';
const storiesOf = (dir: string) =>
  Object.entries(stories).find(([path]) => dirOf(path) === dir)?.[1] ?? {};

describe('every component', () => {
  test('has usage guidance', () => {
    expect(Object.keys(allDocs).map(dirOf).sort()).toEqual(
      Object.keys(contracts).map(dirOf).sort(),
    );
  });

  test.each(Object.entries(allDocs))('%s is valid guidance', (path, docs) => {
    expect(docs, `${path} must export \`docs\``).toBeDefined();
    expect(docsErrors(dirOf(path), docs, storiesOf(dirOf(path)))).toEqual([]);
  });
});

const valid: AnyComponentDocs = {
  component: 'Button',
  summary: 'Starts an action when pressed.',
  description: 'Pass `variant` for emphasis.',
  useWhen: ['A form submits.'],
  dontUseWhen: [
    { when: 'It navigates.', alternative: { element: 'a', note: 'A link goes somewhere.' } },
  ],
  related: [],
  examples: ['Default'],
  composition: [],
};
const story = {};
const errorsFor = (
  patch: Partial<AnyComponentDocs>,
  module: Record<string, unknown> = { Default: story },
) => docsErrors('Button', { ...valid, ...patch }, module);

describe('docsErrors', () => {
  test('valid guidance has no errors', () => {
    expect(errorsFor({})).toEqual([]);
  });

  test('the summary is one short sentence', () => {
    expect(errorsFor({ summary: 'Starts an action. Also submits.' })).toHaveLength(1);
    expect(errorsFor({ summary: 'Starts an action' })).toHaveLength(1);
    expect(errorsFor({ summary: `${'x'.repeat(160)}.` })).toHaveLength(1);
    // A full stop inside inline code isn't a sentence end.
    expect(errorsFor({ summary: 'Starts an action, like `form.submit()`.' })).toEqual([]);
  });

  test('usage prose makes no accessibility claims; the contract does', () => {
    expect(errorsFor({ description: 'Fully accessible.' })).toHaveLength(1);
    expect(errorsFor({ useWhen: ['The name announces the action.'] })).toEqual([]);
  });

  test('examples exist and need no play function', () => {
    expect(errorsFor({ examples: ['Missing'] })).toEqual(["examples: no story 'Missing'"]);
    expect(errorsFor({}, { Default: { play: () => undefined } })).toEqual([
      "examples: 'Default' has a play function, which docs pages don't run",
    ]);
  });
});

describe('publishedTextErrors', () => {
  test('rejects private references, review notes and names', () => {
    expect(publishedTextErrors('x', 'As decided in L06 decision 12.')).toHaveLength(1);
    expect(publishedTextErrors('x', 'Fixed after the review.')).toHaveLength(1);
    expect(publishedTextErrors('x', "Emil's choice.")).toHaveLength(1);
    expect(publishedTextErrors('x', 'See ADR-0014.')).toEqual([]);
  });

  test('allows inline code only', () => {
    expect(publishedTextErrors('x', 'The `.senui-button__label` part is private.')).toEqual([]);
    expect(publishedTextErrors('x', 'This is **important**.')).toHaveLength(1);
    expect(publishedTextErrors('x', 'See [the guide](https://example.com).')).toHaveLength(1);
  });
});
