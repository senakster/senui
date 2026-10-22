import { describe, expect, test } from 'vitest';
import { mergeIds } from './ids.js';

describe('mergeIds', () => {
  test("keeps the consumer's ids and the component's, in order", () => {
    expect(mergeIds('hint', 'field-error')).toBe('hint field-error');
  });

  test('splits, de-duplicates and drops empty values', () => {
    expect(mergeIds(' a  b ', undefined, false, null, '', 'b')).toBe('a b');
  });

  test('returns undefined when nothing is left, so no empty attribute renders', () => {
    expect(mergeIds(undefined, '')).toBeUndefined();
  });
});
