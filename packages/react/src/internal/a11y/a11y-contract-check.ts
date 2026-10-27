import { RESPONSIBILITIES, type A11yContract, type IsoDate } from './a11y-contract.js';
import { WCAG22, type WcagCriterion } from './wcag.js';

/**
 * senui policy, not W3C data: the criteria every focusable component must address in its
 * contract. Keyboard operation, visible and unobscured focus, target size, non-text contrast, and
 * name/role/value.
 */
export const FOCUSABLE_BASELINE = [
  '2.1.1',
  '2.4.7',
  '2.4.11',
  '2.5.8',
  '1.4.11',
  '4.1.2',
] as const satisfies readonly WcagCriterion[];

/**
 * The parts of a contract the type can't check. Returns one message per problem; an empty list
 * means the contract is valid. Run over every component by `a11y-contracts.test.ts`.
 *
 * @param dir The component's directory name, which `component` must equal.
 * @param today `YYYY-MM-DD`; a run dated after it is rejected.
 */
export function contractErrors(dir: string, contract: A11yContract, today: string): string[] {
  const errors: string[] = [];
  const focusable = contract.focus.tabStop !== 'none';

  if (contract.component !== dir) {
    errors.push(`component is '${contract.component}', but the directory is '${dir}'`);
  }

  // Lists the type makes non-empty, re-checked for contracts that reach here through a cast.
  for (const key of ['announcements', 'wcag', 'testedWith'] as const) {
    if (contract[key].length === 0) errors.push(`${key} is empty`);
  }
  if (focusable && contract.keyboard.length === 0) {
    errors.push('keyboard is empty, but the component takes focus');
  }

  for (const run of contract.testedWith) {
    if (!isValidDate(run.date)) errors.push(`testedWith: '${run.date}' is not a YYYY-MM-DD date`);
    else if (run.date > today) errors.push(`testedWith: ${run.date} is in the future`);
  }

  const methods = new Set(contract.testedWith.map((run) => run.method));
  const required = focusable
    ? (['automated', 'keyboard', 'screen reader'] as const)
    : (['automated', 'screen reader'] as const);
  for (const method of required) {
    if (!methods.has(method)) errors.push(`testedWith has no '${method}' run`);
  }

  const claimed = new Set<string>();
  for (const { criterion, evidence } of contract.wcag) {
    claimed.add(criterion);
    if (!Object.hasOwn(WCAG22, criterion))
      errors.push(`wcag: ${criterion} is not a WCAG 2.2 criterion`);
    for (const method of evidence) {
      if (!methods.has(method)) {
        errors.push(`wcag ${criterion}: evidence '${method}' has no run in testedWith`);
      }
    }
  }

  if (focusable) {
    for (const criterion of FOCUSABLE_BASELINE) {
      if (!claimed.has(criterion))
        errors.push(`wcag: a focusable component must address ${criterion}`);
    }
    requireResponsibility(contract, 'keepFocusRing', errors);
    // Only where a consumer can name the component: an element with no name can't take aria-label.
    const { name } = contract.semantics;
    if (name !== 'none' && name.sources.includes('content')) {
      requireResponsibility(contract, 'labelInName', errors);
    }
  }

  return errors;
}

function requireResponsibility(
  contract: A11yContract,
  key: keyof typeof RESPONSIBILITIES,
  errors: string[],
): void {
  if (!contract.consumerResponsibilities.includes(RESPONSIBILITIES[key])) {
    errors.push(`consumerResponsibilities must include RESPONSIBILITIES.${key}`);
  }
}

function isValidDate(date: IsoDate): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}
