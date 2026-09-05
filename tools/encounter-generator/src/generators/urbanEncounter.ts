// Appendix D, "Urban Encounters": two things live here now.
//
// 1. Daytime/Nighttime d% tables — purely street-life color (Beggar, Watchman, Merchant, a drunk,
//    a press gang...). Every "Encounter" cell is plain text in the book (no monster links); some
//    resolve further via the Race/Urban Professions/Red-Light Professions sub-tables named in the
//    notes text. See RollableText in the UI for interactively rolling the inline dice inside it.
// 2. Urban/Castle monster tables — same Level|Monster shape as the wilderness terrain tables (see
//    generate-appendix-d-tables.mjs and wildernessEncounter.ts), for when the party actually meets
//    a real monster rather than a street NPC. Party level indexes the row directly.
import urbanData from "../data/generated/urbanEncounters.json";
import urbanLocationsData from "../data/generated/urbanLocations.json";
import type { Table } from "../data/generated/types";
import { rollDie, rollSpec, pick } from "../lib/dice";
import { findRowByRoll, inRange, cellText } from "../lib/rangeTable";
import { resolveMonsterLink, type ResolvedMonster } from "../lib/resolveMonster";
import { parseNumberAppearing, rollAppearing } from "../lib/numberAppearing";
import { rollEncounterPurpose, type EncounterPurposeResult } from "./encounterFrequency";

const DATA = urbanData as unknown as {
  zeroLevelNpcs: Table;
  race: Table;
  urbanProfessions: Table;
  nobleProfessions: Table;
  redLightProfessions: Table;
  nighttimeEncounters: Table;
  daytimeEncounters: Table;
};
const LOCATIONS = urbanLocationsData as unknown as Record<"Urban" | "Castle", Table>;
export const URBAN_LOCATION_NAMES = Object.keys(LOCATIONS) as Array<"Urban" | "Castle">;

export type TimeOfDay = "day" | "night";

/** Several sub-tables repeat a "d% | Result" column pair side-by-side to save page space (the
 * extraction script disambiguates the repeat as "d%__2" / "Result__2"). Flatten every such pair
 * into one range list, percentile-normalized, and roll once against the combined set. */
function rollPairedPercentileTable(table: Table, rangeHeaderBase: string, resultHeaderBase: string): string {
  const pairSuffixes = table.headers.filter((h) => h === rangeHeaderBase || h.startsWith(`${rangeHeaderBase}__`)).map((h) => h.slice(rangeHeaderBase.length));
  const roll = rollDie(100);
  for (const row of table.rows) {
    for (const suffix of pairSuffixes) {
      const range = cellText(row[`${rangeHeaderBase}${suffix}`]);
      const value = cellText(row[`${resultHeaderBase}${suffix}`]);
      if (range && value && inRange(roll, range, { percentile: true })) return value;
    }
  }
  return "";
}

export function rollRace(): string {
  return rollPairedPercentileTable(DATA.race, "d%", "Race");
}

export function rollUrbanProfession(): string {
  return rollPairedPercentileTable(DATA.urbanProfessions, "d%", "Profession");
}

export function rollRedLightProfession(): string {
  return rollPairedPercentileTable(DATA.redLightProfessions, "d%", "Profession");
}

export function rollNobleProfession(): { class: string; level: number } {
  const row = findRowByRoll(DATA.nobleProfessions.rows, "d%", rollDie(100), { percentile: true });
  const levelRaw = cellText(row?.Level);
  return { class: cellText(row?.Class), level: /^\d+$/.test(levelRaw) ? parseInt(levelRaw, 10) : rollSpec(levelRaw) };
}

export interface ZeroLevelType {
  type: string;
  hp: number;
  combatAbility: string;
  examples: string;
}

/** No roll column in the book — these five activity tiers are picked, not rolled against a die,
 * wherever a Daytime/Nighttime result calls for an unnamed 0-level NPC. */
export function pickZeroLevelType(): ZeroLevelType {
  const row = pick(DATA.zeroLevelNpcs.rows);
  return { type: cellText(row.Type), hp: rollSpec(cellText(row.hp)), combatAbility: cellText(row["Combat Ability"]), examples: cellText(row.Examples) };
}

export interface SubRoll {
  table: string;
  result: string;
}

export interface UrbanEncounterResult {
  timeOfDay: TimeOfDay;
  roll: number;
  encounter: string;
  notes: string;
  autoSubRolls: SubRoll[];
}

export function rollUrbanEncounter(timeOfDay: TimeOfDay): UrbanEncounterResult {
  const table = timeOfDay === "day" ? DATA.daytimeEncounters : DATA.nighttimeEncounters;
  const roll = rollDie(100);
  const row = findRowByRoll(table.rows, "d%", roll, { percentile: true });
  if (!row) throw new Error(`no ${timeOfDay} row for roll ${roll}`);
  const encounter = cellText(row.Encounter);
  const notes = cellText(row["# Encountered & Notes"]);

  const autoSubRolls: SubRoll[] = [];
  if (notes.includes("Race sub-table")) autoSubRolls.push({ table: "Race", result: rollRace() });
  if (notes.includes("Urban Professions sub-table")) autoSubRolls.push({ table: "Urban Professions", result: rollUrbanProfession() });
  if (notes.includes("Red-Light Professions sub-table")) autoSubRolls.push({ table: "Red-Light Professions", result: rollRedLightProfession() });

  return { timeOfDay, roll, encounter, notes, autoSubRolls };
}

export interface UrbanMonsterEncounterResult {
  location: "Urban" | "Castle";
  levelRoll: number;
  resultRaw: string;
  monster: ResolvedMonster | null;
  count: number | null;
  choiceNote?: string;
  borrowedFromLevel: string | null;
  /** Step D, "Determine why it's here" — rolled automatically whenever a real monster comes up. */
  purpose: EncounterPurposeResult | null;
}

const BORROW_RE = /\*\(as Level ([\d/]+)\)\*/;

/** A real monster encounter in town or at a stronghold, as opposed to the street-life color of
 * rollUrbanEncounter — same level-pool mechanism as the wilderness terrain tables. */
export function rollUrbanMonsterEncounter(location: "Urban" | "Castle", partyLevel: number): UrbanMonsterEncounterResult {
  const table = LOCATIONS[location];
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
    count = rollAppearing(appearing.wilderness);
    purpose = rollEncounterPurpose();
  }

  return { location, levelRoll: partyLevel, resultRaw, monster, count, choiceNote, borrowedFromLevel, purpose };
}
