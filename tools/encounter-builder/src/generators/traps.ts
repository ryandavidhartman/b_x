import { rollDie, lookup } from "@shared/index";
import {
  RANDOM_TRAP_TABLE,
  ENVIRONMENTAL_HAZARDS,
  TRICK_OBJECT_TABLE,
  TRICK_ATTRIBUTE_TABLE,
  HAZARD_COLUMNS,
  type HazardColumn,
} from "../data/traps";

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
