import { type ReactNode } from "react";

/*
  Markdown-lite renderer for staff-written content (service pages, blog, legal).
  Supports: ## / ### headings, paragraphs, "- " lists, **bold**, *italic*,
  [links](https://…). Builds React elements, so no HTML injection is possible.
*/

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else {
      const [, label, href] = tok.match(/\[([^\]]+)\]\(([^)\s]+)\)/) ?? [];
      const safe = /^(https?:\/\/|\/)/.test(href ?? "") ? href : "#";
      const external = safe.startsWith("http");
      out.push(
        <a key={key} href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
          {label}
        </a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Turns one blank-line-separated block into elements (heading, list or paragraph). */
function renderBlock(lines: string[], key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = lines.filter((l) => l.trim() !== "");
  while (rest.length) {
    const first = rest[0];
    if (first.startsWith("### ") || first.startsWith("## ")) {
      const level = first.startsWith("### ") ? 3 : 2;
      const text = first.slice(level + 1);
      out.push(level === 3 ? <h3 key={`${key}h${out.length}`}>{inline(text, `${key}h`)}</h3> : <h2 key={`${key}h${out.length}`}>{inline(text, `${key}h`)}</h2>);
      rest = rest.slice(1);
      continue;
    }
    if (first.startsWith("- ")) {
      const items: string[] = [];
      while (rest.length && rest[0].startsWith("- ")) {
        items.push(rest[0].slice(2));
        rest = rest.slice(1);
      }
      out.push(
        <ul key={`${key}u${out.length}`}>
          {items.map((it, i) => (
            <li key={i}>{inline(it, `${key}l${i}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    const para: string[] = [];
    while (rest.length && !rest[0].startsWith("- ") && !rest[0].startsWith("## ") && !rest[0].startsWith("### ")) {
      para.push(rest[0]);
      rest = rest.slice(1);
    }
    out.push(<p key={`${key}p${out.length}`}>{inline(para.join(" "), `${key}p`)}</p>);
  }
  return out;
}

export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source) return null;
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return <div className={className ?? "prose-cab"}>{blocks.flatMap((block, bi) => renderBlock(block.split("\n"), `b${bi}`))}</div>;
}
