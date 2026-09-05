// Appendix D, "Dungeon Random Encounters": location subtype + party level index straight into
// that location's table (see generate-appendix-d-tables.mjs, sourced from Appendix C) for a
// pre-weighted monster pool — dungeon level and party level are the same number now, so there's
// no Monster Sub-table Matrix or d12 roll to resolve first. Number appearing is pulled from the
// monster's own dungeon (wandering) No. Appearing figure rather than a table column.
import dungeonData from "../data/generated/dungeonEncounters.json";
import type { Table } from "../data/generated/types";
import { pick } from "../lib/dice";
import { cellText } from "../lib/rangeTable";
import { resolveMonsterLink, type ResolvedMonster } from "../lib/resolveMonster";
import { parseNumberAppearing, rollAppearing } from "../lib/numberAppearing";
import { rollEncounterPurpose, type EncounterPurposeResult } from "./encounterFrequency";

const DATA = dungeonData as unknown as Record<string, Table>;

export const DUNGEON_LOCATION_NAMES = Object.keys(DATA);

export interface DungeonEncounterResult {
  location: string;
  levelRoll: number;
  resultRaw: string;
  monster: ResolvedMonster | null;
  count: number | null;
  choiceNote?: string;
  /** Set when the cell's candidate pool was empty at the exact party level and the generator
   * borrowed from the nearest non-empty level(s) instead (e.g. "12" or "8/9/10") — a structural
   * fact baked in at generation time, not a re-derived heuristic. */
  borrowedFromLevel: string | null;
  /** Step D, "Determine why it's here" — rolled automatically whenever a real monster comes up. */
  purpose: EncounterPurposeResult | null;
}

const BORROW_RE = /\*\(as Level ([\d/]+)\)\*/;

export function rollDungeonEncounter(location: string, partyLevel: number): DungeonEncounterResult {
  const table = DATA[location];
  const row = table.rows.find((r) => cellText(r.Level) === String(partyLevel));
  if (!row) throw new Error(`no ${location} row for level ${partyLevel}`);
  const cell = row.Monster;
  const resultRaw = cellText(cell);
  const borrowedFromLevel = resultRaw.match(BORROW_RE)?.[1] ?? null;

  let monster: ResolvedMonster | null = null;
  let choiceNote: string | undefined;
  if (cell.links.length > 0) {
    const chosen = pick(cell.links);
    monster = resolveMonsterLink(chosen.label, chosen.anchor);
    choiceNote = `picked at random among ${cell.links.length} option(s) -> ${chosen.label}`;
  }

  let count: number | null = null;
  let purpose: EncounterPurposeResult | null = null;
  if (monster) {
    const appearing = parseNumberAppearing(monster.stats["No. Appearing"] ?? "1");
    count = rollAppearing(appearing.dungeon);
    purpose = rollEncounterPurpose();
  }

  return { location, levelRoll: partyLevel, resultRaw, monster, count, choiceNote, borrowedFromLevel, purpose };
}
