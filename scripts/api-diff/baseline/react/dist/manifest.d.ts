//#region src/manifest.d.ts
/**
 * The shape of `components.json`, the machine-readable description of this package that ships in
 * it (`@senakster/senui/components.json`). This type is the schema: there is no JSON Schema.
 *
 * ```ts
 * import type { Manifest } from '@senakster/senui';
 * import manifest from '@senakster/senui/components.json' with { type: 'json' };
 *
 * const button = (manifest as Manifest).components.Button;
 * ```
 *
 * Semver covers the set of components and their branches, prop names and whether each is
 * required, the values of variant props, data-attribute values, classes and component tokens.
 * Informative, and may change in any release: printed types, descriptions, dates, story ids and
 * URLs.
 *
 * Enumerations are open: a value not listed here may appear in a minor release. Treat an unknown
 * value as "not described". `schemaVersion` changes only on a breaking change to this shape, in a
 * major release, after a release that emits the old and the new field side by side. Fields added
 * in a minor don't change it, so feature-detect them.
 *
 * These are mirror types: they import nothing from the package's internals.
 */
export interface Manifest {
  readonly schemaVersion: 1;
  readonly package: ManifestPackage;
  /** What a component's WCAG claims can and can't mean. Shown before every claim in the docs. */
  readonly conformance: string;
  /** The published docs site, which shows the latest build of the default branch. */
  readonly site: {
    readonly url: string;
    readonly label: string;
  };
  /** Every export of the package entry, sorted by name. */
  readonly exports: readonly ManifestExport[];
  readonly tokens: ManifestTokens;
  readonly css: ManifestCss;
  /**
   * The accessibility gate, one automated run over every story and every docs page. Claims cite it
   * by its `id` in `wcagEvidence`.
   */
  readonly gate: ManifestGateRun;
  readonly wcag: {
    readonly version: '2.2';
    /** The fixed text each kind of claim is rendered with, by claim. */
    readonly claims: Readonly<Record<string, string>>;
    /**
     * The axe-core rules a component's own automated run includes, by the criterion their WCAG
     * tags name, from axe-core's rule metadata.
     */
    readonly axe: {
      readonly version: string;
      readonly tags: readonly string[];
      readonly rules: Readonly<Record<string, readonly string[]>>;
    };
    /** Every WCAG criterion a component's contract names, by number (`'2.4.7'`). */
    readonly criteria: Readonly<Record<string, ManifestWcagCriterion>>;
  };
  /** Every component, by its export name. */
  readonly components: Readonly<Record<string, ManifestComponent>>;
}
/**
 * An open enumeration: the listed values, or one added later. Treat an unknown value as "not
 * described".
 */
export type OpenEnum<T extends string> = T | (string & {});
export interface ManifestPackage {
  readonly name: string;
  /** The package version. An unreleased build reads `<x.y.z>-main.<commit>`. */
  readonly version: string;
  /** `false` for a build from a commit that isn't a published release. */
  readonly released: boolean;
}
export interface ManifestExport {
  readonly name: string;
  readonly kind: OpenEnum<'component' | 'function' | 'type'>;
  readonly description: string;
  /**
   * Set from the minor that deprecates it until the major that removes it. A deprecated component
   * kept only as an alias of its replacement has no entry in `components`.
   */
  readonly deprecated?: ManifestDeprecation;
}
/** Something public that the next major removes. */
export interface ManifestDeprecation {
  /** What to use instead, as a sentence: "Use `variant` instead." */
  readonly useInstead: string;
}
export interface ManifestTokens {
  /** The tokens package this one depends on. */
  readonly package: string;
  /** The version range of that dependency. */
  readonly versionRange: string;
  /** Every public semantic token, as a custom property name (`--senui-color-fg-danger`). */
  readonly names: readonly string[];
}
export interface ManifestCss {
  /** The stylesheets to load, in order. */
  readonly importOrder: readonly string[];
  /** How to load one component's styles instead of all of them. */
  readonly perComponent: string;
  /** The cascade layers, in order. */
  readonly layers: readonly string[];
  /** What part classes (`__`) are. */
  readonly partClasses: string;
}
export interface ManifestWcagCriterion {
  readonly level: OpenEnum<'A' | 'AA' | 'AAA'>;
  readonly title: string;
  /** The criterion's Understanding page at the W3C. */
  readonly understanding: string;
}
export interface ManifestComponent extends ManifestUsage {
  readonly name: string;
  /** The line that imports it: `import { Button } from '@senakster/senui';`. */
  readonly import: string;
  readonly deprecated?: ManifestDeprecation;
  /** The element that gets the native attributes and the ref (from the contract). */
  readonly element: string;
  /** An explicit role, when the element's native one isn't enough. */
  readonly role?: string;
  /** The element that carries the root class, `className` and `style`. */
  readonly rootElement: string;
  readonly native: ManifestNative;
  /** Props every branch accepts, sorted by name. Native attributes are summarised in `native`. */
  readonly props: readonly ManifestProp[];
  /** Props typed `never` for every use of the component, sorted by name. */
  readonly forbidden: readonly ManifestForbidden[];
  /** Each named union in the props type, with its branches. The props are one branch per axis. */
  readonly axes: readonly ManifestAxis[];
  readonly css: ManifestComponentCss;
  /** The component's stories, sorted by id. */
  readonly stories: readonly ManifestStory[];
  /** What the app using the component must still do. The same list as the contract's. */
  readonly consumerResponsibilities: readonly string[];
  /** The component's accessibility contract, whole. */
  readonly accessibility: ManifestA11yContract;
  /** One entry per `accessibility.testedWith` run, in the same order. */
  readonly testRuns: readonly ManifestTestRunStatus[];
  /** One entry per `accessibility.wcag` claim, in the same order: the runs it rests on. */
  readonly wcagEvidence: readonly ManifestClaimEvidence[];
}
export interface ManifestClaimEvidence {
  readonly criterion: string;
  /** The ids of the runs the claim rests on: `testRuns[].id`, or `Manifest.gate.id`. */
  readonly runs: readonly string[];
  /** For `automated` evidence: the axe rules in the component's run that test the criterion. */
  readonly axeRules: readonly string[];
  /** For `automated` evidence: the component's tests whose title names the criterion. */
  readonly tests: readonly string[];
  /** For `automated` evidence: the gate's checks that test the criterion. */
  readonly gateChecks: readonly string[];
  /**
   * The claim cites automated evidence, but no axe rule, gate check or named test is known to test
   * the criterion.
   */
  readonly untraced?: boolean;
}
export interface ManifestGateRun {
  /** How claims cite it: `'gate'`. */
  readonly id: string;
  readonly method: OpenEnum<'automated'>;
  readonly tool: string;
  /** When it runs. */
  readonly when: string;
  /** Its checks, in the gate's order. */
  readonly checks: readonly {
    readonly name: string;
    /** The spec that runs it, in the repository's `apps/docs/gate/`. */
    readonly spec: string;
    readonly checks: string;
    /** The WCAG 2.2 criteria it tests, sorted. */
    readonly criteria: readonly string[];
  }[];
}
export interface ManifestNative {
  /** The element whose native attributes the component accepts. */
  readonly element: string;
  /** Native attributes of `element` that the component doesn't accept. */
  readonly omitted: readonly string[];
  /** Native attribute names the component declares itself, with its own meaning or type. */
  readonly overridden: readonly string[];
}
export interface ManifestProp {
  readonly name: string;
  /** The type as written. Informative: it may be reprinted in any release. */
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly default?: string;
  /** The values of a prop typed as a union of literals, sorted. */
  readonly values?: readonly (string | number)[];
  /** The prop has a native attribute's name, but the component declares it with its own meaning. */
  readonly overridesNative?: boolean;
  readonly deprecated?: ManifestDeprecation;
  /** Deprecated members of `values`, by the value as a string. */
  readonly deprecatedValues?: Readonly<Record<string, ManifestDeprecation>>;
}
export interface ManifestForbidden {
  readonly name: string;
  /** Why it is forbidden, and what to use instead. */
  readonly useInstead: string;
}
export interface ManifestAxis {
  /** The union's type name. */
  readonly name: string;
  /** Whether the package entry exports the union's type. */
  readonly exported: boolean;
  readonly description?: string;
  /** In the order written. Branches may overlap; their summaries say how. */
  readonly branches: readonly ManifestBranch[];
}
export interface ManifestBranch {
  readonly summary: string;
  readonly deprecated?: ManifestDeprecation;
  /** The props this branch requires that a sibling branch forbids, sorted. */
  readonly discriminant: readonly string[];
  /** The props this branch declares, sorted by name. */
  readonly props: readonly ManifestProp[];
  /** Props accepted elsewhere that this branch forbids. */
  readonly notInBranch: readonly {
    readonly name: string;
    readonly note?: string;
  }[];
  /** Props this branch forbids that nothing else accepts. */
  readonly forbidden: readonly ManifestForbidden[];
  /** The branch also requires one of these prop sets. */
  readonly requiresOneOf?: readonly (readonly ManifestProp[])[];
}
export interface ManifestComponentCss {
  /** The root class, public API: `senui-button`. */
  readonly rootClass: string;
  /** Each `data-*` attribute the component renders, with its values, sorted. */
  readonly dataAttributes: Readonly<Record<string, readonly string[]>>;
  /** The component tokens it declares, sorted. */
  readonly tokens: readonly string[];
  /** The stylesheet to import for this component alone. */
  readonly stylesheet: string;
  /** Other components whose stylesheets this one imports. */
  readonly cssIncludes: readonly string[];
  /**
   * Deprecated CSS surface, by the name as written: a token (`--senui-button-bg`, still listed in
   * `tokens`), a data-attribute value (`[data-variant='subtle']`) or a class (`.senui-old`).
   */
  readonly deprecated?: Readonly<Record<string, ManifestDeprecation>>;
}
export interface ManifestStory {
  /** The Storybook story id. Informative. */
  readonly id: string;
  /** The story's export name, as `examples` names it. */
  readonly name: string;
  readonly title: string;
  /**
   * The args the story renders with. A value JSON can't hold reads `'[function]'` or
   * `'[React element]'`.
   */
  readonly args: Readonly<Record<string, unknown>>;
  /** The story on the docs site, which shows the latest build, not this version. */
  readonly latestSite: string;
}
export interface ManifestTestRunStatus {
  /** The run's id, which `wcagEvidence` cites: its method and date (`screen-reader-2026-10-17`). */
  readonly id: string;
  /**
   * Whether the component's source was committed after the run's date: the run may no longer
   * describe it. `null` when the build couldn't tell (no git history).
   */
  readonly sourceChangedSince: boolean | null;
}
export interface ManifestUsage {
  /** One sentence: what the component is for. */
  readonly summary: string;
  readonly description: string;
  readonly useWhen: readonly string[];
  readonly dontUseWhen: readonly {
    readonly when: string;
    readonly alternative: ManifestAlternative;
  }[];
  readonly related: readonly string[];
  /** Story export names. */
  readonly examples: readonly string[];
  readonly composition: readonly ManifestComposition[];
}
/** Exactly one of `component`, `element`, `pattern` or `none` is set. */
export interface ManifestAlternative {
  readonly component?: string;
  readonly element?: string;
  readonly pattern?: string;
  readonly none?: string;
  readonly note?: string;
}
export interface ManifestComposition {
  /** The component this one is placed inside. */
  readonly parent: string;
  /** Props that have no effect there. */
  readonly ignored?: readonly string[];
  /** Props that become required there. */
  readonly required?: readonly string[];
  readonly note: string;
}
export interface ManifestA11yContract {
  readonly component: string;
  readonly semantics: ManifestSemantics;
  readonly keyboard: readonly ManifestKeyBinding[];
  readonly focus: ManifestFocus;
  readonly announcements: readonly ManifestAnnouncement[];
  readonly requiredProps: readonly ManifestRequiredProp[];
  readonly consumerResponsibilities: readonly string[];
  readonly adaptation: ManifestAdaptation;
  readonly wcag: readonly ManifestWcagClaim[];
  readonly testedWith: readonly ManifestTestRun[];
  readonly knownIssues: readonly {
    readonly issue: string;
    readonly workaround: string;
  }[];
}
export interface ManifestSemantics {
  readonly element: string;
  readonly role?: string;
  /** The ARIA Authoring Practices pattern followed. */
  readonly pattern?: string;
  /** Where the accessible name comes from, or `'none'`: no accessible name, by design. */
  readonly name: {
    readonly sources: readonly OpenEnum<'content' | 'aria-label' | 'aria-labelledby' | 'label-element'>[];
    readonly required: boolean;
  } | 'none';
  readonly states: readonly {
    readonly attribute: string;
    readonly when: string;
  }[];
  readonly relationships: readonly {
    readonly attribute: string;
    readonly target: string;
    readonly owner: OpenEnum<'component' | 'consumer'>;
  }[];
  readonly hiddenFromAT: readonly string[];
  readonly notes?: string;
}
export interface ManifestKeyBinding {
  /** Key names as Playwright's `keyboard.press` takes them, or `'printable character'`. */
  readonly keys: readonly string[];
  readonly action: string;
}
export interface ManifestFocus {
  readonly tabStop: OpenEnum<'none' | 'native' | 'roving' | 'activedescendant' | 'programmatic'>;
  readonly indicator?: OpenEnum<'focus-ring'> | {
    readonly exception: string;
    readonly description: string;
  };
  readonly management?: {
    readonly onOpen?: OpenEnum<'first-focusable' | 'container' | 'named-element'>;
    readonly trap?: boolean;
    readonly restore?: OpenEnum<'trigger' | 'trigger-or-fallback'>;
  };
}
export interface ManifestAnnouncement {
  readonly when: string;
  /** `component`: observed with a screen reader. `consumer`: what the app must announce. */
  readonly owner: OpenEnum<'component' | 'consumer'>;
  readonly announces: string;
  /** The language of the speech quoted in `announces` (BCP 47). */
  readonly language?: string;
  readonly mechanism: OpenEnum<'live-region' | 'focus' | 'focus-move' | 'state-change' | 'name-change' | 'reading'>;
  readonly politeness?: OpenEnum<'polite' | 'assertive'>;
}
export interface ManifestRequiredProp {
  /** One of these is required. */
  readonly props: readonly string[];
  readonly when?: string;
  readonly why: string;
}
export interface ManifestAdaptation {
  readonly targetSize: OpenEnum<'min-24' | 'spacing-exception' | 'not-a-target'>;
  readonly activatesOn: OpenEnum<'click' | 'pointerup' | 'not-activatable'>;
  readonly forcedColors: OpenEnum<'border' | 'system-colour' | 'no-states'>;
  readonly rtl: OpenEnum<'mirrors' | 'direction-neutral'>;
  readonly textOverflow: OpenEnum<'wraps' | 'truncates'>;
  readonly reducedMotion: OpenEnum<'motion-factor' | 'no-motion'>;
  /** The one animation kept under reduced motion, on purpose. */
  readonly essentialMotion?: OpenEnum<'progress-rotation'>;
}
export interface ManifestWcagClaim {
  /** A WCAG 2.2 criterion number; see `Manifest.wcag.criteria`. */
  readonly criterion: string;
  /** `meets`: the component satisfies it alone. `enables`: the app can, using it as documented. */
  readonly claim: OpenEnum<'meets' | 'enables'>;
  readonly how: string;
  readonly evidence: readonly OpenEnum<ManifestTestMethod>[];
}
export type ManifestTestMethod = 'automated' | 'screen reader' | 'keyboard' | 'forced colours' | 'resize-200' | 'reflow-320' | 'text-spacing' | 'reduced-motion' | 'pointer-touch' | 'voice control';
/** One verification run. Which fields are set depends on `method`. */
export interface ManifestTestRun {
  readonly method: OpenEnum<ManifestTestMethod>;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly result?: OpenEnum<'pass' | 'pass-with-known-issues'>;
  /** Automated runs: the tools. */
  readonly tool?: string;
  /** Screen-reader runs: the assistive technology and its version. */
  readonly at?: string;
  readonly atVersion?: string;
  /** Screen-reader runs: the language of the reader's speech (BCP 47). */
  readonly language?: string;
  readonly browser?: string;
  readonly browserVersion?: string;
  readonly os?: string;
  /** Screen-reader runs: the package version tested. `0.0.0` is a pre-release build. */
  readonly packageVersion?: string;
  /** Other runs: what was checked, and how. */
  readonly detail?: string;
}
//#endregion