import { useState } from "react";
import { rollSpec } from "../lib/dice";

// Renders raw book prose (Urban notes, Points of Interest development text, dungeon-table
// notes...) with every inline dice expression turned into a clickable chip that rolls it in
// place. This is the deliberate alternative to fully mechanizing irregular branching text like
// "(1-4) foppish dandy and 1d4 sycophants; (5-6) gentlewoman; (7-10)..." — the clean tabular
// parts are resolved by the generator, and the DM rolls the messy inline dice by hand, in view.
const DICE_RE = /\b(\d*d\d+(?:[+-]\d+)?)\b/gi;

function DiceChip({ spec }: { spec: string }) {
  const [result, setResult] = useState<number | null>(null);
  return (
    <span className="dice-chip">
      <code>{spec}</code>
      <button type="button" onClick={() => setResult(rollSpec(spec.toLowerCase().startsWith("d") ? `1${spec}` : spec))}>
        roll
      </button>
      {result !== null && <span className="result">{result}</span>}
    </span>
  );
}

export function RollableText({ text }: { text: string }) {
  if (!text) return null;
  const parts: (string | { spec: string })[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(DICE_RE)) {
    if (m.index === undefined) continue;
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push({ spec: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <span>
      {parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <DiceChip key={i} spec={p.spec} />))}
    </span>
  );
}
