// ADR-0024's static motion check (packages/react/scripts/motion.mjs): each pattern is found, and
// each way of moving without the factor fails, naming the stylesheet and the property. The cases
// below the patterns are the holes the L11 review reproduced.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedAdaptation, motionPatterns } from '../packages/react/scripts/motion.mjs';

const check = (css) => {
  const { patterns, errors } = motionPatterns([{ name: 'X/X.css', css }]);
  return { patterns: [...patterns].sort(), errors };
};
const FAST = 'var(--senui-motion-duration-fast)';
const REDUCE = 'var(--senui-motion-reduce)';
const INSTANT = `calc(${FAST} * ${REDUCE})`;
const SLOWED = `calc(var(--senui-motion-duration-rotation) * (4 - 3 * ${REDUCE}))`;
const transition = (property, duration = FAST) =>
  `.x { transition-property: ${property}; transition-duration: ${duration}; }`;

const REMOVED = `
  .x { transition-property: opacity, translate; transition-duration: ${FAST}; }
  @starting-style { .x { translate: 0 calc(var(--senui-motion-distance-md) * ${REDUCE}); } }
  .x[open] { translate: 0 0; }
`;

test('Removed: the moved value carries the factor, resting values aside', () => {
  assert.deepEqual(check(REMOVED), { patterns: ['removed'], errors: [] });
});

test('Removed fails when a moved value lacks the factor, naming the stylesheet and property', () => {
  const { errors } = check(REMOVED.replace(` * ${REDUCE}`, ''));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^X\/X\.css: `translate: 0 calc\(var\(--senui-motion-distance-md\)\)`/);
});

test('Instant: only the movement duration carries the factor', () => {
  const css = `
    .x::before {
      transition-property: margin-inline-start, background-color;
      transition-duration: ${INSTANT}, ${FAST};
    }
    .x:checked::before { margin-inline-start: var(--_senui-travel); }
  `;
  assert.deepEqual(check(css), { patterns: ['instant'], errors: [] });
});

test('durations pair with properties by index: the factor on the colour is not on the movement', () => {
  const css = `
    .x::before { transition-property: margin-inline-start, background-color; transition-duration: ${FAST}, ${INSTANT}; }
    .x:checked::before { margin-inline-start: var(--senui-switch-travel); }
  `;
  const errors = check(css).errors.join('\n');
  assert.match(errors, /`background-color` isn't movement/);
  assert.match(errors, /`margin-inline-start: var\(--senui-switch-travel\)` moves without/);
});

test('a movement on a pseudo-element fails like any other', () => {
  const css = `
    .x::before { transition-property: translate; transition-duration: ${FAST}; }
    .x:hover::before { translate: var(--senui-motion-distance-sm) 0; }
  `;
  assert.match(
    check(css).errors[0],
    /`translate: var\(--senui-motion-distance-sm\) 0` moves without/,
  );
});

test('private custom properties are resolved; the factor may sit in one', () => {
  const css = `
    .x { --_senui-x: calc(var(--senui-motion-distance-md) * ${REDUCE});
         transition-property: translate; transition-duration: ${FAST}; }
    .x:hover { translate: 0 var(--_senui-x); }
  `;
  assert.deepEqual(check(css), { patterns: ['removed'], errors: [] });
});

test('an indirection the stylesheet does not define fails closed', () => {
  const css = `${transition('translate')} .x:hover { translate: 0 var(--elsewhere); }`;
  assert.match(check(css).errors[0], /`var\(--elsewhere\)` can't be resolved/);
});

test('a transition of movement with no duration beside it fails', () => {
  assert.match(check('.x { transition-property: scale; }').errors[0], /no `transition-duration`/);
});

const SPIN = (frames, duration = SLOWED) => `
  .s { animation-name: spin; animation-duration: ${duration}; }
  @keyframes spin { to { ${frames} } }
`;

test('Essential: rotate alone, the rotation token slowed by the factor', () => {
  assert.deepEqual(check(SPIN('rotate: 1turn;')), { patterns: ['essential'], errors: [] });
});

test('Essential fails with translate beside rotate', () => {
  assert.match(
    check(SPIN('rotate: 1turn; translate: 0 4px;')).errors[0],
    /animates rotate, translate/,
  );
});

test('Essential fails without the factor', () => {
  assert.equal(
    check(SPIN('rotate: 1turn;', 'var(--senui-motion-duration-rotation)')).errors.length,
    1,
  );
});

test('keyframes of opacity only are not movement', () => {
  assert.deepEqual(check(SPIN('opacity: 0;', FAST)), { patterns: [], errors: [] });
});

// The review's reproductions.

test('a unit 1 is movement, not rest: only a unitless 1 (a scale) rests', () => {
  for (const value of ['1rem 0', '0 1px', '1em']) {
    const css = `${transition('translate')} .x:hover { translate: ${value}; }`;
    assert.equal(check(css).errors.length, 1, value);
  }
  assert.deepEqual(check(`${transition('scale')} .x { scale: 1; }`), { patterns: [], errors: [] });
});

test('`auto` rests, so `margin: 0 auto` beside a transitioned margin is not a movement', () => {
  const css = `${transition('margin-inline-start', INSTANT)} .y { margin: 0 auto; }`;
  assert.deepEqual(check(css), { patterns: ['instant'], errors: [] });
});

test('Instant takes a duration token times the factor; the Essential slowdown is not Instant', () => {
  const css = `${transition('translate', SLOWED)} .x:hover { translate: 4px; }`;
  assert.match(check(css).errors[0], /isn't a duration token times --senui-motion-reduce/);
});

test('Essential takes the slowdown; the factor alone would stop the spinner', () => {
  const css = SPIN('rotate: 1turn;', `calc(var(--senui-motion-duration-rotation) * ${REDUCE})`);
  assert.equal(check(css).errors.length, 1);
});

test('a rule that sets only durations cannot undo an Instant slot', () => {
  const css = `
    .x::before { transition-property: margin-inline-start, background-color; transition-duration: ${INSTANT}, ${FAST}; }
    .x:hover::before { transition-duration: ${FAST}; margin-inline-start: 4px; }
  `;
  assert.match(
    check(css).errors[0],
    /drops --senui-motion-reduce from an Instant movement's slot 1/,
  );
});

test('an animation duration in another rule is found', () => {
  const css = `
    .s { animation-duration: ${SLOWED}; }
    .s[data-loading] { animation-name: spin; }
    @keyframes spin { to { rotate: 1turn; } }
  `;
  assert.deepEqual(check(css), { patterns: ['essential'], errors: [] });
});

test('a shorthand that sets the transitioned longhand counts', () => {
  const css = `${transition('margin-inline-start')} .x:hover { margin-inline: var(--senui-space-2) 0; }`;
  assert.match(check(css).errors[0], /`margin-inline: var\(--senui-space-2\) 0` moves without/);
});

test('a longhand that the transitioned shorthand covers counts', () => {
  const css = `${transition('margin')} .x:hover { margin-inline-start: var(--senui-space-2); }`;
  assert.match(check(css).errors[0], /`margin-inline-start: var\(--senui-space-2\)` moves without/);
});

test('physical and logical properties are one family', () => {
  const insets = `${transition('top')} .x:hover { inset-block-start: var(--senui-space-2); }`;
  assert.equal(check(insets).errors.length, 1);
  const sizes = `${transition('width')} .x:hover { inline-size: var(--senui-space-8); }`;
  assert.equal(check(sizes).errors.length, 1);
});

test('movement beyond transforms, insets and margins is movement', () => {
  for (const property of ['max-height', 'padding-block', 'gap', 'grid-template-rows']) {
    const css = `${transition(property)} .x:hover { ${property}: var(--senui-space-4); }`;
    assert.equal(check(css).errors.length, 1, property);
  }
});

test('a var() fallback must carry the factor too', () => {
  const css = `
    .x[data-open] { --_senui-d: calc(var(--senui-motion-distance-md) * ${REDUCE}); }
    ${transition('translate')}
    .x:hover { translate: 0 var(--_senui-d, var(--senui-motion-distance-md)); }
  `;
  assert.equal(check(css).errors.length, 1);
});

test('a factor only in a public token fallback does not count', () => {
  const css = `${transition('translate')} .x:hover { translate: 0 var(--senui-motion-distance-md, ${REDUCE}); }`;
  assert.equal(check(css).errors.length, 1);
});

test('every moving part carries the factor', () => {
  const css = `${transition('translate')} .x:hover { translate: calc(var(--senui-motion-distance-md) * ${REDUCE}) var(--senui-motion-distance-md); }`;
  assert.equal(check(css).errors.length, 1);
});

test('the contract declares the strictest pattern', () => {
  assert.deepEqual(expectedAdaptation(new Set()), { reducedMotion: 'no-motion' });
  assert.deepEqual(expectedAdaptation(new Set(['removed'])), { reducedMotion: 'motion-factor' });
  assert.deepEqual(expectedAdaptation(new Set(['removed', 'instant'])), {
    reducedMotion: 'instant',
  });
  assert.deepEqual(expectedAdaptation(new Set(['essential'])), {
    reducedMotion: 'motion-factor',
    essentialMotion: 'progress-rotation',
  });
  assert.ok('error' in expectedAdaptation(new Set(['instant', 'essential'])));
});
