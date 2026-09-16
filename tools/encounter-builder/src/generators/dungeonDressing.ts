import { rollDie, lookup, pick } from "@shared/index";
import { DRESSING_TABLES, ROOM_NAME_COLUMNS, type DressingCategory } from "../data/dungeonDressing";

export interface DressingRoll {
  category: DressingCategory;
  roll: number;
  result: string;
}

export function rollDressing(category: DressingCategory): DressingRoll {
  const roll = rollDie(100);
  const result = lookup(roll, DRESSING_TABLES[category]);
  return { category, roll, result };
}

/** A quick "roll a scene" shortcut: Air Currents, Odours, Noises, and General together, the
 * combination the book itself leans on most in its own worked examples. */
export const SCENE_CATEGORIES: DressingCategory[] = ["Air Currents", "Odours", "Noises", "General"];

export function rollScene(): DressingRoll[] {
  return SCENE_CATEGORIES.map(rollDressing);
}

function joinRoomNameParts(parts: string[]): string {
  let result = "";
  for (const part of parts) {
    if (result.endsWith("-")) {
      result += part;
    } else if (result) {
      result += ` ${part}`;
    } else {
      result = part;
    }
  }
  return result;
}

export function rollRoomName(): string {
  const parts = ROOM_NAME_COLUMNS.map((column) => pick(column));
  return joinRoomNameParts(parts);
}
