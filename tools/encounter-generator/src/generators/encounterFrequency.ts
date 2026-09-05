// Appendix D, "Building an Encounter" steps B ("Check whether an encounter occurs") and D
// ("Determine why it's here"). These are easy to skip when a UI just always rolls a monster on
// demand, but the book treats them as real, distinct steps: a DM checks Encounter Frequency
// *before* ever touching the monster table, and — once a monster is actually rolled — decides
// why it's here via Encounter Purpose. Both tables live in `encounterMeta.json`, extracted
// straight from Appendix D's "Encounter Frequency" and "Encounter Purpose" sections.
import wildernessData from "../data/generated/wildernessTerrain.json";
import metaData from "../data/generated/encounterMeta.json";
import type { Table } from "../data/generated/types";
import { rollDie } from "../lib/dice";
import { cellText, inRange } from "../lib/rangeTable";

const WILD = wildernessData as unknown as { terrainNameCrossReference: Table };
const META = metaData as unknown as { frequency: Table; purpose: Table };

function stripFootnoteMarks(s: string): string {
  return s.replace(/\\+\*+/g, "").trim();
}

// Encounter Frequency's own broad-term vocabulary (11 rows) is richer than Becoming Lost's (5
// rows) — it already has dedicated "Inhabited" and "Jungle" rows, so Graveyard and Lost World
// resolve directly per the book's note. Only Arctic and Wetlands are a genuine either/or in the
// book ("Arctic ≈ Barren/Mountains"; "Wetlands ≈ River or Ocean, DM's choice") — picked once here
// so the app has one concrete answer rather than asking the DM to choose every time.
const FREQUENCY_FALLBACK: Record<string, string> = {
  Arctic: "Barren",
  Graveyard: "Inhabited",
  "Lost World": "Jungle",
  Wetlands: "Ocean",
};

/** Maps a wilderness terrain-table name (e.g. "Aquatic") to the broad Encounter Frequency /
 * Becoming Lost term (e.g. "River") via the book's own Terrain Name Cross-Reference, falling
 * back to the book's explicit DM's-choice note for the four terrains the cross-reference doesn't
 * cover at all (Arctic, Graveyard, Lost World, Wetlands aren't Terrain Loop members). Shared with
 * `checkBecomingLost` in wildernessEncounter.ts, which layers its own further approximation on
 * top for the broad terms that Becoming Lost's even-sparser table still doesn't have a row for. */
export function broadTermFor(terrain: string): string | null {
  const row = WILD.terrainNameCrossReference.rows.find((r) => {
    const t = cellText(r["Terrain table"]);
    return t === terrain || t.split(" (")[0].trim() === terrain || t.includes(terrain);
  });
  if (row) return cellText(row["Encounter Frequency / Becoming Lost term"]);
  return FREQUENCY_FALLBACK[terrain] ?? null;
}

export interface FrequencyResult {
  occurs: boolean;
  roll: number;
}

/** Dungeon: "at the end of every 2 turns, roll 1d6; a 1 means a Wandering Monster." */
export function checkDungeonFrequency(): FrequencyResult {
  const roll = rollDie(6);
  return { occurs: roll === 1, roll };
}

export interface WildernessFrequencyResult extends FrequencyResult {
  broadTerrain: string | null;
  chanceRaw: string | null;
}

/** Wilderness: "checked once per day by default... roll 1d6; the terrain determines which
 * results trigger an encounter." */
export function checkWildernessFrequency(terrain: string): WildernessFrequencyResult {
  const roll = rollDie(6);
  const broadTerrain = broadTermFor(terrain);
  if (!broadTerrain) return { occurs: false, roll, broadTerrain: null, chanceRaw: null };
  const row = META.frequency.rows.find((r) => stripFootnoteMarks(cellText(r.Terrain)) === broadTerrain);
  const chanceRaw = row ? cellText(row["Chance of Encounter (1d6)"]) : null;
  return { occurs: chanceRaw ? inRange(roll, chanceRaw) : false, roll, broadTerrain, chanceRaw };
}

/** Settlement: checked every 3 turns of street activity, not a die roll — see Encounter
 * Frequency's *Settlement* line. Modeled as a constant rather than a check function so the UI
 * can show the cadence without pretending there's a die involved. */
export const SETTLEMENT_ENCOUNTER_TURNS = 3;

export interface EncounterPurposeResult {
  roll: number;
  purpose: string;
}

/** Step D, "Determine why it's here" — a d8 roll against Encounter Purpose. Applies whenever an
 * actual monster (not a street NPC, not a Lone NPC, not a Castle patrol) has just been rolled. */
export function rollEncounterPurpose(): EncounterPurposeResult {
  const roll = rollDie(8);
  const row = META.purpose.rows.find((r) => cellText(r.d8) === String(roll));
  return { roll, purpose: cellText(row?.Purpose) };
}
