// L10 decision 5: the public surface as facts, compared between a baseline release and this build.
//
// A fact is one thing CONVENTIONS "Public surface" makes public: an export and its kind, a
// component, a prop in a branch and whether it's required, a value, a forbidden or omitted prop, a
// class, data-attribute value, token, stylesheet, layer or export subpath. Every fact has a key;
// comparing two builds is comparing their keys. Descriptions, summaries and printed types are
// informative and never facts, so rewording one is no change. Narrowed types are found by the
// compiler instead (narrowing.mjs).
//
// A branch is keyed by its discriminant, or, when it has none, by its prop names. A new build's
// branches are first matched to the baseline's (same discriminant, else the most prop names in
// common), so adding an optional prop to a branch changes that prop's fact, not the branch's key.

/** @typedef {'major' | 'minor' | 'patch' | 'none'} Level */
/**
 * @typedef {{ value?: string | boolean | string[], deprecated?: boolean, component?: string }} Fact
 * @typedef {{ key: string, change: 'removed' | 'added' | 'changed', level: Level, detail: string,
 *   deprecated: boolean, component?: string }} Difference
 */

export const LEVELS = ['none', 'patch', 'minor', 'major'];
export const rank = (level) => LEVELS.indexOf(level);

const sorted = (items) => [...items].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * What a package's `package.json` makes public: each export subpath and what it points to,
 * `sideEffects` (dropping it lets bundlers drop the CSS imports), and each peer range. A peer that
 * follows a workspace package's own version (`ownPeers`) is left to `peerMajorProblems`.
 */
function packageFacts(facts, pkg, ownPeers) {
  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    facts.set(`subpath ${subpath}`, { value: JSON.stringify(target) });
  }
  facts.set('sideEffects', { value: JSON.stringify(pkg.sideEffects ?? null) });
  for (const [name, range] of Object.entries(pkg.peerDependencies ?? {})) {
    if (!ownPeers.includes(name)) facts.set(`peer ${name}`, { value: range });
  }
}

/** The layers, by name and in order: reordering them changes every consumer's cascade. */
function layerFacts(facts, layers) {
  for (const layer of layers) facts.set(`layer ${layer}`, {});
  facts.set('layer order', { value: layers.join(', ') });
}

/** The component package's facts, from its manifest and its `package.json`. */
export function componentFacts(manifest, pkg, match = undefined, ownPeers = []) {
  /** @type {Map<string, Fact>} */
  const facts = new Map();
  const add = (key, fact = {}) => facts.set(key, fact);

  for (const e of manifest.exports) {
    add(`export ${e.name}`, { value: e.kind, deprecated: Boolean(e.deprecated) });
  }
  layerFacts(facts, manifest.css.layers);
  packageFacts(facts, pkg, ownPeers);

  for (const c of Object.values(manifest.components)) {
    const at = (rest) => `${c.name} › ${rest}`;
    const dep = Boolean(c.deprecated);
    const own = (key, fact = {}) =>
      add(key, { ...fact, deprecated: dep || Boolean(fact.deprecated), component: c.name });

    own(`component ${c.name}`);
    own(at('element'), { value: c.element });
    own(at('rootElement'), { value: c.rootElement });
    own(at('native element'), { value: c.native.element });
    for (const attr of c.native.omitted) own(at(`omitted ${attr}`));
    for (const f of c.forbidden) own(at(`forbidden ${f.name}`));

    // Values per prop, across every branch.
    const values = new Map();
    const noteValues = (p, branchDeprecated) => {
      for (const v of p.values ?? []) {
        const key = at(`value ${p.name} ${typeof v === 'string' ? `'${v}'` : String(v)}`);
        const deprecated =
          branchDeprecated || Boolean(p.deprecated) || Boolean(p.deprecatedValues?.[String(v)]);
        values.set(key, (values.get(key) ?? true) && deprecated);
      }
    };

    for (const context of contexts(c, match?.[c.name])) {
      for (const p of context.props.values()) {
        own(at(`${context.key} › prop ${p.name}`), {
          value: p.required,
          deprecated: context.deprecated || Boolean(p.deprecated),
        });
        noteValues(p, context.deprecated);
      }
      for (const name of context.notInBranch) own(at(`${context.key} › not ${name}`));
      for (const name of context.forbidden) own(at(`${context.key} › forbidden ${name}`));
      if (context.requiresOneOf) {
        own(at(`${context.key} › requiresOneOf`), { value: context.requiresOneOf });
      }
    }
    for (const [key, deprecated] of values) own(key, { deprecated });

    const css = c.css;
    const cssDep = css.deprecated ?? {};
    own(`class .${css.rootClass}`);
    for (const name of Object.keys(cssDep).filter((n) => n.startsWith('.'))) {
      own(`class ${name}`, { deprecated: true });
    }
    for (const [attr, list] of Object.entries(css.dataAttributes)) {
      for (const v of list) {
        // Keyed as a consumer's stylesheet selects it: `.senui-button[data-variant='danger']`.
        own(`data .${css.rootClass}[${attr}='${v}']`, {
          deprecated: Boolean(cssDep[`[${attr}='${v}']`]),
        });
      }
    }
    for (const token of css.tokens) own(`token ${token}`, { deprecated: Boolean(cssDep[token]) });
    own(at('stylesheet'), { value: css.stylesheet });
  }
  return facts;
}

/** The tokens package's facts: its public token names, its layers and its `package.json`. */
export function tokenFacts(tokensCss, pkg) {
  const facts = new Map();
  const text = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, name] of text.matchAll(/(--senui-[a-z0-9-]+)\s*:/g)) facts.set(`token ${name}`, {});
  const order = /@layer\s+([^;{]+);/.exec(text);
  layerFacts(facts, order ? order[1].split(',').map((l) => l.trim()) : []);
  packageFacts(facts, pkg, []);
  return facts;
}

/**
 * Each way a component can be used, as one context per branch of each axis (or one context for a
 * component without axes). A context's props are the shared props, the branch's own, and those
 * some branch of each other axis accepts, so moving a prop between the shared props and every
 * branch of an axis changes no fact, and neither does adding a branch.
 */
function contexts(c, match) {
  const merge = (into, props) => {
    for (const p of props) {
      const had = into.get(p.name);
      into.set(p.name, had ? { ...p, required: had.required || p.required } : p);
    }
  };
  if (c.axes.length === 0) {
    const props = new Map();
    merge(props, c.props);
    return [{ key: 'props', props, notInBranch: [], forbidden: [], deprecated: false }];
  }
  const keys = branchKeys(c, match);
  const out = [];
  c.axes.forEach((axis, a) => {
    axis.branches.forEach((branch, b) => {
      const props = new Map();
      merge(props, c.props);
      merge(props, branch.props);
      c.axes.forEach((other, o) => {
        if (o !== a) merge(props, [...axisAnywhere(other).values()]);
      });
      out.push({
        key: `${axis.name}${keys[a][b]}`,
        props,
        notInBranch: branch.notInBranch.map((n) => n.name),
        forbidden: branch.forbidden.map((f) => f.name),
        requiresOneOf: branch.requiresOneOf
          ? sorted(branch.requiresOneOf.map((set) => sorted(set.map((p) => p.name)).join('+')))
          : undefined,
        deprecated: Boolean(branch.deprecated),
      });
    });
  });
  return out;
}

/**
 * Props some branch of an axis accepts; required only if every branch requires them. Any branch,
 * not every: a new branch without a prop its siblings all have doesn't take that prop away from
 * the other axes' contexts (L10 PR 2 review, edge B). A prop really removed from a branch is still
 * caught by that branch's own context, and by the compiler.
 */
function axisAnywhere(axis) {
  const out = new Map();
  for (const branch of axis.branches) {
    for (const p of branch.props) {
      if (out.has(p.name)) continue;
      const all = axis.branches.map((b) => b.props.find((q) => q.name === p.name));
      out.set(p.name, { ...p, required: all.every((q) => q?.required === true) });
    }
  }
  return out;
}

/** A branch's own key: `[discriminant]` when it has one unique to its axis, else `{prop names}`. */
function ownKey(axis, branch) {
  const d = branch.discriminant.join('+');
  const unique = d && axis.branches.filter((b) => b.discriminant.join('+') === d).length === 1;
  return unique ? `[${d}]` : `{${sorted(branch.props.map((p) => p.name)).join(',')}}`;
}

/** Each branch's key, by axis; `match` gives a new build's branches their baseline's keys. */
function branchKeys(c, match) {
  return c.axes.map((axis) =>
    axis.branches.map((b, i) => match?.[axis.name]?.[i] ?? ownKey(axis, b)),
  );
}

/**
 * Matches a new build's branches to the baseline's, per component and axis: the same discriminant
 * first, then the most prop names in common (at least half of the larger set).
 *
 * @returns {Record<string, Record<string, string[]>>} keys for the new build's branches.
 */
export function matchBranches(oldManifest, newManifest) {
  const out = {};
  for (const c of Object.values(newManifest.components)) {
    const before = oldManifest.components[c.name];
    if (!before) continue;
    out[c.name] = {};
    for (const axis of c.axes) {
      const old = before.axes.find((a) => a.name === axis.name);
      if (!old) continue;
      const oldKeys = old.branches.map((b) => ownKey(old, b));
      const taken = new Set();
      const keys = axis.branches.map(() => undefined);
      axis.branches.forEach((b, i) => {
        const d = b.discriminant.join('+');
        const j = old.branches.findIndex(
          (o, k) => !taken.has(k) && d && o.discriminant.join('+') === d,
        );
        if (j >= 0) {
          taken.add(j);
          keys[i] = oldKeys[j];
        }
      });
      axis.branches.forEach((b, i) => {
        if (keys[i]) return;
        const names = new Set(b.props.map((p) => p.name));
        let best = -1;
        let score = 0;
        old.branches.forEach((o, k) => {
          if (taken.has(k)) return;
          const common = o.props.filter((p) => names.has(p.name)).length;
          const s = common / Math.max(names.size, o.props.length, 1);
          if (s >= 0.5 && s > score) [best, score] = [k, s];
        });
        if (best >= 0) {
          taken.add(best);
          keys[i] = oldKeys[best];
        }
      });
      out[c.name][axis.name] = keys.map((k, i) => k ?? ownKey(axis, axis.branches[i]));
    }
  }
  return out;
}

/**
 * Compares two fact sets. Removing a fact is breaking, adding one is a minor; a changed value is
 * judged by what it is (a prop newly required is breaking, made optional is a minor; an element
 * changed is breaking; a `requiresOneOf` that gains an alternative is a minor).
 *
 * `aliased` names components whose entry is gone but whose export stays, deprecated, as an alias
 * of its replacement (decision 7): their facts aren't compared.
 *
 * @param {Map<string, Fact>} before
 * @param {Map<string, Fact>} after
 * @returns {Difference[]}
 */
export function compare(before, after, aliased = new Set()) {
  /** @type {Difference[]} */
  const out = [];
  // An alias renders its replacement, so its props aren't compared; the CSS a consumer's own
  // stylesheet targets (the old class, its tokens and data values) still is.
  const css = (key) => /^(class|token|data) /.test(key);
  const skip = (key, fact) =>
    fact.component !== undefined && aliased.has(fact.component) && !css(key);
  for (const [key, old] of before) {
    if (skip(key, old)) continue;
    const now = after.get(key);
    const base = { key, deprecated: Boolean(old.deprecated), component: old.component };
    if (!now) {
      // Lifting a restriction (or a peer) accepts more, so it's a minor; anything else removed is
      // breaking.
      out.push(
        isRestriction(key) || key.startsWith('peer ')
          ? { ...base, change: 'removed', level: 'minor', detail: 'no longer restricted' }
          : { ...base, change: 'removed', level: 'major', detail: 'removed' },
      );
      continue;
    }
    if (JSON.stringify(old.value) === JSON.stringify(now.value)) continue;
    if (key.startsWith('peer ')) {
      // A range that keeps every alternative it had (`^18.3` → `^18.3 || ^19`) only widens.
      const parts = (range) => range.split('||').map((r) => r.trim());
      const widened = parts(old.value).every((r) => parts(now.value).includes(r));
      out.push({
        ...base,
        change: 'changed',
        level: widened ? 'minor' : 'major',
        detail: `${old.value} → ${now.value}`,
      });
    } else if (typeof old.value === 'boolean') {
      // A prop's `required`.
      out.push(
        now.value
          ? { ...base, change: 'changed', level: 'major', detail: 'now required' }
          : { ...base, change: 'changed', level: 'minor', detail: 'now optional' },
      );
    } else if (Array.isArray(old.value) && Array.isArray(now.value)) {
      // `requiresOneOf`: fewer alternatives is breaking, more is a minor.
      const lost = old.value.filter((v) => !now.value.includes(v));
      out.push({
        ...base,
        change: 'changed',
        level: lost.length > 0 ? 'major' : 'minor',
        detail: `one of ${old.value.join(' | ')} → ${now.value.join(' | ')}`,
      });
    } else {
      out.push({
        ...base,
        change: 'changed',
        level: 'major',
        detail: `${String(old.value)} → ${String(now.value)}`,
      });
    }
  }
  for (const [key, now] of after) {
    if (before.has(key) || skip(key, now)) continue;
    // A new peer, or a new requirement or restriction where the component or branch already
    // existed, breaks code that compiled; on a new branch it restricts nothing.
    const restricts =
      key.startsWith('peer ') ||
      ((isRestriction(key) || (/ › prop [^›]+$/.test(key) && now.value === true)) &&
        existed(key, before));
    out.push({
      key,
      change: 'added',
      level: restricts ? 'major' : 'minor',
      detail: restricts ? 'added: restricts existing use' : 'added',
      deprecated: false,
      component: now.component,
    });
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** A fact that limits use: a forbidden, not-in-branch or omitted prop, or a `requiresOneOf`. */
function isRestriction(key) {
  return / › (forbidden|not|omitted) [^›]+$/.test(key) || / › requiresOneOf$/.test(key);
}

/** Whether the component or branch a fact belongs to (its key up to the last ` › `) existed. */
function existed(key, before) {
  const container = key.slice(0, key.lastIndexOf(' › '));
  return [...before.keys()].some((k) => k.startsWith(`${container} › `));
}

/**
 * Majors travel together (L10 decision 2): the components package takes the tokens as a peer, so a
 * tokens major changes its peer range, which is a major for it too. Changesets bumps it only a
 * patch (L10 PR 1 probe), so this is checked here.
 *
 * @param {Record<string, Level>} bumps Pending bumps by package.
 */
export function peerMajorProblems(bumps, components, tokens) {
  if (bumps[tokens] !== 'major' || bumps[components] === 'major') return [];
  return [
    `${components}: ${tokens} takes a major, so ${components}'s peer range on it changes, which is a major for ${components} too; its pending bump is ${bumps[components] ?? 'none'}. Add a major changeset for ${components} that says what the tokens major changes for it.`,
  ];
}

/** The largest level among the differences. */
export function largest(differences) {
  return differences.reduce((max, d) => (rank(d.level) > rank(max) ? d.level : max), 'none');
}

/**
 * Whether a package's differences may ship with its pending bump. Returns the reasons it may not.
 *
 * @param {string} name The package.
 * @param {Difference[]} differences
 * @param {Level} bump The pending bump (changesets), or the bump `package.json` already made.
 * @param {{ package: string, fact: string }[]} exceptions `api-exceptions.json` entries.
 */
export function verdict(name, differences, bump, exceptions = []) {
  const problems = [];
  const need = largest(differences);
  if (rank(bump) < rank(need)) {
    const shown = differences.filter((d) => d.level === need).map((d) => `${d.key} (${d.detail})`);
    problems.push(
      `${name}: ${need === 'major' ? 'breaking changes' : 'additions'} need a ${need} bump, but the pending bump is ${bump}:\n      ${shown.join('\n      ')}`,
    );
  }
  for (const d of differences) {
    if (d.change !== 'removed' || d.level !== 'major' || d.deprecated) continue;
    if (exceptions.some((e) => e.package === name && e.fact === d.key)) continue;
    problems.push(
      `${name}: ${d.key} is removed without a deprecation release first (CONVENTIONS rule 8). Deprecate it in a minor, or add a dated entry to scripts/api-diff/api-exceptions.json`,
    );
  }
  return problems;
}
