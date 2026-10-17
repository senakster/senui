import { tokens, type Token } from '@senakster/tokens';
import './token-tables.css';

const all = Object.entries<Token>(tokens);
const groups = [...new Set(all.map(([key]) => key.split('.')[0] ?? key))];

function Value({ token, theme }: { token: Token; theme: 'light' | 'dark' }) {
  const value = theme === 'dark' ? (token.dark ?? token.value) : token.value;
  return (
    <td data-theme={theme}>
      {token.type === 'color' && (
        <span className="docs-swatch" style={{ background: `var(${token.cssVar})` }} />
      )}
      <code>{value}</code>
    </td>
  );
}

function Table({ rows }: { rows: [string, Token][] }) {
  return (
    <table className="docs-tokens sb-unstyled" data-theme="light">
      <thead>
        <tr>
          <th scope="col">Custom property</th>
          <th scope="col">Light</th>
          <th scope="col">Dark</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, token]) => (
          <tr key={key}>
            <th scope="row">
              <code>{token.cssVar}</code>
              {token.description && <p>{token.description}</p>}
            </th>
            <Value token={token} theme="light" />
            <Value token={token} theme="dark" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every public token, one table per top-level group, rendered in both themes. */
export function TokenTables() {
  if (all.length === 0) return <p>No tokens have been defined yet.</p>;
  return (
    <>
      {groups.map((group) => (
        <section key={group}>
          <h2>{group}</h2>
          <Table rows={all.filter(([key]) => key.split('.')[0] === group)} />
        </section>
      ))}
    </>
  );
}

/** Tokens that change under `prefers-reduced-motion: reduce`. */
export function ReducedMotionTable() {
  const rows = all.filter(([, token]) => token.reducedMotion !== undefined);
  if (rows.length === 0) return <p>No token changes under reduced motion yet.</p>;
  return (
    <table className="docs-tokens sb-unstyled" data-theme="light">
      <thead>
        <tr>
          <th scope="col">Custom property</th>
          <th scope="col">Default</th>
          <th scope="col">Reduced motion</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, token]) => (
          <tr key={key}>
            <th scope="row">
              <code>{token.cssVar}</code>
            </th>
            <td>
              <code>{token.value}</code>
            </td>
            <td>
              <code>{token.reducedMotion}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
