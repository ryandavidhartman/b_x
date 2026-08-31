import { table } from "../lib/dice";
import type { DiceSpec } from "../lib/dice";

export interface GemCategory {
  name: string;
  baseValue: number;
  numberFound: DiceSpec;
}

export const GEM_CATEGORY = table<GemCategory>([
  ["01-20", { name: "Ornamental", baseValue: 10, numberFound: "1d10" }],
  ["21-45", { name: "Semiprecious", baseValue: 50, numberFound: "1d8" }],
  ["46-75", { name: "Fancy", baseValue: 100, numberFound: "1d6" }],
  ["76-95", { name: "Precious", baseValue: 500, numberFound: "1d4" }],
  ["96-100", { name: "Gem", baseValue: 1000, numberFound: "1d2" }],
]);

export const JEWEL_CATEGORY: GemCategory = { name: "Jewel", baseValue: 5000, numberFound: 1 };

/** 2d6 quality-adjustment roll. "next-lower"/"next-higher" shift a row on GEM_CATEGORY. */
export type ValueAdjustment =
  | { kind: "multiply"; factor: number }
  | { kind: "next-lower" }
  | { kind: "next-higher" };

export const GEM_VALUE_ADJUSTMENT = table<ValueAdjustment>([
  ["2", { kind: "next-lower" }],
  ["3", { kind: "multiply", factor: 0.5 }],
  ["4", { kind: "multiply", factor: 0.75 }],
  ["5-9", { kind: "multiply", factor: 1 }],
  ["10", { kind: "multiply", factor: 1.5 }],
  ["11", { kind: "multiply", factor: 2 }],
  ["12", { kind: "next-higher" }],
]);

export const GEM_TYPE = table<string>([
  ["01-05", "Alexandrite"],
  ["06-12", "Amethyst"],
  ["13-20", "Aventurine"],
  ["21-30", "Chlorastrolite"],
  ["31-40", "Diamond"],
  ["41-43", "Emerald"],
  ["44-48", "Fire Opal"],
  ["49-57", "Fluorospar"],
  ["58-63", "Garnet"],
  ["64-68", "Heliotrope"],
  ["69-78", "Malachite"],
  ["79-88", "Rhodonite"],
  ["89-91", "Ruby"],
  ["92-95", "Sapphire"],
  ["96-100", "Topaz"],
]);

export const JEWELRY_BASE_VALUE: DiceSpec = "2d8x100";

export const JEWELRY_TYPE = table<string>([
  ["01-06", "Anklet"],
  ["07-12", "Belt"],
  ["13-14", "Bowl"],
  ["15-21", "Bracelet"],
  ["22-27", "Brooch"],
  ["28-32", "Buckle"],
  ["33-37", "Chain"],
  ["38-40", "Choker"],
  ["41-42", "Circlet"],
  ["43-47", "Clasp"],
  ["48-51", "Comb"],
  ["52", "Crown"],
  ["53-55", "Cup"],
  ["56-62", "Earring"],
  ["63-65", "Flagon"],
  ["66-68", "Goblet"],
  ["69-73", "Knife"],
  ["74-77", "Letter Opener"],
  ["78-80", "Locket"],
  ["81-82", "Medal"],
  ["83-89", "Necklace"],
  ["90", "Plate"],
  ["91-95", "Pin"],
  ["96", "Scepter"],
  ["97-99", "Statuette"],
  ["100", "Tiara"],
]);
