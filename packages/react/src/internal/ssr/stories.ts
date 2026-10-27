/// <reference types="vite/client" />
import { composeStories } from '@storybook/react-vite';
import type { ComponentType } from 'react';

// L08 decision 9: every story of every component, composed, for the `ssr` project to render in Node
// and the browser project to hydrate. Vite resolves the glob at build time, so a new component's
// stories are picked up without registering them.
const modules = import.meta.glob<Parameters<typeof composeStories>[0]>(
  '../../components/*/*.stories.tsx',
  { eager: true },
);

/** `[id, Story]` for every composed story; the id (`Dialog--LongContent`) names its fixture file. */
export function allStories(): [string, ComponentType][] {
  return Object.entries(modules).flatMap(([path, module]) => {
    const component = /\/components\/([^/]+)\//.exec(path)?.[1] ?? path;
    return Object.entries(composeStories(module)).map(([name, Story]): [string, ComponentType] => [
      `${component}--${name}`,
      Story as ComponentType,
    ]);
  });
}

/**
 * Where the `ssr` project writes the markup (gitignored), relative to the package root: the Vitest
 * root, which is what the browser's `commands.readFile` resolves against.
 */
export const FIXTURES = '.ssr-fixtures';

/** What the `ssr` project writes next to the markup: the run that made it, and its story ids. */
export interface Manifest {
  run: string;
  ids: string[];
}
export const MANIFEST = 'manifest.json';
