/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import {
  defineA11yContract,
  RESPONSIBILITIES,
  type A11yContract,
  type WcagClaim,
  type WcagCriterion,
} from './a11y-contract.js';
import { publishedStrings, publishedTextErrors } from '../docs/published-text.js';
import { contractErrors } from './a11y-contract-check.js';

// Every component's contract and component module. Vite resolves the globs at build time, so a new
// component is picked up without registering it anywhere.
const contracts = import.meta.glob<A11yContract>('../../components/*/*.a11y.ts', {
  eager: true,
  import: 'a11y',
});
const modules = import.meta.glob<Record<string, unknown>>(
  [
    '../../components/*/*.tsx',
    '!../../components/*/*.stories.tsx',
    '!../../components/*/*.test.tsx',
    '!../../components/*/*.test-d.tsx',
  ],
  { eager: true },
);

// The directory after `components/`, wherever this file sits relative to it.
const dirOf = (path: string) => /\/components\/([^/]+)\//.exec(path)?.[1] ?? '';
const today = new Date().toISOString().slice(0, 10);

describe('every component', () => {
  test.each(Object.entries(contracts))('%s is a valid contract', (path, contract) => {
    expect(contract, `${path} must export \`a11y\``).toBeDefined();
    expect(contractErrors(dirOf(path), contract, today)).toEqual([]);
  });

  // L09 decision 8: every string is published verbatim, so none may cite private plans or reviews.
  test.each(Object.entries(contracts))('%s publishes only public text', (_path, contract) => {
    const errors = publishedStrings(contract).flatMap(([at, text]) =>
      publishedTextErrors(at, text),
    );
    expect(errors).toEqual([]);
  });

  test.each(Object.entries(modules))('%s sets displayName', (path, module) => {
    const dir = dirOf(path);
    const component = module[dir] as { displayName?: string } | undefined;
    expect(component, `${path} must export \`${dir}\``).toBeDefined();
    expect(component?.displayName).toBe(dir);
  });

  test('the globs found every component directory', () => {
    // Guards the patterns above: with no components yet, both are empty; afterwards they must agree.
    expect(Object.keys(contracts).map(dirOf).sort()).toEqual(
      Object.keys(modules).map(dirOf).sort(),
    );
  });
});

// ---------------------------------------------------------------------------------------------

function claim(criterion: WcagCriterion): WcagClaim {
  return { criterion, claim: 'meets', how: 'Native button', evidence: ['keyboard'] };
}

const valid = defineA11yContract<{ children: string; 'aria-label'?: string }>()({
  component: 'Example',
  semantics: {
    element: 'button',
    name: { sources: ['content', 'aria-label'], required: true },
    states: [],
    relationships: [],
    hiddenFromAT: [],
  },
  keyboard: [{ keys: ['Enter', 'Space'], action: 'Activates it' }],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    { when: 'On focus', mechanism: 'focus', owner: 'component', announces: 'Save, button' },
  ],
  requiredProps: [],
  consumerResponsibilities: [RESPONSIBILITIES.keepFocusRing, RESPONSIBILITIES.labelInName],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'border',
    reducedMotion: 'no-motion',
    rtl: 'direction-neutral',
    textOverflow: 'wraps',
  },
  wcag: [
    claim('2.1.1'),
    claim('2.4.7'),
    claim('2.4.11'),
    claim('2.5.8'),
    claim('1.4.11'),
    claim('4.1.2'),
  ],
  testedWith: [
    { method: 'automated', tool: 'axe-core', date: '2026-10-01' },
    {
      method: 'keyboard',
      browser: 'any',
      os: 'any',
      result: 'pass',
      date: '2026-10-01',
      sourceHash: '0123456789abcdef',
    },
    {
      method: 'screen reader',
      at: 'reader',
      atVersion: '1',
      language: 'en',
      browser: 'browser',
      browserVersion: '1',
      os: 'os',
      packageVersion: '0.1.0',
      result: 'pass',
      date: '2026-10-02',
      sourceHash: '0123456789abcdef',
    },
  ],
  knownIssues: [],
});

const errorsFor = (patch: Partial<Record<keyof A11yContract, unknown>>, dir = 'Example') =>
  contractErrors(dir, { ...valid, ...patch } as A11yContract, '2026-10-16');

describe('contractErrors', () => {
  test('a complete contract has no errors', () => {
    expect(errorsFor({})).toEqual([]);
  });

  test('the component name must match its directory', () => {
    expect(errorsFor({}, 'Button')).toContain(
      "component is 'Example', but the directory is 'Button'",
    );
  });

  test('evidence lists and a focusable keyboard map must not be empty', () => {
    expect(errorsFor({ wcag: [], testedWith: [], announcements: [], keyboard: [] })).toEqual(
      expect.arrayContaining([
        'wcag is empty',
        'testedWith is empty',
        'announcements is empty',
        'keyboard is empty, but the component takes focus',
      ]),
    );
  });

  // ADR-0019: quoted speech says its language, and that language was heard in a screen-reader run.
  test('a quote needs a language, one the contract was heard in', () => {
    const quoting = { when: 'On focus', mechanism: 'focus', owner: 'component' } as const;
    expect(errorsFor({ announcements: [{ ...quoting, announces: '"Save, button"' }] })).toContain(
      "announcements 'On focus': quotes speech, so it needs `language`",
    );
    expect(
      errorsFor({ announcements: [{ ...quoting, announces: '"Gem, knap"', language: 'da' }] }),
    ).toContain("announcements 'On focus': language 'da' matches no screen-reader run");
    expect(
      errorsFor({ announcements: [{ ...quoting, announces: '"Save, button"', language: 'en' }] }),
    ).toEqual([]);
    // Quotes inside inline code are code, not speech.
    expect(
      errorsFor({ announcements: [{ ...quoting, announces: 'Your `role="status"` region.' }] }),
    ).toEqual([]);
  });

  test('a screen-reader run’s language is a BCP 47 tag', () => {
    const [automated, keyboard, reader] = valid.testedWith;
    expect(
      errorsFor({ testedWith: [automated, keyboard, { ...reader, language: 'Danish' }] }),
    ).toContain("testedWith: 'Danish' is not a BCP 47 tag");
  });

  test('dates must be real and not in the future', () => {
    const run = (date: string) => ({ method: 'automated', tool: 'axe-core', date });
    const errors = errorsFor({
      testedWith: [...valid.testedWith, run('2026-02-30'), run('1-2-3'), run('2026-10-17')],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        "testedWith: '2026-02-30' is not a YYYY-MM-DD date",
        "testedWith: '1-2-3' is not a YYYY-MM-DD date",
        'testedWith: 2026-10-17 is in the future',
      ]),
    );
  });

  test('automated, keyboard and screen-reader runs are all required for a focusable component', () => {
    expect(errorsFor({ testedWith: [valid.testedWith[0]] })).toEqual(
      expect.arrayContaining([
        "testedWith has no 'keyboard' run",
        "testedWith has no 'screen reader' run",
      ]),
    );
  });

  test('a claim must name evidence that exists, and be a WCAG 2.2 criterion', () => {
    const errors = errorsFor({
      wcag: [
        ...valid.wcag,
        { criterion: '1.4.3', claim: 'meets', how: '', evidence: ['forced colours'] },
        { criterion: '4.1.1', claim: 'meets', how: '', evidence: ['automated'] },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        "wcag 1.4.3: evidence 'forced colours' has no run in testedWith",
        'wcag: 4.1.1 is not a WCAG 2.2 criterion',
      ]),
    );
  });

  test('a focusable component addresses the baseline criteria', () => {
    expect(errorsFor({ wcag: valid.wcag.slice(1) })).toContain(
      'wcag: a focusable component must address 2.1.1',
    );
  });

  test('a focusable component carries the required responsibilities', () => {
    expect(errorsFor({ consumerResponsibilities: [] })).toEqual([
      'consumerResponsibilities must include RESPONSIBILITIES.keepFocusRing',
      'consumerResponsibilities must include RESPONSIBILITIES.labelInName',
    ]);
  });

  test('a focusable component with no name needs keepFocusRing, not labelInName (L07 review)', () => {
    expect(
      errorsFor({
        semantics: { ...valid.semantics, name: 'none' },
        consumerResponsibilities: [],
      }),
    ).toEqual(['consumerResponsibilities must include RESPONSIBILITIES.keepFocusRing']);
  });

  test('a component that never takes focus needs neither keyboard runs nor the baseline', () => {
    const errors = errorsFor({
      focus: { tabStop: 'none' },
      keyboard: [],
      consumerResponsibilities: [],
      wcag: [{ criterion: '1.3.1', claim: 'meets', how: '', evidence: ['automated'] }],
      testedWith: [valid.testedWith[0], valid.testedWith[2]],
    });
    expect(errors).toEqual([]);
  });
});
