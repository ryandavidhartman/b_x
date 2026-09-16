// Range parsing for the book's compact "01-20" / "95" / "16+" notation, matching how the
// generated table cells store roll ranges as raw strings. Percentile tables ("d%") write
// their wraparound as "00" rather than "100" (e.g. "61-00" means 61-100) — pass
// `percentile: true` for those.

import type { Cell, Row } from "../data/generated/types";

export interface Range {
  min: number;
  max: number;
}

export function parseRange(raw: string, opts: { percentile?: boolean } = {}): Range {
  const s = raw.trim();

  const plus = s.match(/^(\d+)\+$/);
  if (plus) return { min: parseInt(plus[1], 10), max: Infinity };

  const range = s.match(/^(\d+)-(\d+)$/);
  if (range) {
    const min = parseInt(range[1], 10);
    let max = parseInt(range[2], 10);
    if (opts.percentile && max === 0) max = 100;
    return { min, max };
  }

  const single = s.match(/^(\d+)$/);
  if (single) {
    let v = parseInt(single[1], 10);
    if (opts.percentile && v === 0) v = 100;
    return { min: v, max: v };
  }

  throw new Error(`unparseable range: "${raw}"`);
}

export function inRange(roll: number, raw: string, opts?: { percentile?: boolean }): boolean {
  const { min, max } = parseRange(raw, opts);
  return roll >= min && roll <= max;
}

/** Find the row whose value in `rollColumn` covers `roll`. */
export function findRowByRoll(rows: Row[], rollColumn: string, roll: number, opts?: { percentile?: boolean }): Row | undefined {
  return rows.find((row) => inRange(roll, row[rollColumn].raw, opts));
}

export function cellText(cell: Cell | undefined): string {
  return cell?.raw ?? "";
}
