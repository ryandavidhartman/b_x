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
import { rollEncounterPurpose, broadTermFor, type EncounterPurposeResult } from "./encounterFrequency";

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
  /** Step D, "Determine why it's here" — rolled automatically whenever a real monster comes up
   * (not for a Lone NPC result, which is its own kind of encounter). */
  purpose: EncounterPurposeResult | null;
}

const BORROW_RE = /\*\(as Level ([\d/]+)\)\*/;

export function rollWildernessEncounter(terrain: string, partyLevel: number, airborne = false): WildernessEncounterResult {
  const loneNpc = checkLoneNpc(terrain);
  if (loneNpc) {
    return { terrain, levelRoll: partyLevel, resultRaw: loneNpc.archetype, monster: null, count: null, loneNpc, borrowedFromLevel: null, purpose: null };
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
  let purpose: EncounterPurposeResult | null = null;
  if (monster) {
    const appearing = parseNumberAppearing(monster.stats["No. Appearing"] ?? "1");
    count = rollAppearing(appearing.wilderness);
    purpose = rollEncounterPurpose();
  }

  return { terrain, levelRoll: partyLevel, resultRaw, monster, count, loneNpc: null, choiceNote, borrowedFromLevel, purpose };
}

// --- Becoming Lost, Foraging, Castle Encounters ---------------------------------------------

// Becoming Lost's own table has only 5 broad rows (Clear/Grasslands, Woods, Mountains/Hills/
// Barren Lands, Desert, Ocean) — narrower even than Encounter Frequency's 11-row vocabulary that
// `broadTermFor` resolves to. So on top of the four terrains that aren't Terrain Loop members at
// all (Arctic, Graveyard, Lost World, Wetlands, already folded into `broadTermFor`'s own
// fallback), Becoming Lost also has no row for River (Aquatic), Inhabited (Rural), or Jungle —
// see the book's own note under *Terrain Name Cross-Reference* for these further approximations.
const BECOMING_LOST_EXTRA_FALLBACK: Record<string, string> = {
  River: "Ocean",
  Inhabited: "Clear, Grasslands",
  Jungle: "Woods",
};

function broadTerrainFor(terrain: string): string | null {
  const broadTerm = broadTermFor(terrain);
  if (!broadTerm) return null;
  const row = WILD.becomingLost.rows.find((r) => cellText(r.Terrain).includes(broadTerm));
  if (row) return cellText(row.Terrain);
  return BECOMING_LOST_EXTRA_FALLBACK[broadTerm] ?? null;
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
