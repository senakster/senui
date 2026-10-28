import { Fragment, type ReactNode } from 'react';

// The docs' published strings use two kinds of Markdown, inline code and links, and nothing else
// (L09 decision 8, enforced by published-text.ts). This renders exactly those, so a docs page shows
// the same string the Markdown files publish.
const TOKEN = /`([^`]*)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Double quotes mark verbatim speech (ADR-0019); `lang` marks each quoted span with its language. */
const QUOTED = /"([^"]+)"/g;

function speech(text: string, lang: string | undefined, key: string): ReactNode {
  if (!lang) return text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(QUOTED)) {
    out.push(text.slice(last, match.index));
    out.push(
      <Fragment key={`${key}-${String(match.index)}`}>
        &quot;<span lang={lang}>{match[1]}</span>&quot;
      </Fragment>,
    );
    last = match.index + match[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export interface InlineProps {
  /** A published string: plain text, inline code and links. */
  text: string;
  /** The language of the speech the text quotes, when it quotes any (an announcement's `language`). */
  lang?: string | undefined;
  /** Turns a link target into the href to render; links to other docs pages differ on the site. */
  href?: (target: string) => { href: string; top?: boolean };
}

/** One published string, rendered: inline code as `<code>`, links as `<a>`, quoted speech marked. */
export function Inline({ text, lang, href = (target) => ({ href: target }) }: InlineProps) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = String(match.index);
    out.push(speech(text.slice(last, match.index), lang, `t${at}`));
    const [, codeText, linkText, target] = match;
    if (codeText !== undefined) {
      out.push(<code key={`c${at}`}>{codeText}</code>);
    } else if (linkText !== undefined && target !== undefined) {
      const link = href(target);
      out.push(
        <a key={`a${at}`} href={link.href} {...(link.top ? { target: '_top' } : {})}>
          <Inline text={linkText} lang={lang} href={href} />
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  out.push(speech(text.slice(last), lang, 'end'));
  return <>{out}</>;
}
