// Types for the custom browser commands in vitest.commands.ts (L06), as tests call them:
// `import { commands } from 'vitest/browser'`.
import 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Wheels over the topmost modal dialog's backdrop. */
    wheelOverBackdrop: (deltaY: number) => Promise<void>;
    /** Clicks the topmost modal dialog's backdrop. */
    clickBackdrop: () => Promise<void>;
    /** Emulates `prefers-reduced-motion: reduce` (true) or `no-preference` (false). */
    emulateReducedMotion: (reduce: boolean) => Promise<void>;
  }
}
