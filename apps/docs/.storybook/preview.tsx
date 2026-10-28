import type { Decorator, Preview } from '@storybook/react-vite';
// Tokens and component styles load through the packages' public exports, as a consumer would load
// them. In development, main.ts aliases the component stylesheet to its source so edits show
// without a rebuild; production builds (and the L08 gate) get the package's built stylesheet.
import '@senakster/senui-tokens/tokens.css';
import '@senakster/senui/styles.css';
import './preview.css';
import { ComponentPage, DOCS_STORY_HEADING_LEVEL } from '../src/blocks/ComponentPage';
import { DocsContainer } from '../src/blocks/DocsContainer';
import { MdxCode, MdxPre } from '../src/blocks/ScrollRegion';

/** Args that set the level of a heading the component renders. */
const HEADING_ARGS = ['headingLevel', 'titleLevel'] as const;

/**
 * L09 "Docs-page rendering rules": on a docs page, a story's own heading sits one level below the
 * story's name, so the page's outline never skips a level. Docs pages only: the story itself keeps
 * its args, and its own entry is checked with them.
 */
const docsHeadingLevel: Decorator = (Story, { viewMode, args }) => {
  const set = HEADING_ARGS.filter((name) => name in args);
  if (viewMode !== 'docs' || set.length === 0) return <Story />;
  const override = Object.fromEntries(set.map((name) => [name, DOCS_STORY_HEADING_LEVEL]));
  return <Story args={{ ...args, ...override }} />;
};

/**
 * A story framed on a docs page (DocsStory) takes the page's colour scheme. Chromium and Firefox
 * pass `color-scheme` into an iframe; Safari doesn't, and resolves `prefers-color-scheme` to the
 * system setting there. So the frame reads the page's scheme, which it may (same origin), and sets
 * it on its own root, following the page when it changes.
 */
function followDocsPageScheme(): void {
  const frame = window.frameElement;
  if (!frame?.hasAttribute('data-senui-docs-story')) return;
  const page = window.parent;
  const media = page.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const declared = page.getComputedStyle(page.document.documentElement).colorScheme.trim();
    const scheme = declared === 'light' || declared === 'dark' ? declared : undefined;
    document.documentElement.style.colorScheme = scheme ?? (media.matches ? 'dark' : 'light');
  };
  apply();
  media.addEventListener('change', apply);
}
followDocsPageScheme();

const preview: Preview = {
  // L09: every component gets a docs page (Storybook's autodocs), from the project template below.
  tags: ['autodocs'],
  decorators: [docsHeadingLevel],
  parameters: {
    controls: { expanded: true },
    docs: {
      page: ComponentPage,
      container: DocsContainer,
      // The MDX pages' code, outside Storybook's themed code styles (docs.css).
      components: { pre: MdxPre, code: MdxCode },
    },
  },
};

export default preview;
