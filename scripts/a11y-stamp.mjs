// L10 decision 6: stamps manual a11y runs with the fingerprint of what they tested (`sourceHash`).
//
//   pnpm a11y:stamp <Name>                     after a manual session: stamps each of Name's unstamped
//                                              manual runs, all dated today, with today's fingerprint
//   pnpm a11y:stamp <Name> --date YYYY-MM-DD   (re-)stamps that day's runs with today's fingerprint:
//                                              a deliberate, reviewed edit, since edits after that
//                                              day are then vouched for
//   pnpm a11y:stamp --backfill                 once: stamps every unstamped run with the fingerprint
//                                              at the commit that added it to its contract
//
// Writes only the `sourceHash` line of each run, into `<Name>.a11y.ts`.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { sourceHash, tokenValues, workingTree } from '../packages/react/scripts/source-hash.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = 'packages/react/src/components';
const TOKENS = 'packages/tokens/src';

/** Each run of a contract: its fields (string literals only) and its node, in `testedWith` order. */
export function runsOf(text, fileName = 'contract.ts') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  let list;
  const visit = (node) => {
    if (
      !list &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'testedWith' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      list = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!list) throw new Error(`${fileName}: no testedWith`);
  return list.elements.filter(ts.isObjectLiteralExpression).map((node) => {
    const fields = {};
    const props = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
      props[p.name.text] = p;
      if (ts.isStringLiteralLike(p.initializer)) fields[p.name.text] = p.initializer.text;
    }
    return { fields, props, source };
  });
}

/**
 * A run's identity across commits: its method, its date, and which of that day's runs of that
 * method it is. Nothing else: L09 rewrote reader names (`'Narrator (Danish)'` became `'Narrator'`
 * plus a `language`), and a run must still be found at the commit that first recorded it.
 */
function identities(runs) {
  const seen = new Map();
  return runs.map(({ fields: f }) => {
    const key = `${f.method}|${f.date}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return `${key}|${String(n)}`;
  });
}

/** Sets each run's `sourceHash` (by index) in a contract's text. */
export function stamp(text, hashes) {
  const runs = runsOf(text);
  const edits = [];
  for (const [index, hash] of hashes) {
    const { props, source } = runs[index];
    if (props.sourceHash) {
      const init = props.sourceHash.initializer;
      edits.push([init.getStart(source), init.end, `'${hash}'`]);
      continue;
    }
    const date = props.date;
    if (!date) throw new Error(`run ${String(index)} has no date`);
    // On its own line after `date`, with date's indentation.
    const lineStart = text.lastIndexOf('\n', date.getStart(source)) + 1;
    const indent = /^[ \t]*/.exec(text.slice(lineStart))[0];
    if (text[date.end] === ',') {
      edits.push([date.end + 1, date.end + 1, `\n${indent}sourceHash: '${hash}',`]);
    } else {
      edits.push([date.end, date.end, `,\n${indent}sourceHash: '${hash}'`]);
    }
  }
  let out = text;
  for (const [from, to, insert] of edits.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, from) + insert + out.slice(to);
  }
  return out;
}

const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 1 << 26,
  });

function atCommit(commit) {
  const cache = new Map();
  return (path) => {
    if (!cache.has(path)) {
      let text;
      try {
        text = git('show', `${commit}:${path}`);
      } catch {
        text = undefined;
      }
      cache.set(path, text);
    }
    return cache.get(path);
  };
}

const tokenCache = new Map();
async function tokensAt(read, list) {
  const texts = list.map(read).filter((t) => t !== undefined);
  const key = texts.join('\0');
  if (!tokenCache.has(key)) tokenCache.set(key, await tokenValues(texts));
  return tokenCache.get(key);
}

const isManual = (f) => f.method !== 'automated';
const contractPath = (name) => `${COMPONENTS}/${name}/${name}.a11y.ts`;

async function stampToday(name, date) {
  const path = join(root, contractPath(name));
  const text = readFileSync(path, 'utf8');
  const sources = readdirSync(join(root, TOKENS)).filter((f) => f.endsWith('.tokens.json'));
  const read = workingTree(root);
  const hash = sourceHash(
    read,
    name,
    await tokensAt(
      read,
      sources.map((f) => `${TOKENS}/${f}`),
    ),
  );
  // A stamp is today's fingerprint, so it only describes a run done today. Stamping an older run
  // would vouch for edits made after it; that takes `--date`, a deliberate, reviewed choice.
  const today = new Date().toISOString().slice(0, 10);
  const runs = runsOf(text).map((r, i) => [r.fields, i]);
  const targets = runs
    .filter(([f]) => isManual(f) && (date ? f.date === date : f.sourceHash === undefined))
    .map(([, i]) => [i, hash]);
  const older = date
    ? []
    : runs.filter(([f], i) => targets.some(([t]) => t === i) && f.date !== today);
  if (older.length > 0) {
    console.error(
      `${name}: unstamped run(s) dated ${older.map(([f]) => f.date).join(', ')}, not today. Today's fingerprint may include edits made after them. Re-run them, or stamp one day deliberately with --date.`,
    );
    process.exit(1);
  }
  if (targets.length === 0) {
    console.log(`${name}: no ${date ? `run dated ${date}` : 'unstamped manual run'} to stamp`);
    return;
  }
  writeFileSync(path, stamp(text, targets));
  console.log(`${name}: stamped ${String(targets.length)} run(s) with ${hash}`);
}

async function backfill() {
  const names = readdirSync(join(root, COMPONENTS), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const today = workingTree(root);
  const todaysTokens = await tokensAt(
    today,
    readdirSync(join(root, TOKENS))
      .filter((f) => f.endsWith('.tokens.json'))
      .map((f) => `${TOKENS}/${f}`),
  );
  for (const name of names) {
    const path = contractPath(name);
    const text = readFileSync(join(root, path), 'utf8');
    const runs = runsOf(text, path);
    const commits = git('log', '--format=%H', '--reverse', '--', path).trim().split('\n');
    const targets = [];
    const ids = identities(runs);
    for (const [i, run] of runs.entries()) {
      if (!isManual(run.fields) || run.fields.sourceHash !== undefined) continue;
      const commit = commits.find((c) => {
        const then = atCommit(c)(path);
        return then !== undefined && identities(runsOf(then, path)).includes(ids[i]);
      });
      if (!commit) throw new Error(`${name}: no commit added run ${ids[i]}`);
      const read = atCommit(commit);
      const list = git('ls-tree', '-r', '--name-only', commit, '--', TOKENS)
        .trim()
        .split('\n')
        .filter((f) => f.endsWith('.tokens.json'));
      // Code, styles and tokens as the run tested them. The contract as it reads today: L09
      // rewrote quote notation (glosses moved out of the quotes) without changing what was heard,
      // and a change in what a reader says also changes the code, styles or tokens.
      const hash = sourceHash(read, name, await tokensAt(read, list), { data: today });
      targets.push([i, hash]);
      const now = sourceHash(today, name, todaysTokens);
      console.log(
        `${name.padEnd(13)} ${run.fields.method.padEnd(14)} ${run.fields.date} ${commit.slice(0, 7)} ${hash} ${hash === now ? 'current' : 'STALE'}`,
      );
    }
    if (targets.length > 0) writeFileSync(join(root, path), stamp(text, targets));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--backfill') await backfill();
  else if (args[0] && !args[0].startsWith('-')) {
    const dateAt = args.indexOf('--date');
    await stampToday(args[0], dateAt >= 0 ? args[dateAt + 1] : undefined);
  } else {
    console.error('usage: pnpm a11y:stamp <Name> [--date YYYY-MM-DD] | --backfill');
    process.exit(1);
  }
}
