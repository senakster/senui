// Types for motion.mjs, so the gate (apps/docs/gate) and the docs app can read the movement list.
export declare const MOVEMENT: readonly string[];
export declare const NOT_MOVEMENT: readonly string[];

export type MotionPattern = 'removed' | 'instant' | 'essential';

export declare function motionPatterns(sheets: { name: string; css: string }[]): {
  patterns: Set<MotionPattern>;
  errors: string[];
};

export declare function expectedAdaptation(
  patterns: Set<MotionPattern>,
): { reducedMotion: string; essentialMotion?: string } | { error: string };
