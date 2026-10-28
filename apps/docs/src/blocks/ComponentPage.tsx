import { DocsContext, useOf } from '@storybook/addon-docs/blocks';
import { useContext, useId, type ReactNode } from 'react';
import { DocsStory } from './DocsStory';
import { Inline } from './Inline';
import { componentEntry, docLink, docsId, manifest, siteHref, storyLink } from './manifest';
import { Accessibility } from './Accessibility';
import { Props } from './Props';
import { CodeBlock } from './ScrollRegion';
import {
  HEADINGS,
  NO_REQUIRED_PROPS,
  NOTHING_TO_DO,
  appMustItems,
  compositionText,
  dontUseText,
  examplesText,
  requiredItems,
  relatedText,
  stylesText,
  stylingItems,
} from '../../../../packages/react/scripts/docs/wording.mjs';
import './docs.css';

const text = (value: string, lang?: string) => <Inline text={value} lang={lang} href={siteHref} />;

/** A docs-page section: its `<h2>` and what follows, in a `<section>` named by the heading. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * The project's docs page for a component (L09 "Human docs"), from Storybook's `autodocs`. Every
 * fact comes from the generated `components.json`, and every sentence from the same wording
 * functions that write `docs/<name>.md`, in the same order:
 *
 * summary, import, required props, Your app must, usage, the primary story, props by axis and
 * branch, styling, accessibility, then the stories.
 *
 * Storybook's ArgTypes and Controls tables are left off: react-docgen flattens the union branches
 * the Props section shows.
 */
export function ComponentPage() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const context = useContext(DocsContext);
  const name = preparedMeta.title.split('/').at(-1) ?? preparedMeta.title;
  const component = componentEntry(name);
  if (!component) {
    return (
      <>
        <h1>{name}</h1>
        <p>
          No entry for {name} in <code>@senakster/senui/components.json</code>. Run{' '}
          <code>pnpm build</code> to generate it.
        </p>
      </>
    );
  }
  const stories = context.componentStories();
  const primary = stories[0];
  const required = requiredItems(component);
  const appMust = appMustItems(component);
  const related = relatedText(component, docLink);
  const frameFree = docsId(component);

  return (
    <div className="docs-page sb-unstyled">
      <h1>{component.name}</h1>
      <p className="docs-summary">{text(component.summary)}</p>

      <Section title={HEADINGS.import}>
        <CodeBlock code={component.import} />
        <p>{text(stylesText(manifest, component, (path) => path))}</p>
      </Section>

      <Section title={HEADINGS.required}>
        {required.length > 0 ? (
          <ul>
            {required.map((item) => (
              <li key={item.text}>
                {text(item.text)}
                {item.items && (
                  <ul>
                    {item.items.map((line) => (
                      <li key={line}>{text(line)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>{NO_REQUIRED_PROPS}</p>
        )}
      </Section>

      <Section title={HEADINGS.appMust}>
        {appMust.length > 0 ? (
          <ul>
            {appMust.map((item) => (
              <li key={item.text}>{text(item.text, item.language)}</li>
            ))}
          </ul>
        ) : (
          <p>{NOTHING_TO_DO}</p>
        )}
      </Section>

      <Section title={HEADINGS.usage}>
        <p>{text(component.description)}</p>
        <h3>{HEADINGS.useWhen}</h3>
        <ul>
          {component.useWhen.map((line) => (
            <li key={line}>{text(line)}</li>
          ))}
        </ul>
        <h3>{HEADINGS.dontUseWhen}</h3>
        <ul>
          {component.dontUseWhen.map((d) => (
            <li key={d.when}>{text(dontUseText(d, docLink))}</li>
          ))}
        </ul>
        {component.composition.length > 0 && (
          <>
            <h3>{HEADINGS.composition}</h3>
            <ul>
              {component.composition.map((c) => (
                <li key={c.parent}>{text(compositionText(c, docLink))}</li>
              ))}
            </ul>
          </>
        )}
        {related && <p>{text(related)}</p>}
        <p>{text(examplesText(component, storyLink))}</p>
      </Section>

      {primary && (
        <Section title="Example">
          <DocsStory story={primary} primary />
        </Section>
      )}

      <Section title={HEADINGS.props}>
        <Props component={component} />
      </Section>

      <Section title={HEADINGS.styling}>
        <ul>
          {stylingItems(manifest, component, docLink).map((line) => (
            <li key={line}>{text(line)}</li>
          ))}
        </ul>
      </Section>

      <Section title={HEADINGS.accessibility}>
        <Accessibility component={component} />
      </Section>

      <Section title={HEADINGS.stories}>
        {stories.map((story) => (
          <DocsStory key={story.id} story={story} />
        ))}
      </Section>

      {frameFree && (
        <p className="docs-frame-free">
          <a href={`iframe.html?viewMode=docs&id=${frameFree}`} target="_top">
            Open this page without the Storybook frame
          </a>
        </p>
      )}
    </div>
  );
}

/**
 * The heading level a story's own heading renders at on a docs page: one below the story's `<h3>`
 * name. preview.ts sets it on the heading-level args (`headingLevel`, `titleLevel`) of every story
 * rendered on a docs page, so the page's outline never skips a level.
 */
export const DOCS_STORY_HEADING_LEVEL = 4;
