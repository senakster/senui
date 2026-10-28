import { isValidElement, type ReactNode } from 'react';

/**
 * Wide content (data tables) scrolls sideways inside this wrapper and nowhere else, so the
 * page reflows at 320 px (WCAG 1.4.10). The wrapper is a named region in the tab order, so a
 * keyboard user can scroll it, and it shows the token focus ring. The docs gate fails any other
 * element that scrolls sideways, and any wrapper that isn't focusable and named.
 */
export function ScrollRegion({
  labelledBy,
  children,
}: {
  /** The id of the element that names it: a table's caption, or a code block's label. */
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    // A scrolling region must be focusable for keyboard users (WCAG 2.1.1); the region role and
    // its name tell a screen-reader user what the stop is.
    <div className="docs-scroll" role="region" tabIndex={0} aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}

/**
 * A code block. It wraps rather than scrolls: a line of code is one element, so scrolled out of
 * view it can't be read or contrast-checked whole, and a wrapped line needs no region.
 */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="docs-pre-wrap">
      <code>{code}</code>
    </pre>
  );
}

/** Text of a React subtree: what MDX passes a code block as children. */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/**
 * MDX's fenced code block. MDX gives a block no name, and several blocks of one language would
 * make regions with the same name, so it wraps instead of scrolling: it never needs a region.
 */
export function MdxPre({ children }: { children?: ReactNode }) {
  return (
    <div className="docs-mdx-block sb-unstyled">
      <CodeBlock code={textOf(children).replace(/\n$/, '')} />
    </div>
  );
}

/** MDX's inline code, outside Storybook's themed styles. */
export function MdxCode({ children }: { children?: ReactNode }) {
  return <code className="docs-mdx-code sb-unstyled">{children}</code>;
}
