// L08 decision 12: no global allowlist. An exception is a tag on the story plus a dated entry here.
import { readFileSync } from 'node:fs';
import type { GateStory } from './stories.js';

/** The gate's checks a story can opt out of. Grows as checks land (L08 PRs 2 to 4). */
export const CHECKS = [
  'axe',
  'semantics',
  'test-tag',
  'target-size',
  'reflow',
  'text-spacing',
  'rtl',
  'motion',
  'tab-walk',
  'resets',
] as const;
export type Check = (typeof CHECKS)[number];

export interface Exception {
  story: string;
  check: Check;
  /**
   * Axe only: the rule ids this exception hides; no other rule is filtered. `color-contrast:incomplete`
   * hides only the contrast results axe couldn't compute, never a contrast violation.
   */
  rules?: string[];
  /** An ADR or issue that explains it. */
  reason: string;
  /** `YYYY-MM-DD`. After it, the exception fails the gate. */
  expires: string;
}

/**
 * L10 decision 6: a component released although a manual run is stale. Pinned to the component's
 * fingerprint at review, so any further edit voids it. `scripts/check-a11y-contracts.mjs` checks
 * these (fails at release without one); the gate itself ignores them.
 */
export interface StaleRunException {
  component: string;
  check: 'stale-run';
  sourceHash: string;
  reason: string;
  expires: string;
}

const ENTRIES = (
  JSON.parse(readFileSync(new URL('./exceptions.json', import.meta.url), 'utf8')) as {
    exceptions: (Exception | StaleRunException)[];
  }
).exceptions;

const isStaleRun = (entry: Exception | StaleRunException): entry is StaleRunException =>
  entry.check === 'stale-run';

/** The gate's own exceptions: one story skipping one check. */
export const EXCEPTIONS: Exception[] = ENTRIES.filter(
  (entry): entry is Exception => !isStaleRun(entry),
);

const tagFor = (check: string) => `gate-skip-${check}`;

/** The exception that lets `story` skip `check`, if it has one. */
export function exceptionFor(story: GateStory, check: Check): Exception | undefined {
  if (!story.tags.includes(tagFor(check))) return undefined;
  return EXCEPTIONS.find((entry) => entry.story === story.id && entry.check === check);
}

/** Every way the tags and the entries can disagree. Empty means the exceptions are consistent. */
export function exceptionErrors(stories: readonly GateStory[], today: string): string[] {
  const errors: string[] = [];
  const byId = new Map(stories.map((story) => [story.id, story]));
  for (const entry of EXCEPTIONS) {
    const label = `${entry.story} / ${entry.check}`;
    const story = byId.get(entry.story);
    if (!(CHECKS as readonly string[]).includes(entry.check))
      errors.push(`${label}: unknown check`);
    if (!story) errors.push(`${label}: no such story`);
    else if (!story.tags.includes(tagFor(entry.check))) {
      errors.push(`${label}: the story has no \`${tagFor(entry.check)}\` tag`);
    }
    if (!entry.reason.trim()) errors.push(`${label}: no reason`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires))
      errors.push(`${label}: expires is not YYYY-MM-DD`);
    else if (entry.expires < today) errors.push(`${label}: expired on ${entry.expires}`);
    if (entry.check === 'axe' && !entry.rules?.length) {
      errors.push(`${label}: an axe exception names the rule ids it hides`);
    }
  }
  for (const story of stories) {
    for (const tag of story.tags) {
      if (!tag.startsWith('gate-skip-')) continue;
      const check = tag.slice('gate-skip-'.length);
      if (!EXCEPTIONS.some((entry) => entry.story === story.id && entry.check === check)) {
        errors.push(`${story.id}: tagged \`${tag}\` with no entry in exceptions.json`);
      }
    }
  }
  return errors;
}
