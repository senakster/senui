import type { ManifestComponent } from './manifest';
import type { ReactNode } from 'react';
import { Inline } from './Inline';
import { manifest, siteHref } from './manifest';
import {
  CONFORMANCE,
  HEADINGS,
  NO_KEYS,
  adaptationRows,
  announcementItems,
  claimText,
  focusItems,
  keyboardRows,
  knownIssueItems,
  noKnownIssuesText,
  semanticsItems,
  testRunRows,
} from '../../../../packages/react/scripts/docs/wording.mjs';

const text = (value: string, lang?: string) => <Inline text={value} lang={lang} href={siteHref} />;

function List({ items }: { items: readonly string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{text(item)}</li>
      ))}
    </ul>
  );
}

/** Key-value rows as a description list: each key in a `<dt>`, its value in a `<dd>`. */
function Pairs({ rows }: { rows: readonly { key: string; value: ReactNode }[] }) {
  return (
    <dl className="docs-pairs">
      {rows.map((row) => (
        <div key={row.key}>
          <dt>{text(row.key)}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The whole accessibility contract, as the Markdown docs word it (L09 decision 5): the conformance
 * preamble, then each part. A component-owned announcement says which reader it was observed
 * with; a consumer-owned one points to Your app must. Quoted speech carries its language.
 */
export function Accessibility({ component }: { component: ManifestComponent }) {
  const contract = component.accessibility;
  const keys = keyboardRows(contract);
  return (
    <>
      <p>{text(CONFORMANCE)}</p>

      <h3>{HEADINGS.semantics}</h3>
      <List items={semanticsItems(contract)} />

      <h3>{HEADINGS.keyboard}</h3>
      {keys.length > 0 ? (
        <Pairs rows={keys.map((k) => ({ key: k.keys, value: text(k.action) }))} />
      ) : (
        <p>{NO_KEYS}</p>
      )}

      <h3>{HEADINGS.focus}</h3>
      <List items={focusItems(contract.focus)} />

      <h3>{HEADINGS.announcements}</h3>
      <ul>
        {announcementItems(contract).map((a) => (
          <li key={a.text}>{text(a.text, a.language)}</li>
        ))}
      </ul>

      <h3>{HEADINGS.wcag}</h3>
      <List items={contract.wcag.map((claim, i) => claimText(manifest, component, claim, i))} />

      <h3>{HEADINGS.adaptation}</h3>
      <Pairs
        rows={adaptationRows(contract.adaptation).map((row) => ({
          key: row.label,
          value: text(row.text),
        }))}
      />

      <h3>{HEADINGS.testRuns}</h3>
      <Pairs
        rows={testRunRows(manifest, component).map((row) => ({
          key: row.id,
          value: (
            <>
              {text(row.text)}
              {row.checks && <List items={row.checks} />}
            </>
          ),
        }))}
      />

      <h3>{HEADINGS.knownIssues}</h3>
      {contract.knownIssues.length > 0 ? (
        <List items={knownIssueItems(contract)} />
      ) : (
        <p>{noKnownIssuesText(contract)}</p>
      )}
    </>
  );
}
