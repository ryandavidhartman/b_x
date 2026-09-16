// Appendix E, "Stocking a Room": the d6 Contents table and its linked d6 Treasure? table.
export type RoomContents = "Monster" | "Trap" | "Special" | "Empty";

const CONTENTS_TABLE: { min: number; max: number; contents: RoomContents }[] = [
  { min: 1, max: 2, contents: "Monster" },
  { min: 3, max: 3, contents: "Trap" },
  { min: 4, max: 4, contents: "Special" },
  { min: 5, max: 6, contents: "Empty" },
];

export function contentsForRoll(roll: number): RoomContents {
  const row = CONTENTS_TABLE.find((r) => roll >= r.min && roll <= r.max);
  if (!row) throw new Error(`Contents roll ${roll} out of range (expected 1-6)`);
  return row.contents;
}

/** Only "Monster", "Trap", and "Empty" have a Treasure? column — "Special" has none (the book
 * says so explicitly, leaving it to the DM). */
export type TreasureColumn = "Monster" | "Trap" | "Empty";

const TREASURE_YES_MAX: Record<TreasureColumn, number> = {
  Monster: 3,
  Trap: 2,
  Empty: 1,
};

export function treasureForRoll(column: TreasureColumn, roll: number): boolean {
  return roll <= TREASURE_YES_MAX[column];
}
