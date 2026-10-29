// Types for wording.mjs, so the Storybook docs blocks (apps/docs/src/blocks) can render it.
import type {
  Manifest,
  ManifestA11yContract,
  ManifestAdaptation,
  ManifestAxis,
  ManifestBranch,
  ManifestComponent,
  ManifestComposition,
  ManifestDeprecation,
  ManifestFocus,
  ManifestForbidden,
  ManifestProp,
  ManifestStory,
  ManifestUsage,
  ManifestWcagClaim,
} from '../../src/manifest.js';

/** Text with inline code (`x`) and links ([text](url)), and no other Markdown. */
type Text = string;
type DocLink = (name: string) => Text;

export const CONFORMANCE: string;
export const CLAIM_TEXT: Readonly<Record<'meets' | 'enables', string>>;
export const APP_MUST_NOTE: string;
export const TYPE_DISPLAY: Readonly<Record<string, string>>;
export const HEADINGS: Readonly<
  Record<
    | 'import'
    | 'required'
    | 'appMust'
    | 'usage'
    | 'useWhen'
    | 'dontUseWhen'
    | 'composition'
    | 'props'
    | 'everyUse'
    | 'notAccepted'
    | 'styling'
    | 'accessibility'
    | 'semantics'
    | 'keyboard'
    | 'focus'
    | 'announcements'
    | 'wcag'
    | 'adaptation'
    | 'testRuns'
    | 'knownIssues'
    | 'stories',
    string
  >
>;
export const NO_REQUIRED_PROPS: string;
export const NOTHING_TO_DO: string;
export const NO_OWN_PROPS: string;
export const NO_KEYS: string;

export function code(text: string | number): Text;
export function series(items: readonly string[], last?: string): string;

export function stylesText(
  manifest: Manifest,
  component: ManifestComponent,
  path: (target: string) => string,
): Text;
export function requiredItems(component: ManifestComponent): { text: Text; items?: Text[] }[];
export function appMustItems(component: ManifestComponent): { text: Text; language?: string }[];
export function dontUseText(d: ManifestUsage['dontUseWhen'][number], docLink: DocLink): Text;
export function compositionText(c: ManifestComposition, docLink: DocLink): Text;
export function relatedText(component: ManifestComponent, docLink: DocLink): Text | undefined;
export function examplesText(
  component: ManifestComponent,
  storyLink: (story: ManifestStory) => string,
): Text;
export function nativeText(component: ManifestComponent): Text;
export function propCells(p: ManifestProp): {
  name: Text;
  required: string;
  type: Text;
  default?: Text;
  description: Text;
};
export function propText(p: ManifestProp): Text;
export function forbiddenText(f: ManifestForbidden): Text;
/** "Deprecated. Use `variant` instead." Always text: never only a strike-through or a colour. */
export function deprecatedText(d: ManifestDeprecation): Text;
export function axisHeading(axis: ManifestAxis): string;
export function branchNotes(branch: ManifestBranch): Text[];
export function stylingItems(
  manifest: Manifest,
  component: ManifestComponent,
  docLink: DocLink,
): Text[];
export function semanticsItems(contract: ManifestA11yContract): Text[];
export function keyboardRows(contract: ManifestA11yContract): { keys: Text; action: Text }[];
export function focusItems(focus: ManifestFocus): Text[];
export function announcementItems(
  contract: ManifestA11yContract,
): { text: Text; language?: string }[];
export function claimText(
  manifest: Manifest,
  component: ManifestComponent,
  claim: ManifestWcagClaim,
  index: number,
): Text;
export function adaptationRows(adaptation: ManifestAdaptation): { label: string; text: Text }[];
export function testRunRows(
  manifest: Manifest,
  component: ManifestComponent,
): { id: Text; text: Text; checks?: Text[] }[];
export function knownIssueItems(contract: ManifestA11yContract): Text[];
export function noKnownIssuesText(contract: ManifestA11yContract): string;
export function storiesIntro(manifest: Manifest): Text;
