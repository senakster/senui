import { describe, expectTypeOf, test } from 'vitest';
import type { ButtonProps } from './components/Button/Button.js';
import type * as buttonStories from './components/Button/Button.stories.js';
import type { CheckboxProps } from './components/Checkbox/Checkbox.js';
import type * as checkboxStories from './components/Checkbox/Checkbox.stories.js';
import type { Manifest as EntryManifest } from './index.js';
import type { A11yContract } from './internal/a11y/a11y-contract.js';
import type { ComponentDocs } from './internal/docs/component-docs.js';
import type { Manifest, ManifestA11yContract, ManifestComponentDocs } from './manifest.js';

// L09 decision 7: the manifest's types mirror the internal ones without importing them. If the
// internal contract or guidance grows something the manifest can't carry, these fail.
describe('the manifest mirror types', () => {
  test('carry every a11y contract', () => {
    expectTypeOf<A11yContract>().toExtend<ManifestA11yContract>();
    expectTypeOf<A11yContract<ButtonProps>>().toExtend<ManifestA11yContract>();
    expectTypeOf<A11yContract<CheckboxProps>>().toExtend<ManifestA11yContract>();
  });

  test('carry every usage guidance', () => {
    expectTypeOf<
      ComponentDocs<ButtonProps, typeof buttonStories, 'Button'>
    >().toExtend<ManifestComponentDocs>();
    expectTypeOf<
      ComponentDocs<CheckboxProps, typeof checkboxStories, 'Checkbox'>
    >().toExtend<ManifestComponentDocs>();
  });

  test('the entry exports the manifest type', () => {
    expectTypeOf<EntryManifest>().toEqualTypeOf<Manifest>();
  });

  test('enumerations are open: an unknown value is still a value', () => {
    expectTypeOf<'a-new-value'>().toExtend<
      Manifest['components'][string]['accessibility']['adaptation']['forcedColors']
    >();
  });
});
