// Core dice + percentile-table rolling engine shared by every Appendix B generator.

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function rollDice(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

/** A dice expression, either a fixed integer or notation like "5d6", "4d6x10", or "1d4+6"/"1d6-1"
 * (this book's NPC-party and monster-count tables lean heavily on +/- modifiers, unlike
 * Appendix B's own tables — this copy of dice.ts has diverged from treasure-generator's for
 * that reason). */
export type DiceSpec = number | string;

const NOTATION = /^(\d+)d(\d+)(?:x(\d+))?([+-]\d+)?$/i;

export function rollSpec(spec: DiceSpec): number {
  if (typeof spec === "number") return spec;
  const m = spec.trim().match(NOTATION);
  if (!m) throw new Error(`bad dice notation: ${spec}`);
  const count = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const mult = m[3] ? parseInt(m[3], 10) : 1;
  const modifier = m[4] ? parseInt(m[4], 10) : 0;
  return rollDice(count, sides) * mult + modifier;
}

/** A row in a percentile/dN lookup table. max is inclusive; use 100 in place of "00". */
export interface RangeEntry<T> {
  min: number;
  max: number;
  value: T;
}

/**
 * Build a range table from ["01-20", value] rows. A single number ("95") is
 * treated as a one-wide range. Ranges ending "00" should be written as the
 * table's ceiling (e.g. "98-100") rather than "00".
 */
export function table<T>(rows: [string, T][]): RangeEntry<T>[] {
  return rows.map(([range, value]) => {
    const m = range.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`bad table range: ${range}`);
    const min = parseInt(m[1], 10);
    const max = m[2] ? parseInt(m[2], 10) : min;
    return { min, max, value };
  });
}

export function lookup<T>(roll: number, rows: RangeEntry<T>[]): T {
  const entry = rows.find((e) => roll >= e.min && roll <= e.max);
  if (!entry) throw new Error(`roll ${roll} not covered by table`);
  return entry.value;
}

/** Roll dN (default d100) and resolve it against a range table. */
export function rollTable<T>(rows: RangeEntry<T>[], sides = 100): T {
  return lookup(rollDie(sides), rows);
}

export function chance(percent: number): boolean {
  return rollDie(100) <= percent;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
