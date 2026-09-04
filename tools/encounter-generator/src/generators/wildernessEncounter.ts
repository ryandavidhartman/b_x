// Appendix D, "Wilderness Encounters": terrain -> d% category -> a level-scaled die against that
// terrain's table -> monster, with its number pulled from the monster's own wilderness (lair)
// No. Appearing figure rather than a table column. Also Becoming Lost, Foraging, and Castle
// Encounters — small book sub-procedures of wilderness travel, not separate settings.
import wildernessData from "../data/generated/wildernessTerrain.json";
import castleData from "../data/generated/castleEncounters.json";
import dinosaurData from "../data/generated/dinosaurSubtable.json";
import type { Table } from "../data/generated/types";
import { rollDie, pick } from "../lib/dice";
import { findRowByRoll, cellText } from "../lib/rangeTable";
import { resolveMonsterLink, type ResolvedMonster } from "../lib/resolveMonster";
import { parseNumberAppearing, rollAppearing } from "../lib/numberAppearing";
import { pickLinkFromCell } from "../lib/cellChoice";
import { checkPowerMismatch, type PartyLevelBand } from "../lib/powerLevel";
import { rollNpcParty, type Archetype } from "./npcParty";

export type { PartyLevelBand };

const WILD = wildernessData as unknown as {
  categorySummary: Table;
  terrains: Record<string, Table>;
  encounterLevel: Table;
  becomingLost: Table;
  terrainNameCrossReference: Table;
};
const CASTLE = castleData as unknown as Table;
const DINOSAUR = dinosaurData as unknown as { main: Table; subTables: Record<string, Table> };

export const TERRAIN_NAMES = Object.keys(WILD.terrains);

// The book's "Invertebrates" category column reuses plain, unqualified compound references
// (e.g. "Beetle, Giant") on every terrain table, with no structural hint toward a sub-type. Left
// alone, resolveMonsterLink's open-choice pick is uniform across all variants — including
// clearly land-locked ones (Fire/Bombardier Beetle) — even on a terrain that's underwater by
// definition. Bias toward a "Water"-named variant on the terrains where that's actually the
// sensible reading; every other terrain keeps the unbiased random pick.
const WATER_TERRAINS = new Set(["Aquatic", "Marine", "Wetlands"]);

const CATEGORY_ORDER = [
  "Airborne", "Animal", "Dragon", "Giant", "Human/Demi-Human", "Humanoid",
  "Monster", "NPC", "Undead", "Invertebrates", "Water", "Special",
];

function levelDie(band: PartyLevelBand): number {
  if (band === "1-3") return 8;
  if (band === "4-6") return 14;
  return 20;
}

export interface WildernessEncounterResult {
  terrain: string;
  category: string;
  levelRoll: number;
  resultRaw: string;
  monster: ResolvedMonster | null;
  count: number | null;
  npcParty: ReturnType<typeof rollNpcParty> | null;
  dinosaur: { subCategory: string; era: string } | null;
  choiceNote?: string;
  /** The party-level band this result is actually appropriate for, when it exceeds the party's
   * current band (see src/lib/powerLevel.ts) — e.g. Dragon/Giant categories are gated by how
   * rarely they're rolled at all, not by row, so this can still fire even on a "clean" roll. */
  outOfPlace: PartyLevelBand | null;
}

export function rollWildernessEncounter(terrain: string, partyLevel: PartyLevelBand, airborne = false): WildernessEncounterResult {
  const category = airborne ? "Airborne" : resolveCategory(terrain);
  const terrainTable = WILD.terrains[terrain];
  const categoryIdx = CATEGORY_ORDER.indexOf(category);
  const columnHeader = terrainTable.headers[1 + categoryIdx]; // headers[0] is the roll column

  const levelRoll = rollDie(levelDie(partyLevel));
  const row = findRowByRoll(terrainTable.rows, terrainTable.headers[0], levelRoll);
  if (!row) throw new Error(`no ${terrain} row for roll ${levelRoll}`);

  const cell = row[columnHeader];
  const resultRaw = cellText(cell);

  let monster: ResolvedMonster | null = null;
  let count: number | null = null;
  let npcParty: ReturnType<typeof rollNpcParty> | null = null;
  let dinosaur: { subCategory: string; era: string } | null = null;
  let choiceNote: string | undefined;

  if (resultRaw.startsWith("NPC Party")) {
    npcParty = rollNpcParty(pick<Archetype>(["Basic Adventurers", "Expert Adventurers", "High-Level Cleric", "High-Level Fighter", "High-Level Magic-User"]), { inWilderness: true });
  } else if (resultRaw.startsWith("Dinosaur")) {
    const mainRoll = rollDie(8);
    const mainRow = findRowByRoll(DINOSAUR.main.rows, "1d8", mainRoll);
    const subCategory = cellText(mainRow?.Result);
    const subTable = DINOSAUR.subTables[subCategory];
    if (subTable) {
      const subRow = pick(subTable.rows);
      const link = subRow.Result.links[0];
      if (link) monster = resolveMonsterLink(link.label, link.anchor);
      dinosaur = { subCategory, era: cellText(subRow.Era) };
    }
  } else if (cell.links.length > 0) {
    const choice = pickLinkFromCell(cell);
    choiceNote = choice.note;
    if (choice.chosenLink) {
      const preferKeyword = WATER_TERRAINS.has(terrain) ? "water" : undefined;
      monster = resolveMonsterLink(choice.chosenLink.label, choice.chosenLink.anchor, { preferKeyword });
    }
  }

  if (monster) {
    const appearing = parseNumberAppearing(monster.stats["No. Appearing"] ?? "1");
    count = rollAppearing(appearing.wilderness);
  }

  const outOfPlace = monster ? checkPowerMismatch(monster.stats["Hit Dice"], partyLevel) : null;

  return { terrain, category, levelRoll, resultRaw, monster, count, npcParty, dinosaur, choiceNote, outOfPlace };
}

function resolveCategory(terrain: string): string {
  const row = WILD.categorySummary.rows.find((r) => cellText(r.Terrain) === terrain);
  if (!row) return "Monster";
  const roll = rollDie(100);
  for (const category of CATEGORY_ORDER) {
    if (findRowByRoll([row], category, roll, { percentile: true })) return category;
  }
  return "Special";
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
