import { Button } from '@senakster/senui';
import { Story } from '@storybook/addon-docs/blocks';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { PreparedStory } from 'storybook/internal/types';
import { Inline } from './Inline';
import { siteHref } from './manifest';

interface DocsParameters {
  story?: { inline?: boolean; iframeHeight?: string | number; height?: string };
  description?: { story?: string };
}

/**
 * One story on a docs page: its name as an `<h3>`, its description, and the story, never with
 * its play function (L09 "Docs-page rendering rules").
 *
 * A story renders inline, unless it can't share the page:
 *
 * - A story whose docs parameters say `inline: false` opens a modal dialog, which would make the
 *   page inert. It gets a frame, loaded only when the reader asks: a modal dialog takes focus as it
 *   opens, and a frame that opened one on load would pull focus, and the page's scroll position,
 *   into itself.
 * - A story laid out `fullscreen` is a page of its own, with its own `<h1>`, so it gets a frame.
 *
 * A framed story opens with `embed=true`, which is how Storybook's preview skips the play function
 * in a story URL; preview.tsx passes it the docs page's colour scheme.
 *
 * The canvas is a region named by the story's heading. It scrolls a story wider than the page,
 * and is in the tab order only while it does, so a keyboard user can scroll it (WCAG 2.1.1).
 */
export function DocsStory({ story, primary = false }: { story: PreparedStory; primary?: boolean }) {
  const id = useId();
  const canvas = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const docs = story.parameters.docs as DocsParameters | undefined;
  const modal = docs?.story?.inline === false;
  const framed = modal || story.parameters.layout === 'fullscreen';
  const [shown, setShown] = useState(!modal);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const check = () => {
      setScrolls(element.scrollWidth > element.clientWidth + 1);
    };
    // The canvas resizes with the page; the story renders into it later, and may change.
    const resize = new ResizeObserver(check);
    resize.observe(element);
    const mutation = new MutationObserver(check);
    mutation.observe(element, { childList: true, subtree: true, attributes: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);

  // The button that asked for the story is gone: focus goes to the story it showed.
  useEffect(() => {
    if (requested) frame.current?.focus();
  }, [requested]);

  const height = docs?.story?.height ?? docs?.story?.iframeHeight ?? 320;
  // The story's JSDoc (or `docs.description.story`): published text, inline code only, so its
  // paragraphs are the only structure it has.
  const paragraphs = (docs?.description?.story ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const label = `${story.name} (${primary ? 'example story' : 'story'})`;

  let content: ReactNode;
  if (!framed) {
    content = (
      <Story of={story.moduleExport as unknown} inline autoplay={false} __primary={primary} />
    );
  } else if (shown) {
    content = (
      <iframe
        ref={frame}
        className="docs-canvas__frame"
        data-senui-docs-story=""
        title={label}
        src={`iframe.html?id=${story.id}&viewMode=story&embed=true`}
        style={{ blockSize: typeof height === 'number' ? `${String(height)}px` : height }}
      />
    );
  } else {
    content = (
      <div className="docs-canvas__request">
        <p>This story opens a modal dialog, so it shows in a frame of its own when you ask.</p>
        <Button
          variant="secondary"
          data-senui-docs-show=""
          onClick={() => {
            setShown(true);
            setRequested(true);
          }}
        >
          Show the {story.name} story
        </Button>
      </div>
    );
  }

  return (
    <div className="docs-story">
      {primary && (
        <span id={`${id}-example`} className="docs-visually-hidden">
          Example:
        </span>
      )}
      <h3 id={id}>{story.name}</h3>
      {paragraphs.map((p) => (
        <p key={p}>
          <Inline text={p} href={siteHref} />
        </p>
      ))}
      <div
        ref={canvas}
        className="docs-canvas"
        role="region"
        aria-labelledby={primary ? `${id}-example ${id}` : id}
        tabIndex={scrolls ? 0 : undefined}
      >
        {content}
      </div>
    </div>
  );
}
