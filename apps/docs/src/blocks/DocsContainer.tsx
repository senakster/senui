import {
  DocsContainer as StorybookDocsContainer,
  type DocsContainerProps,
} from '@storybook/addon-docs/blocks';
import type { PropsWithChildren } from 'react';
import './docs.css';

/**
 * Every docs page, the component pages and the MDX pages alike, puts its content in `<main>`
 * (L09 "Docs-page rendering rules"), inside Storybook's own container. The surface takes the senui
 * background and text tokens (docs.css), so it follows the colour scheme like a consumer's page.
 */
export function DocsContainer({ children, ...props }: PropsWithChildren<DocsContainerProps>) {
  return (
    <StorybookDocsContainer {...props}>
      <main className="docs-main">{children}</main>
    </StorybookDocsContainer>
  );
}
