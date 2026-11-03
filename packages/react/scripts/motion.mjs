// ADR-0024: the motion strategy as data and as a check. One movement list, shared by the static
// check (scripts/check-component-css.mjs), Stylelint's `transition-property` allow-list, the gate's
// motion check and the Motion docs page.
//
// The static check finds each moving element's pattern in a component's stylesheets:
// - Removed: every value the movement takes, other than a resting one, carries the reduce factor in
//   each of its moving parts;
// - Instant: the movement's own duration (paired with `transition-property` by index) is a duration
//   token times the factor, and no other rule's `transition-duration` undoes it;
// - Essential: a `@keyframes` that animates `rotate` only, its duration the rotation token slowed by
//   the factor.
// And the reverse: a colour or opacity transition never carries the factor (it keeps its duration).
// Limit: it proves the factor is present where it must be, not that it zeroes the movement. It is
// also selector-blind: every declaration of a property family in the stylesheet counts, which is
// stricter than the cascade. The gate is the proof.
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const SIDES = ['top', 'right', 'bottom', 'left'];
const LOGICAL = ['block', 'inline', 'block-start', 'block-end', 'inline-start', 'inline-end'];
const SIZES = ['width', 'height', 'inline-size', 'block-size'];

/**
 * What counts as movement: a change in any of these. Colour and opacity are not movement and keep
 * their duration under reduced motion (L01 decision 6).
 */
export const MOVEMENT = Object.freeze([
  'transform',
  'translate',
  'scale',
  'rotate',
  ...SIDES,
  'inset',
  ...LOGICAL.map((l) => `inset-${l}`),
  'margin',
  ...SIDES.map((s) => `margin-${s}`),
  ...LOGICAL.map((l) => `margin-${l}`),
  'padding',
  ...SIDES.map((s) => `padding-${s}`),
  ...LOGICAL.map((l) => `padding-${l}`),
  ...SIZES,
  ...SIZES.flatMap((s) => [`min-${s}`, `max-${s}`]),
  'gap',
  'row-gap',
  'column-gap',
  'flex-basis',
  'grid-template-rows',
  'grid-template-columns',
  'font-size',
  'border-width',
  'background-position',
  'clip-path',
  'offset-path',
  'offset-distance',
  'perspective',
]);

/**
 * What a component may transition without moving anything. Stylelint allows `transition-property`
 * to name these and `MOVEMENT`, and nothing else, so a new property is classified before it ships.
 */
export const NOT_MOVEMENT = Object.freeze([
  'opacity',
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
  'box-shadow',
  'filter',
]);

const REDUCE = '--senui-motion-reduce';
const ROTATION = '--senui-motion-duration-rotation';

// Durations, whitespace removed. Instant: a duration token times the factor. Essential: the rotation
// token slowed by the factor. Stylelint allows only these and a duration token alone.
const INSTANT_DURATION =
  /^calc\(var\(--senui-motion-duration-[a-z]+\)\*var\(--senui-motion-reduce\)\)$/;
const ESSENTIAL_DURATION =
  /^calc\(var\(--senui-motion-duration-rotation\)\*\(4-3\*var\(--senui-motion-reduce\)\)\)$/;
const squash = (value) => value.replace(/\s+/g, '');

// Each property's family: every property that sets the same box edge or size, shorthands, longhands,
// physical and logical alike (which one a logical property maps to depends on the writing mode).
function familyKey(property) {
  for (const group of ['margin', 'padding', 'inset']) {
    if (property === group || property.startsWith(`${group}-`)) return group;
  }
  if (SIDES.includes(property)) return 'inset';
  if (SIZES.some((s) => property === s || property === `min-${s}` || property === `max-${s}`)) {
    return 'size';
  }
  if (/^(row-|column-)?gap$/.test(property)) return 'gap';
  return property;
}

const split = (value) => {
  // Top-level comma-separated items.
  const items = [[]];
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') items.push([]);
    else items.at(-1).push(node);
  }
  return items.map((nodes) => valueParser.stringify(nodes).trim()).filter(Boolean);
};

/** Every `var()` name in a value, fallbacks included. */
function vars(value) {
  const out = [];
  valueParser(value).walk((node) => {
    if (node.type === 'function' && node.value === 'var') {
      const name = node.nodes.find((n) => n.type === 'word')?.value;
      if (name) out.push(name);
    }
  });
  return out;
}

/** The top-level space-separated parts of a value: `0 calc(…)` is two. */
const parts = (value) =>
  valueParser(value)
    .nodes.filter((n) => n.type !== 'space' && n.type !== 'comment')
    .map((n) => valueParser.stringify(n));

/** At rest: `none`, `auto`, `0` with any unit, or a unitless `1` (a scale). */
function isRestingPart(part) {
  if (part === 'none' || part === 'auto') return true;
  const number = valueParser.unit(part);
  if (number === false) return false;
  return Number(number.number) === 0 || (Number(number.number) === 1 && number.unit === '');
}
const isResting = (value) => {
  const p = parts(value);
  return p.length > 0 && p.every(isRestingPart);
};

/**
 * A value with every `var()` replaced by what it can be: a stylesheet's private property
 * (`--_senui-*`) by each of its definitions and its fallback; a public token (`--senui-*`) stays, as
 * a leaf, because it is always defined and a consumer may override it, so the factor must sit
 * outside it. Any other name fails closed.
 *
 * @returns {{ values: string[], error?: string }}
 */
function expand(value, privates, depth = 0) {
  if (depth > 10) return { values: [], error: 'custom properties nest too deep to resolve' };
  const parsed = valueParser(value);
  let target = null;
  parsed.walk((node) => {
    if (target || node.type !== 'function' || node.value !== 'var') return;
    const name = node.nodes.find((n) => n.type === 'word')?.value ?? '';
    if (name.startsWith('--senui-')) {
      // Always defined: its fallback never applies.
      node.nodes = node.nodes.slice(0, 1);
      return false;
    }
    target = node;
    return false;
  });
  if (!target) return { values: [valueParser.stringify(parsed.nodes)] };
  const node = target;
  const name = node.nodes.find((n) => n.type === 'word')?.value ?? '';
  const comma = node.nodes.findIndex((n) => n.type === 'div' && n.value === ',');
  const fallback = comma === -1 ? null : valueParser.stringify(node.nodes.slice(comma + 1)).trim();
  if (!name.startsWith('--_senui-') || (!privates.has(name) && fallback === null)) {
    return { values: [], error: `\`var(${name})\` can't be resolved in this stylesheet` };
  }
  const alternatives = [...(privates.get(name) ?? []), ...(fallback === null ? [] : [fallback])];
  const values = [];
  for (const alternative of alternatives) {
    Object.assign(node, { type: 'word', value: alternative, nodes: [] });
    const inner = expand(valueParser.stringify(parsed.nodes), privates, depth + 1);
    if (inner.error) return inner;
    values.push(...inner.values);
  }
  return { values };
}

const hasFactor = (value) => vars(value).includes(REDUCE);
/** Every part that moves (isn't at rest) carries the factor: `0 calc(d * f)`, never `calc(d * f) d`. */
const scaled = (value) => parts(value).every((part) => isRestingPart(part) || hasFactor(part));

// The pseudo-element a selector styles (`::before`), or '' for the element itself.
const pseudoOf = (selector) => /::[\w-]+/.exec(selector)?.[0] ?? '';

/**
 * Finds the motion patterns in one component's stylesheets.
 *
 * @param {{ name: string, css: string }[]} sheets The component's stylesheet and those it imports.
 * @returns {{ patterns: Set<'removed' | 'instant' | 'essential'>, errors: string[] }}
 */
export function motionPatterns(sheets) {
  const patterns = new Set();
  const errors = [];
  const roots = sheets.map(({ name, css }) => ({ name, root: postcss.parse(css, { from: name }) }));
  const inKeyframes = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (p.type === 'atrule' && /keyframes$/.test(p.name)) return true;
    }
    return false;
  };

  // Private custom properties, every declaration of a movement property (by family), keyframes, and
  // every rule that sets a duration.
  const privates = new Map();
  const moved = new Map();
  const keyframes = new Map();
  const animationDurations = [];
  for (const { name, root } of roots) {
    root.walkAtRules(/keyframes$/, (rule) => keyframes.set(rule.params.trim(), { name, rule }));
    root.walkDecls((decl) => {
      if (inKeyframes(decl)) return;
      if (decl.prop.startsWith('--_senui-')) {
        privates.set(decl.prop, [...(privates.get(decl.prop) ?? []), decl.value]);
      }
      if (MOVEMENT.includes(decl.prop)) {
        const key = familyKey(decl.prop);
        moved.set(key, [...(moved.get(key) ?? []), { name, decl }]);
      }
      if (decl.prop === 'animation-duration') animationDurations.push(decl.value);
    });
  }

  // Instant slots, by pseudo-element: which indexes of the duration list must keep the factor.
  const instantSlots = new Map();
  const durationOnly = [];
  const judged = new Set();

  const removed = (property, where) => {
    const key = familyKey(property);
    if (judged.has(key)) return;
    judged.add(key);
    let moves = false;
    for (const { name: sheet, decl } of moved.get(key) ?? []) {
      if (isResting(decl.value)) continue;
      const { values, error } = expand(decl.value, privates);
      if (error) {
        errors.push(`${sheet}: \`${decl.prop}: ${decl.value}\`: ${error}`);
        continue;
      }
      moves = true;
      if (!values.every(scaled)) {
        errors.push(
          `${sheet}: \`${decl.prop}: ${decl.value}\` moves without --senui-motion-reduce in every moving part, and its transition (${where}) has a duration without it (ADR-0024: Removed multiplies the moved value, Instant the duration)`,
        );
      }
    }
    if (moves) patterns.add('removed');
  };

  for (const { name, root } of roots) {
    root.walkRules((rule) => {
      if (inKeyframes(rule)) return;
      const own = (prop) => rule.nodes.filter((n) => n.type === 'decl' && n.prop === prop).at(-1);
      const where = `${name} \`${rule.selector.replace(/\s+/g, ' ')}\``;

      // Transitions.
      const properties = own('transition-property');
      const durations = own('transition-duration');
      if (!properties && durations) durationOnly.push({ where, rule, durations });
      if (properties) {
        const list = split(properties.value);
        const times = durations ? split(durations.value) : [];
        if (times.length === 0 && list.some((p) => MOVEMENT.includes(p))) {
          errors.push(
            `${where}: transitions ${list.filter((p) => MOVEMENT.includes(p)).join(', ')} with no \`transition-duration\` beside it`,
          );
        } else {
          list.forEach((property, i) => {
            // Matched whitespace-free; parsed (for the factor) as written.
            const duration = times[i % times.length] ?? '';
            const instant = INSTANT_DURATION.test(squash(duration));
            if (!MOVEMENT.includes(property)) {
              if (hasFactor(duration)) {
                errors.push(
                  `${where}: \`${property}\` isn't movement, so its duration keeps out --senui-motion-reduce (ADR-0024: colour and opacity keep their duration)`,
                );
              }
              return;
            }
            if (instant) {
              patterns.add('instant');
              const key = pseudoOf(rule.selector);
              instantSlots.set(key, new Set([...(instantSlots.get(key) ?? []), i]));
            } else if (hasFactor(duration)) {
              errors.push(
                `${where}: \`${property}\`'s duration isn't a duration token times --senui-motion-reduce (ADR-0024: Instant)`,
              );
            } else {
              removed(property, where);
            }
          });
        }
      }

      // Animations. Its duration may sit in another rule (a modifier sets only the name), so every
      // `animation-duration` in the stylesheets must be Essential when the keyframes move.
      const animation = own('animation-name');
      if (animation && animation.value.trim() !== 'none') {
        for (const keyframe of split(animation.value)) {
          const found = keyframes.get(keyframe);
          if (!found) {
            errors.push(`${where}: \`@keyframes ${keyframe}\` is not in this stylesheet`);
            continue;
          }
          const animated = new Set();
          found.rule.walkDecls((d) => animated.add(d.prop));
          if (![...animated].some((p) => MOVEMENT.includes(p))) continue;
          const durationsHere = own('animation-duration')
            ? [own('animation-duration').value]
            : animationDurations;
          const essential =
            [...animated].every((p) => p === 'rotate') &&
            durationsHere.length > 0 &&
            durationsHere.every((d) => ESSENTIAL_DURATION.test(squash(d)));
          if (essential) patterns.add('essential');
          else {
            errors.push(
              `${where}: \`@keyframes ${keyframe}\` animates ${[...animated].join(', ')} for ${durationsHere.join(' / ') || 'no duration'}; the only animated movement is Essential: \`rotate\` alone, for \`calc(var(${ROTATION}) * (4 - 3 * var(${REDUCE})))\` (ADR-0024)`,
            );
          }
        }
      }
    });
  }

  // A rule that sets only durations (a state that speeds a transition up) must keep every Instant
  // slot of its element's transitions: otherwise it undoes the jump.
  for (const { where, rule, durations } of durationOnly) {
    const slots = instantSlots.get(pseudoOf(rule.selector));
    if (!slots) continue;
    const times = split(durations.value);
    for (const i of slots) {
      if (!INSTANT_DURATION.test(squash(times[i % times.length] ?? ''))) {
        errors.push(
          `${where}: \`transition-duration\` drops --senui-motion-reduce from an Instant movement's slot ${String(i + 1)} (ADR-0024)`,
        );
      }
    }
  }
  return { patterns, errors };
}

/**
 * What the contract must declare for the patterns found: the strictest one.
 *
 * @returns {{ reducedMotion: string, essentialMotion?: string } | { error: string }}
 */
export function expectedAdaptation(patterns) {
  if (patterns.has('instant') && patterns.has('essential')) {
    return { error: 'Instant and Essential in one component: no contract value says both' };
  }
  if (patterns.has('instant')) return { reducedMotion: 'instant' };
  if (patterns.has('essential')) {
    return { reducedMotion: 'motion-factor', essentialMotion: 'progress-rotation' };
  }
  if (patterns.has('removed')) return { reducedMotion: 'motion-factor' };
  return { reducedMotion: 'no-motion' };
}
