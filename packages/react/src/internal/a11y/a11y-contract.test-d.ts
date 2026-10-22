import { describe, expectTypeOf, test } from 'vitest';
import {
  defineA11yContract,
  type A11yContract,
  type Key,
  type WcagCriterion,
} from './a11y-contract.js';

interface ExampleProps {
  children: string;
  'aria-label'?: string;
}
type IconProps = { icon?: never; children: string } | { icon: object; 'aria-label': string };

const define = defineA11yContract<ExampleProps>();

const minimal = {
  component: 'Example',
  semantics: {
    element: 'button',
    name: { sources: ['content'], required: true },
    states: [],
    relationships: [],
    hiddenFromAT: [],
  },
  keyboard: [{ keys: ['Enter', 'Space'], action: 'Activates the button' }],
  focus: { tabStop: 'native', indicator: 'focus-ring' },
  announcements: [
    { when: 'On focus', mechanism: 'focus', owner: 'component', announces: 'Save, button' },
  ],
  requiredProps: [],
  consumerResponsibilities: [],
  adaptation: {
    targetSize: 'min-24',
    activatesOn: 'click',
    forcedColors: 'border',
    reducedMotion: 'no-motion',
    rtl: 'direction-neutral',
    textOverflow: 'wraps',
  },
  wcag: [{ criterion: '2.4.7', claim: 'meets', how: 'Visible focus ring', evidence: ['keyboard'] }],
  testedWith: [
    { method: 'keyboard', browser: 'any', os: 'any', result: 'pass', date: '2026-10-16' },
  ],
  knownIssues: [],
} satisfies A11yContract<ExampleProps>;

// Each @ts-expect-error sits directly above the line that errors, so Prettier's wrapping can't move it.
describe('A11yContract', () => {
  test('a complete contract satisfies the type', () => {
    expectTypeOf(define(minimal)).toEqualTypeOf<A11yContract<ExampleProps>>();
  });

  test('every section is required', () => {
    const { adaptation: _omitted, ...missingASection } = minimal;
    // @ts-expect-error -- adaptation is required (ADR-0008)
    void define(missingASection);
  });

  test('the element, role and required props are checked against reality', () => {
    void define({
      ...minimal,
      // @ts-expect-error -- not an HTML element
      semantics: { ...minimal.semantics, element: 'buton' },
    });
    void define({
      ...minimal,
      // @ts-expect-error -- not an ARIA role
      semantics: { ...minimal.semantics, role: 'buton' },
    });
    void define({
      ...minimal,
      // @ts-expect-error -- not a prop of the component
      requiredProps: [{ props: ['label'], why: '' }],
    });
    // A prop that exists in only one branch of a union is still a prop.
    void defineA11yContract<IconProps>()({
      ...minimal,
      requiredProps: [{ props: ['aria-label'], when: 'icon', why: 'No visible text' }],
    });
  });

  test('evidence lists are never empty, and keyboard only when the component takes no focus', () => {
    // @ts-expect-error -- no WCAG claims
    void define({ ...minimal, wcag: [] });
    // @ts-expect-error -- no test runs
    void define({ ...minimal, testedWith: [] });
    // @ts-expect-error -- focusable, but no keys
    void define({ ...minimal, keyboard: [] });
    void define({ ...minimal, focus: { tabStop: 'none' }, keyboard: [] });
  });

  test('criteria come from WCAG 2.2, and keys from a closed list', () => {
    expectTypeOf<'1.4.11'>().toExtend<WcagCriterion>();
    expectTypeOf<'4.1.1'>().not.toExtend<WcagCriterion>(); // removed in 2.2
    expectTypeOf<'1.4.3.5'>().not.toExtend<WcagCriterion>();
    expectTypeOf<'Shift+Tab'>().toExtend<Key>();
    expectTypeOf<'Enter, Space'>().not.toExtend<Key>();
  });

  test('claims, runs and focus are closed shapes', () => {
    void define({
      ...minimal,
      // @ts-expect-error -- evidence names a test method
      wcag: [{ criterion: '2.4.7', claim: 'meets', how: '', evidence: ['looked at it'] }],
    });
    void define({
      ...minimal,
      // @ts-expect-error -- a screen-reader run names the AT, browser, OS, versions and result
      testedWith: [{ method: 'screen reader', detail: 'tested', date: '2026-10-16' }],
    });
    void define({
      ...minimal,
      // @ts-expect-error -- the indicator is the token ring unless an ADR says otherwise (ADR-0005)
      focus: { tabStop: 'native', indicator: 'subtle glow (box-shadow)' },
    });
    void define({
      ...minimal,
      // @ts-expect-error -- a live region states its politeness
      announcements: [{ when: '', mechanism: 'live-region', owner: 'component', announces: '' }],
    });
  });
});
