import type { ComponentDocs, ComponentName } from './component-docs.js';
import { publishedStrings, publishedTextErrors } from './published-text.js';

/** A `.docs.ts` as loaded at runtime, whatever its component's props and stories. */
export type AnyComponentDocs = ComponentDocs<unknown, Record<string, unknown>, ComponentName>;

const SUMMARY_MAX = 160;

/**
 * Problems the type can't catch in one component's usage guidance (L09 decisions 3 and 8). An empty
 * list means the guidance is valid. Run over every component by `component-docs.test.ts`.
 *
 * @param dir The component's directory name, which `component` must equal.
 * @param stories The component's stories module, to check that each example exists and needs no
 *   play function (docs pages never run one).
 */
export function docsErrors(
  dir: string,
  docs: AnyComponentDocs,
  stories: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  if (docs.component !== dir) {
    errors.push(`component is '${docs.component}', but the directory is '${dir}'`);
  }

  const { summary } = docs;
  if (summary.length > SUMMARY_MAX) {
    errors.push(
      `summary is ${String(summary.length)} characters; the limit is ${String(SUMMARY_MAX)}`,
    );
  }
  const sentenceEnds = summary.replace(/`[^`]*`/g, '').match(/[.!?](\s|$)/g) ?? [];
  if (!summary.endsWith('.') || sentenceEnds.length !== 1) {
    errors.push(`summary must be one sentence ending in a full stop: "${summary}"`);
  }

  for (const [path, text] of publishedStrings(docs)) {
    const usage = path === 'summary' || path === 'description';
    errors.push(...publishedTextErrors(path, text, { allowClaims: !usage }));
  }

  const meta = stories.default as { play?: unknown } | undefined;
  for (const name of docs.examples) {
    const story = stories[name] as { play?: unknown } | undefined;
    if (story === undefined) errors.push(`examples: no story '${name}'`);
    else if (story.play !== undefined || meta?.play !== undefined) {
      errors.push(`examples: '${name}' has a play function, which docs pages don't run`);
    }
  }
  return errors;
}
