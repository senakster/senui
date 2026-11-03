import { Button } from '@senakster/senui';
import { useId, useState } from 'react';
import { Inline } from '../blocks/Inline';
import { docLink, manifest, siteHref } from '../blocks/manifest';
import { CodeBlock, ScrollRegion } from '../blocks/ScrollRegion';
import { reducedMotionText } from '../../../../packages/react/scripts/docs/wording.mjs';
import exampleCss from './motion-example.css?raw';
import './motion-example.css';

const text = (value: string) => <Inline text={value} href={siteHref} />;

const sentence = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}.`;

/**
 * What reduced motion does to each component, generated from the contracts in the manifest (L11):
 * the same words as each component's Adaptation row, and the contract values behind them.
 */
export function ReducedMotionByComponent() {
  const id = useId();
  const components = Object.values(manifest.components).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    <div className="docs-mdx-block sb-unstyled">
      <ScrollRegion labelledBy={id}>
        <table className="docs-table">
          <caption id={id} className="docs-visually-hidden">
            What reduced motion does to each component
          </caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Contract value</th>
              <th scope="col">Under reduced motion</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => {
              const adaptation = component.accessibility.adaptation;
              const values = adaptation.essentialMotion
                ? `\`${adaptation.reducedMotion}\`, with essential motion \`${adaptation.essentialMotion}\``
                : `\`${adaptation.reducedMotion}\``;
              return (
                <tr key={component.name}>
                  <th scope="row">{text(docLink(component.name))}</th>
                  <td>{text(values)}</td>
                  <td>{text(sentence(reducedMotionText(adaptation)))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>
    </div>
  );
}

/** The consumer example's stylesheet, exactly as the live example below runs it. */
export function MotionExampleCode() {
  return (
    <div className="docs-mdx-block sb-unstyled">
      <CodeBlock code={exampleCss.trimEnd()} />
    </div>
  );
}

/** The consumer example, live: a panel that enters with `motion-example.css`. */
export function MotionExample() {
  const [shown, setShown] = useState(false);
  return (
    <div className="docs-mdx-block sb-unstyled" data-docs-motion-example="">
      <Button
        variant="secondary"
        aria-expanded={shown}
        onClick={() => {
          setShown(!shown);
        }}
      >
        Show the panel
      </Button>
      {shown && (
        <div className="app-panel">
          The panel slid up as it faded in, unless motion is reduced; then it only faded.
        </div>
      )}
    </div>
  );
}
