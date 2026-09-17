// Renders the tiny `**bold**` / `*italic*` markup generators/narrate.ts produces — not a general
// Markdown renderer, just the two spans that show up in generated prose (a monster/feature name
// bolded, a named magic item italicized), matching how the reference module pages typeset them.
import type { ReactNode } from "react";

export function InlineMarkdown({ text }: { text: string }) {
  const token = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = token.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) parts.push(<strong key={key++}>{match[1]}</strong>);
    else parts.push(<em key={key++}>{match[2]}</em>);
    lastIndex = token.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}
