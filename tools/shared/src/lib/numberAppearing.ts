// Parses a stat block's "No. Appearing" figure, e.g. "1d4 (1d4)", "0 (10d4)", "1-6 (2-12)",
// "0 (special)", or a lone figure with no wilderness parenthetical. The dungeon figure comes
// first, the wilderness (lair) figure in parentheses — see the book's own glossary entry for
// No. Appearing.
import { rollSpec } from "./dice";

export type AppearingSpec =
  | { kind: "dice"; raw: string; diceSpec: string }
  | { kind: "range"; raw: string; min: number; max: number }
  | { kind: "fixed"; raw: string; value: number }
  | { kind: "special"; raw: string };

export interface NumberAppearing {
  dungeon: AppearingSpec;
  wilderness: AppearingSpec;
}

/** Parses a single count figure — also used directly for dungeon table "#" columns, which
 * aren't wrapped in the dungeon/wilderness "X (Y)" pair that full stat-block figures use. */
export function parseCountSpec(raw: string): AppearingSpec {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return { kind: "fixed", raw: s, value: parseInt(s, 10) };
  if (/^\d+d\d+(x\d+)?$/i.test(s)) return { kind: "dice", raw: s, diceSpec: s };
  const range = s.match(/^(\d+)\s*(?:-|or)\s*(\d+)$/i);
  if (range) return { kind: "range", raw: s, min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  return { kind: "special", raw: s };
}

export function parseNumberAppearing(raw: string): NumberAppearing {
  const m = raw.trim().match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return { dungeon: parseCountSpec(m[1]), wilderness: parseCountSpec(m[2]) };
  const only = parseCountSpec(raw);
  return { dungeon: only, wilderness: only };
}

/** Rolls a figure. Ranges are treated as a flat uniform roll across [min,max] (the book writes
 * these as a compact alternative to dice notation, e.g. "2-12" rather than spelling out 2d6). */
export function rollAppearing(spec: AppearingSpec): number {
  switch (spec.kind) {
    case "fixed":
      return spec.value;
    case "dice":
      return rollSpec(spec.diceSpec);
    case "range":
      return spec.min + Math.floor(Math.random() * (spec.max - spec.min + 1));
    case "special":
      return 1;
  }
}
