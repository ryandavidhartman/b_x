import { table } from "../lib/dice";

export type MagicItemCategory =
  | "Weapon"
  | "Armor"
  | "Potion"
  | "Scroll"
  | "Wand, Staff, or Rod"
  | "Miscellaneous Item"
  | "Rare Item";

// "Magic Item Generation" master table, one column per die roll context.
export const MAGIC_ITEM_TYPE_ANY = table<MagicItemCategory>([
  ["01-25", "Weapon"],
  ["26-35", "Armor"],
  ["36-55", "Potion"],
  ["56-85", "Scroll"],
  ["86-90", "Wand, Staff, or Rod"],
  ["91-97", "Miscellaneous Item"],
  ["98-100", "Rare Item"],
]);

export const MAGIC_ITEM_TYPE_WEAPON_OR_ARMOR = table<MagicItemCategory>([
  ["01-70", "Weapon"],
  ["71-100", "Armor"],
]);

export const MAGIC_ITEM_TYPE_ANY_EXC_WEAPONS = table<MagicItemCategory>([
  ["01-12", "Armor"],
  ["13-40", "Potion"],
  ["41-79", "Scroll"],
  ["80-86", "Wand, Staff, or Rod"],
  ["87-96", "Miscellaneous Item"],
  ["97-100", "Rare Item"],
]);
