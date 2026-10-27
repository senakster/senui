// L08 decision 5: keyboard traceability, not replay. Every key in a component's a11y contract must be
// pressed in that component's `<Name>.browser.test.tsx`, inside a test whose title names it before a
// colon: `test('Escape: closes the innermost dialog', …)`, or several keys, comma-separated:
// `test('Tab, Shift+Tab: focus stays in the dialog', …)`. A key pressed only to reach a state (opening
// a trigger) is no evidence for its row, hence the title. Fails if:
// - a contract key is pressed in no test whose title names it;
// - a test's title names a key the test doesn't press (the title would claim evidence it lacks);
// - a title's key list is almost right (a wrong case, a misspelt or unknown key next to real ones);
// - a contract's `keys` isn't an inline array of string literals (it would owe nothing);
// - a key-titled test calls `skip()`, or passes `userEvent.tab()` options that aren't literal.
// Presses are read from plain string literals only, in source order, with modifiers held across
// calls as Vitest's `userEvent` holds them: `userEvent.keyboard('{Escape}')`, `userEvent.tab()`,
// `userEvent.tab({ shift: true })`, `userEvent.type(el, 'ada')`. A key in a variable, a conditional
// or an alias of `userEvent` isn't seen. Tests that may not run (`skip`, `todo`, `skipIf`, `runIf`,
// `fails`, anywhere in the call chain, or inside such a `describe`) don't count.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const COMPONENTS = 'packages/react/src/components';
const PRINTABLE = 'printable character';
// Key names a title may list. Contract keys are added below, so a new one needs no edit here.
const KEY_NAMES = new Set([
  'Escape',
  'Tab',
  'Enter',
  'Space',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageDown',
  'PageUp',
  'Backspace',
  'Delete',
  PRINTABLE,
]);
const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta'];
// Code-form modifier names (`[ShiftLeft>]`) are the same modifier.
const MODIFIER_CODES = Object.fromEntries(
  MODIFIERS.flatMap((m) => [
    [`${m}Left`, m],
    [`${m}Right`, m],
  ]),
);
// Call-chain links that mean a test may not run: `describe.skipIf(c)(…)`, `test.skip.each(t)(…)`.
const NOT_RUN = new Set(['skip', 'todo', 'skipIf', 'runIf', 'fails']);
const UNREAD = '(only literal test()/it() titles and literal `userEvent` presses are read)';
const errors = [];

const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The contract's keys, in order, from every `keys: [...]` row; anything else is an error. */
function contractKeys(name, path) {
  const source = stripComments(readFileSync(path, 'utf8'));
  const keys = [];
  for (const match of source.matchAll(/\bkeys:\s*/g)) {
    const rest = source.slice(match.index + match[0].length);
    const list = /^\[([^\]]*)\]/.exec(rest)?.[1];
    if (list === undefined || !/^\s*(['"][^'"]+['"]\s*,?\s*)*$/.test(list)) {
      errors.push(`${name}: every \`keys\` in ${path} must be an inline array of string literals`);
      continue;
    }
    keys.push(...[...list.matchAll(/['"]([^'"]+)['"]/g)].map(([, key]) => key));
  }
  return keys;
}

const isKeyName = (name, compare = (a, b) => a === b) => {
  const parts = name.split('+');
  const key = parts.pop() ?? '';
  return (
    [...KEY_NAMES].some((known) => compare(known, key)) &&
    parts.every((part) => MODIFIERS.some((m) => compare(m, part)))
  );
};
const sameIgnoringCase = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * The keys a title names before its colon: `{ keys }`, empty when the title isn't key-titled, or a
 * `problem` when the list is nearly a key list (a key in the wrong case, or real keys next to an
 * unknown one), which would otherwise make no claim and pass unnoticed.
 */
function titleKeys(title) {
  const colon = title.indexOf(':');
  if (colon < 0) return { keys: [] };
  const parts = title
    .slice(0, colon)
    .split(',')
    .map((part) => part.trim());
  if (parts.every((part) => isKeyName(part))) return { keys: parts };
  if (parts.some((part) => isKeyName(part, sameIgnoringCase))) {
    return {
      keys: [],
      problem: `'${title}': the list before the colon must be exact key names (${[...KEY_NAMES].join(', ')}, with ${MODIFIERS.join('/')}+)`,
    };
  }
  return { keys: [] };
}

/**
 * The keys a user-event keyboard string presses: `{Escape}` and `[Escape]` by name, `{Shift>}` holds
 * a modifier until `{/Shift}`, a plain space is Space, any other plain character is printable.
 * `{{` and `[[` are a literal brace or bracket. `held` is the test's keyboard state, shared across
 * calls as Vitest's `userEvent` shares it.
 */
function keyboardPresses(text, held, press) {
  for (let i = 0; i < text.length; i++) {
    const open = text[i];
    const close = open === '{' ? '}' : open === '[' ? ']' : undefined;
    if (close && text[i + 1] !== open) {
      const end = text.indexOf(close, i + 1);
      if (end < 0) break;
      let name = text.slice(i + 1, end);
      i = end;
      if (name.startsWith('/')) {
        const released = name.slice(1);
        const index = held.indexOf(MODIFIER_CODES[released] ?? released);
        if (index >= 0) held.splice(index, 1);
        continue;
      }
      const hold = /^(.*?)>\d*$/.exec(name);
      if (hold) name = hold[1];
      name = MODIFIER_CODES[name] ?? name;
      if (name === ' ') name = 'Space';
      press(name);
      if (hold && MODIFIERS.includes(name)) held.push(name);
      continue;
    }
    if (close) i++;
    press(text[i] === ' ' ? 'Space' : PRINTABLE);
  }
}

/** A plain string literal's text, or undefined: a conditional or a variable is not evidence. */
const literal = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

/** `userEvent.tab()` options: `false` or `true` for a literal `{ shift }`, undefined otherwise. */
function tabShift(options) {
  if (!options) return false;
  if (!ts.isObjectLiteralExpression(options)) return undefined;
  if (options.properties.length !== 1) return undefined;
  const [property] = options.properties;
  if (!ts.isPropertyAssignment(property) || property.name.getText() !== 'shift') return undefined;
  const { kind } = property.initializer;
  if (kind === ts.SyntaxKind.TrueKeyword) return true;
  if (kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

/** The keys a test body presses through `userEvent`, in source order, and what can't be read. */
function bodyPresses(body) {
  const presses = new Set();
  const problems = [];
  const held = [];
  const press = (key) => presses.add([...held.filter((m) => m !== key), key].join('+'));
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // `skip()` from the test context, or `ctx.skip()`: the test may never reach its presses.
      if (
        (ts.isIdentifier(callee) && callee.text === 'skip') ||
        (ts.isPropertyAccessExpression(callee) &&
          callee.name.text === 'skip' &&
          callee.expression.getText() !== 'test' &&
          callee.expression.getText() !== 'it')
      ) {
        problems.push('calls skip(), so its presses may never happen');
      }
      if (ts.isPropertyAccessExpression(callee) && callee.expression.getText() === 'userEvent') {
        const method = callee.name.text;
        if (method === 'keyboard') {
          const text = literal(node.arguments[0]);
          if (text !== undefined) keyboardPresses(text, held, press);
        } else if (method === 'type') {
          const text = literal(node.arguments[1]);
          if (text !== undefined) keyboardPresses(text, held, press);
        } else if (method === 'tab') {
          const shift = tabShift(node.arguments[0]);
          if (shift === undefined)
            problems.push(
              'passes userEvent.tab() options that aren’t a literal `{ shift: true | false }`',
            );
          else if (shift) presses.add('Shift+Tab');
          else press('Tab');
        }
      }
    }
    node.forEachChild(visit);
  };
  if (body) visit(body);
  return { presses, problems };
}

/** The names along a call's callee chain: `describe.skip.each(t)` gives describe, skip, each. */
function chain(expression) {
  const names = [];
  let node = expression;
  for (;;) {
    if (ts.isCallExpression(node)) node = node.expression;
    else if (ts.isPropertyAccessExpression(node)) {
      names.unshift(node.name.text);
      node = node.expression;
    } else if (ts.isIdentifier(node)) {
      names.unshift(node.text);
      return names;
    } else return names;
  }
}

/** `[title, body result]` for each `test(…)`/`it(…)` that will run, with a literal title. */
function keyTests(path) {
  const file = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const tests = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const names = chain(node.expression);
      // Nothing inside a test or describe that may not run is evidence.
      if (
        ['test', 'it', 'describe', 'suite'].includes(names[0]) &&
        names.some((n) => NOT_RUN.has(n))
      ) {
        return;
      }
      const [title, body] = node.arguments;
      const text = literal(title);
      if (names.length === 1 && ['test', 'it'].includes(names[0]) && text !== undefined) {
        tests.push([text, bodyPresses(body)]);
        return;
      }
    }
    node.forEachChild(visit);
  };
  visit(file);
  return tests;
}

const dirs = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const owed = dirs.map((name) => [
  name,
  contractKeys(name, join(COMPONENTS, name, `${name}.a11y.ts`)),
]);
for (const [, keys] of owed) for (const key of keys) KEY_NAMES.add(key.split('+').pop());

let traced = 0;
for (const [name, keys] of owed) {
  if (keys.length === 0) continue;
  const file = join(COMPONENTS, name, `${name}.browser.test.tsx`);
  if (!existsSync(file)) {
    errors.push(`${name}: its contract lists ${keys.join(', ')}, and ${file} doesn't exist`);
    continue;
  }
  const evidence = new Set();
  for (const [title, { presses, problems }] of keyTests(file)) {
    const { keys: named, problem } = titleKeys(title);
    if (problem) errors.push(`${name}: ${problem}`);
    if (named.length === 0) continue;
    for (const issue of problems) errors.push(`${name}: '${title}' ${issue}`);
    for (const key of named) {
      if (presses.has(key) && problems.length === 0) evidence.add(key);
      else if (!presses.has(key)) {
        errors.push(`${name}: '${title}' names ${key} and never presses it ${UNREAD}`);
      }
    }
  }
  for (const key of keys) {
    if (evidence.has(key)) traced++;
    else
      errors.push(`${name}: ${key} is pressed in no test titled '${key}: …' in ${file} ${UNREAD}`);
  }
}

if (errors.length > 0) {
  console.error(`keyboard traceability check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `keyboard traceability: ${String(traced)} contract key(s), each pressed in a test named for it.`,
);
