import { rollDie, lookup } from "@shared/index";
import {
  RANDOM_TRAP_TABLE,
  ENVIRONMENTAL_HAZARDS,
  TRICK_OBJECT_TABLE,
  TRICK_ATTRIBUTE_TABLE,
  HAZARD_COLUMNS,
  type HazardColumn,
  type Severity,
} from "../data/traps";

/** Appendix E's Trap Placement table: a default severity by dungeon level and whether the trap
 * guards real treasure, formalizing the book's own qualitative guidance ("a trap for a level 1
 * party ... should be a nuisance ... a level 16 party protecting a dragon's hoard ... should be
 * fatal") into brackets a DM can override. */
export function pickSeverityForPartyLevel(partyLevel: number, hasTreasure: boolean): Severity {
  const bracket = partyLevel <= 2 ? 0 : partyLevel <= 5 ? 1 : partyLevel <= 7 ? 2 : 3;
  const noTreasure: Severity[] = ["Nuisance", "Hazardous", "Dangerous", "Fatal"];
  const withTreasure: Severity[] = ["Hazardous", "Dangerous", "Fatal", "Fatal"];
  return hasTreasure ? withTreasure[bracket] : noTreasure[bracket];
}

export interface TrapRoll {
  roll: number;
  type: string;
}

export function rollTrap(): TrapRoll {
  const roll = rollDie(100);
  return { roll, type: lookup(roll, RANDOM_TRAP_TABLE) };
}

export interface HazardEntry {
  column: HazardColumn;
  roll: number;
  effect: string;
}

/** Roll one column for a single-effect hazard, or several (the book allows 2-3) for a combined,
 * worse hazard. */
export function rollHazard(columns: HazardColumn[] = HAZARD_COLUMNS): HazardEntry[] {
  return columns.map((column) => {
    const roll = rollDie(12);
    return { column, roll, effect: ENVIRONMENTAL_HAZARDS[column][roll - 1] };
  });
}

export interface TrickRoll {
  objectRoll: number;
  object: string;
  attributeRoll: number;
  attribute: string;
}

export function rollTrick(): TrickRoll {
  const objectRoll = rollDie(100);
  const attributeRoll = rollDie(100);
  return {
    objectRoll,
    object: lookup(objectRoll, TRICK_OBJECT_TABLE),
    attributeRoll,
    attribute: TRICK_ATTRIBUTE_TABLE[attributeRoll - 1],
  };
}
