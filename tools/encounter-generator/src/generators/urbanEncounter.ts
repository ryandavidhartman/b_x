// Appendix D, "Urban Encounters": Daytime/Nighttime d% tables. Every "Encounter" cell in these
// tables is plain text in the book (no monster links) — some are 0-level townsfolk resolved via
// the Race/Urban Professions/Red-Light Professions sub-tables named in the notes text, some are
// real monsters (Ghoul, Wererat, Vampire...) named only by prose. Rather than guess which is
// which, this surfaces the roll result's raw notes text as-is (see RollableText in the UI for
// interactively rolling the inline dice inside it) and auto-rolls only the three sub-tables the
// book explicitly names by phrase.
import urbanData from "../data/generated/urbanEncounters.json";
import type { Table } from "../data/generated/types";
import { rollDie, rollSpec, pick } from "../lib/dice";
import { findRowByRoll, inRange, cellText } from "../lib/rangeTable";

const DATA = urbanData as unknown as {
  zeroLevelNpcs: Table;
  race: Table;
  urbanProfessions: Table;
  nobleProfessions: Table;
  redLightProfessions: Table;
  nighttimeEncounters: Table;
  daytimeEncounters: Table;
  urbanEncounterLevel: Table;
};

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
  outOfPlace: string | null; // e.g. "5+" if the party is under that level
  autoSubRolls: SubRoll[];
}

function checkOutOfPlace(encounter: string, partyLevel: number): string | null {
  for (const row of DATA.urbanEncounterLevel.rows) {
    const names = cellText(row["Entries out of place below this level"]).split(",").map((s) => s.trim());
    if (names.some((n) => encounter.includes(n))) {
      const levelRaw = cellText(row["Party Level"]);
      const threshold = parseInt(levelRaw, 10);
      if (partyLevel < threshold) return levelRaw;
    }
  }
  return null;
}

export function rollUrbanEncounter(timeOfDay: TimeOfDay, partyLevel: number): UrbanEncounterResult {
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

  return { timeOfDay, roll, encounter, notes, outOfPlace: checkOutOfPlace(encounter, partyLevel), autoSubRolls };
}
