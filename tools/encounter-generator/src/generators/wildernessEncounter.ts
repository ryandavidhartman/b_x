// Appendix D, "Wilderness Encounters": terrain + party level index straight into that terrain's
// table (see generate-appendix-d-tables.mjs, sourced from Appendix C) for a pre-weighted monster
// pool — no category roll or level-scaled die. A per-terrain Lone NPC Encounters check runs first,
// per the book's own procedure. Number appearing is pulled from the monster's own wilderness
// (lair) No. Appearing figure rather than a table column. Also Becoming Lost, Foraging, and Castle
// Encounters — small book sub-procedures of wilderness travel, not separate settings.
import wildernessData from "../data/generated/wildernessTerrain.json";
import castleData from "../data/generated/castleEncounters.json";
import type { Table } from "../data/generated/types";
import { rollDie, pick } from "../lib/dice";
import { findRowByRoll, cellText, inRange } from "../lib/rangeTable";
import { resolveMonsterLink, type ResolvedMonster } from "../lib/resolveMonster";
import { parseNumberAppearing, rollAppearing } from "../lib/numberAppearing";

const WILD = wildernessData as unknown as {
  terrains: Record<string, Table>;
  loneNpcEncounters: { chanceByTerrain: Table; archetypeRoll: Table };
  becomingLost: Table;
  terrainNameCrossReference: Table;
};
const CASTLE = castleData as unknown as Table;

export const TERRAIN_NAMES = Object.keys(WILD.terrains);

// The book's "Invertebrates" category column reuses plain, unqualified compound references
// (e.g. "Beetle, Giant") on every terrain table, with no structural hint toward a sub-type. Left
// alone, resolveMonsterLink's open-choice pick is uniform across all variants — including
// clearly land-locked ones (Fire/Bombardier Beetle) — even on a terrain that's underwater by
// definition. Bias toward a "Water"-named variant on the terrains where that's actually the
// sensible reading; every other terrain keeps the unbiased random pick.
const WATER_TERRAINS = new Set(["Aquatic", "Marine", "Wetlands"]);

export interface LoneNpcResult {
  roll: number;
  archetype: string;
}

/** Lone NPC Encounters (see the book) — checked before the monster table, per terrain. */
function checkLoneNpc(terrain: string): LoneNpcResult | null {
  const row = WILD.loneNpcEncounters.chanceByTerrain.rows.find((r) => cellText(r.Terrain) === terrain);
  if (!row) return null;
  const roll = rollDie(100);
  if (!inRange(roll, cellText(row["Chance (d%)"]), { percentile: true })) return null;
  const archRoll = rollDie(8);
  const archRow = findRowByRoll(WILD.loneNpcEncounters.archetypeRoll.rows, "1d8", archRoll);
  return { roll, archetype: cellText(archRow?.Archetype) };
}

export interface WildernessEncounterResult {
  terrain: string;
  levelRoll: number;
  resultRaw: string;
  monster: ResolvedMonster | null;
  count: number | null;
  loneNpc: LoneNpcResult | null;
  choiceNote?: string;
  /** Set when the cell's candidate pool was empty at the exact party level and the generator
   * borrowed from the nearest non-empty level(s) instead (e.g. "12" or "8/9/10") — a structural
   * fact baked in at generation time, not a re-derived heuristic. */
  borrowedFromLevel: string | null;
}

const BORROW_RE = /\*\(as Level ([\d/]+)\)\*/;

export function rollWildernessEncounter(terrain: string, partyLevel: number, airborne = false): WildernessEncounterResult {
  const loneNpc = checkLoneNpc(terrain);
  if (loneNpc) {
    return { terrain, levelRoll: partyLevel, resultRaw: loneNpc.archetype, monster: null, count: null, loneNpc, borrowedFromLevel: null };
  }

  const table = WILD.terrains[terrain];
  const row = table.rows.find((r) => cellText(r.Level) === String(partyLevel));
  if (!row) throw new Error(`no ${terrain} row for level ${partyLevel}`);
  const cell = row.Monster;
  const resultRaw = cellText(cell);
  const borrowedFromLevel = resultRaw.match(BORROW_RE)?.[1] ?? null;

  let candidates = cell.links;
  let choiceNote: string | undefined;
  if (airborne) {
    const flying = candidates.filter((l) => {
      const resolved = resolveMonsterLink(l.label, l.anchor);
      return !!(resolved?.stats.Fly || resolved?.stats.Flying);
    });
    if (flying.length > 0) {
      candidates = flying;
    } else {
      choiceNote = "no flying candidate at this level for this terrain — rolled from the full pool instead";
    }
  }

  let monster: ResolvedMonster | null = null;
  if (candidates.length > 0) {
    const chosen = pick(candidates);
    const preferKeyword = WATER_TERRAINS.has(terrain) ? "water" : undefined;
    monster = resolveMonsterLink(chosen.label, chosen.anchor, { preferKeyword });
    choiceNote ??= `picked at random among ${candidates.length} option(s) -> ${chosen.label}`;
  }

  let count: number | null = null;
  if (monster) {
    const appearing = parseNumberAppearing(monster.stats["No. Appearing"] ?? "1");
    count = rollAppearing(appearing.wilderness);
  }

  return { terrain, levelRoll: partyLevel, resultRaw, monster, count, loneNpc: null, choiceNote, borrowedFromLevel };
}

// --- Becoming Lost, Foraging, Castle Encounters ---------------------------------------------

// The book's Becoming Lost table (and Encounter Frequency) uses a shorter, broader terrain
// vocabulary than the 13-terrain wilderness tables; the book gives an explicit cross-reference
// for the four terrains it doesn't cover directly (Arctic, Graveyard, Lost World, Wetlands).
const BROAD_TERRAIN_FALLBACK: Record<string, string> = {
  Arctic: "Mountains, Hills, Barren Lands",
  Graveyard: "Ocean", // book: "Inhabited" broad term isn't itself a Becoming Lost row; closest listed row
  "Lost World": "Woods", // book: "Jungle" isn't itself a Becoming Lost row; closest listed row
  Wetlands: "Ocean",
};

function broadTerrainFor(terrain: string): string | null {
  const direct = WILD.becomingLost.rows.find((r) => cellText(r.Terrain).split(",")[0].trim() === terrain);
  if (direct) return cellText(direct.Terrain);
  const bySubstring = WILD.becomingLost.rows.find((r) => cellText(r.Terrain).includes(terrain));
  if (bySubstring) return cellText(bySubstring.Terrain);
  return BROAD_TERRAIN_FALLBACK[terrain] ?? null;
}

export function checkBecomingLost(terrain: string): { lost: boolean; roll: number; broadTerrain: string | null } {
  const broadTerrain = broadTerrainFor(terrain);
  const roll = rollDie(6);
  if (!broadTerrain) return { lost: false, roll, broadTerrain: null };
  const row = WILD.becomingLost.rows.find((r) => cellText(r.Terrain) === broadTerrain);
  const chanceRaw = cellText(row?.["Chance to Become Lost (1d6)"]);
  const [lo, hi] = chanceRaw.includes("-") ? chanceRaw.split("-").map(Number) : [Number(chanceRaw), Number(chanceRaw)];
  return { lost: roll >= lo && roll <= hi, roll, broadTerrain };
}

export interface ForagingResult {
  roll: number;
  found: boolean;
  feeds: number;
}

export function checkForaging(): ForagingResult {
  const roll = rollDie(6);
  return { roll, found: roll === 1, feeds: roll === 1 ? rollDie(6) : 0 };
}

export interface CastleEncounterResult {
  owner: string;
  level: string;
  patrol: string;
  reactionRoll: number;
  reaction: "Pursue" | "Ignore" | "Friendly";
}

export function rollCastleEncounter(owner?: string): CastleEncounterResult {
  const row = owner ? CASTLE.rows.find((r) => cellText(r.Owner) === owner) ?? pick(CASTLE.rows) : pick(CASTLE.rows);
  const roll = rollDie(6);
  const reaction: CastleEncounterResult["reaction"] = inCol(row, "Pursue", roll)
    ? "Pursue"
    : inCol(row, "Ignore", roll)
      ? "Ignore"
      : "Friendly";
  return { owner: cellText(row.Owner), level: cellText(row.Level), patrol: cellText(row.Patrol), reactionRoll: roll, reaction };
}

function inCol(row: Table["rows"][number], header: string, roll: number): boolean {
  const raw = cellText(row[header]);
  const [lo, hi] = raw.includes("-") ? raw.split("-").map(Number) : [Number(raw), Number(raw)];
  return roll >= lo && roll <= hi;
}

export const CASTLE_OWNERS = CASTLE.rows.map((r) => cellText(r.Owner));
