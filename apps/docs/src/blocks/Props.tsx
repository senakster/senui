import type { ManifestComponent, ManifestForbidden, ManifestProp } from './manifest';
import { useId } from 'react';
import { Inline } from './Inline';
import { siteHref } from './manifest';
import { ScrollRegion } from './ScrollRegion';
import {
  HEADINGS,
  NO_OWN_PROPS,
  axisHeading,
  branchNotes,
  code,
  nativeText,
  propCells,
} from '../../../../packages/react/scripts/docs/wording.mjs';

const text = (value: string) => <Inline text={value} href={siteHref} />;

/**
 * A data table that scrolls inside its own region at narrow widths. Its caption names the region;
 * it is visually hidden because the heading above says the same.
 */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly [string, ...string[]])[];
}) {
  const id = useId();
  return (
    <ScrollRegion labelledBy={id}>
      <table className="docs-table">
        <caption id={id} className="docs-visually-hidden">
          {text(caption)}
        </caption>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([first, ...rest]) => (
            <tr key={first}>
              <th scope="row">{text(first)}</th>
              {rest.map((cell, i) => (
                // Cells repeat ('optional'), so the column makes the key.
                <td key={head[i + 1]}>{text(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

const PROP_HEAD = ['Prop', 'Required', 'Type', 'Default', 'Description'] as const;

function propRow(p: ManifestProp): [string, ...string[]] {
  const cells = propCells(p);
  return [cells.name, cells.required, cells.type, cells.default ?? '', cells.description];
}

function forbiddenRow(f: ManifestForbidden): [string, ...string[]] {
  return [code(f.name), f.useInstead];
}

/**
 * Props per axis and branch (L09 "Props"): the props every use accepts, the ones no use accepts,
 * then each union of prop sets, with each branch as a heading labelled by its summary and its own
 * table. No tabs and no widgets: every branch is on the page.
 */
export function Props({ component }: { component: ManifestComponent }) {
  return (
    <>
      <p>{text(nativeText(component))}</p>
      <h3>{HEADINGS.everyUse}</h3>
      {component.props.length > 0 ? (
        <DataTable
          caption={`${component.name} props: every use`}
          head={PROP_HEAD}
          rows={component.props.map(propRow)}
        />
      ) : (
        <p>{NO_OWN_PROPS}</p>
      )}
      {component.forbidden.length > 0 && (
        <>
          <h3>{HEADINGS.notAccepted}</h3>
          <DataTable
            caption={`${component.name} props: not accepted`}
            head={['Prop', 'Use instead']}
            rows={component.forbidden.map(forbiddenRow)}
          />
        </>
      )}
      {component.axes.map((axis) => (
        <section key={axis.name} className="docs-axis">
          <h3>{axisHeading(axis)}</h3>
          {axis.description && <p>{text(axis.description)}</p>}
          {axis.branches.map((branch) => {
            const notes = branchNotes(branch);
            return (
              <div key={branch.summary} className="docs-branch">
                <h4>{text(branch.summary)}</h4>
                {branch.props.length > 0 && (
                  <DataTable
                    caption={`${axis.name}: ${branch.summary}`}
                    head={PROP_HEAD}
                    rows={branch.props.map(propRow)}
                  />
                )}
                {notes.length > 0 && (
                  <ul>
                    {notes.map((note) => (
                      <li key={note}>{text(note)}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
