// Types for build-docs.mjs, so tsdown.config.ts and the generator's tests can call it.
import type { Manifest, ManifestComponent, ManifestDeprecation } from '../src/manifest.js';

export interface GenerateOptions {
  /** Test switch: build the TypeScript program from its root files in reverse order. */
  readonly reorder?: boolean;
  /** Test switch: read every source file with CRLF line endings. */
  readonly crlf?: boolean;
  /** Defaults to `process.env`. `SENUI_RELEASE=1` marks the build as a release. */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface Generated {
  readonly manifest: Manifest;
  /** Each generated file's content, by its path inside `dist`. */
  readonly files: ReadonlyMap<string, string>;
  /** Problems found; the build fails on any. */
  readonly errors: readonly string[];
}

/** Generates every file in memory, from `src`. */
export function generate(root: string, options?: GenerateOptions): Promise<Generated>;

/** Generates the files into `<root>/dist`; throws on any error. */
export function buildDocs(root: string): Promise<void>;

/** Claims published flagged: automated evidence that nothing traceable tests (`Name x.y.z`). */
export const UNTRACED: readonly string[];

/** The WCAG criteria axe-core's rules test for the given tags, from axe-core's rule metadata. */
export function axeCoverage(
  root: string,
  tags: readonly string[],
  disabled?: readonly string[],
): { version: string; rules: Record<string, string[]> };

/** Relative links in the Markdown and text files that name no generated file. */
export function linkErrors(files: ReadonlyMap<string, string>): string[];

/**
 * L10 decision 7: a deprecated prop without its `deprecate()` call, or a deprecated data value or
 * class that no longer renders.
 */
export function deprecationErrors(
  name: string,
  props: Pick<ManifestComponent, 'props' | 'axes'>,
  css: { readonly deprecated: Readonly<Record<string, ManifestDeprecation>> },
  markup: { readonly dataAttributes: Readonly<Record<string, readonly string[]>> },
  source: string,
): string[];
