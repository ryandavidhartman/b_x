import { table } from "../lib/dice";

export const ARMOR_TYPE = table<string>([
  ["01-09", "Leather Armor"],
  ["10-28", "Chain Mail"],
  ["29-43", "Plate Mail"],
  ["44-100", "Shield"],
]);

export type ArmorBonusKind =
  | { kind: "bonus"; value: number }
  | { kind: "cursed" }
  | { kind: "cursed-ac11" };

export const ARMOR_BONUS = table<ArmorBonusKind>([
  ["01-50", { kind: "bonus", value: 1 }],
  ["51-80", { kind: "bonus", value: 2 }],
  ["81-90", { kind: "bonus", value: 3 }],
  ["91-95", { kind: "cursed" }],
  ["96-100", { kind: "cursed-ac11" }],
]);
