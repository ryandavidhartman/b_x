// Appendix B, "Treasure Types": Lair, Individual, and Unguarded coin/gem/jewelry
// tables, plus the Magic Items column for each row.
import type { DiceSpec } from "../../lib/dice";

/** A coin/gem/jewelry cell: a chance to appear (100 = always) and a dice roll for how much. */
export interface CoinCell {
  chancePercent: number;
  dice: DiceSpec;
}

export type MagicItemRoll =
  | { kind: "column"; column: "any" | "weaponOrArmor" | "anyExcWeapons"; count: DiceSpec }
  | { kind: "fixed"; itemType: "potion" | "scroll"; count: DiceSpec };

export interface MagicItemsCell {
  /** Percent chance magic items are present. "special" = Type H, resolved separately. */
  chancePercent: number | "special";
  rolls: MagicItemRoll[];
}

export interface HoardRow {
  type: string;
  copper: CoinCell | null;
  silver: CoinCell | null;
  electrum: CoinCell | null;
  gold: CoinCell | null;
  platinum: CoinCell | null;
  gems: CoinCell | null;
  jewelry: CoinCell | null;
  magicItems: MagicItemsCell | null;
}

const cd = (chancePercent: number, dice: DiceSpec): CoinCell => ({ chancePercent, dice });

export const LAIR_TREASURE: HoardRow[] = [
  {
    type: "A",
    copper: cd(50, "5d6"),
    silver: cd(60, "5d6"),
    electrum: cd(40, "5d4"),
    gold: cd(70, "10d6"),
    platinum: cd(50, "1d10"),
    gems: cd(50, "6d6"),
    jewelry: cd(50, "6d6"),
    magicItems: { chancePercent: 30, rolls: [{ kind: "column", column: "any", count: 3 }] },
  },
  {
    type: "B",
    copper: cd(75, "5d10"),
    silver: cd(50, "5d6"),
    electrum: cd(50, "5d4"),
    gold: cd(50, "3d6"),
    platinum: null,
    gems: cd(25, "1d6"),
    jewelry: cd(25, "1d6"),
    magicItems: { chancePercent: 10, rolls: [{ kind: "column", column: "weaponOrArmor", count: 1 }] },
  },
  {
    type: "C",
    copper: cd(60, "6d6"),
    silver: cd(60, "5d4"),
    electrum: cd(30, "2d6"),
    gold: null,
    platinum: null,
    gems: cd(25, "1d4"),
    jewelry: cd(25, "1d4"),
    magicItems: { chancePercent: 15, rolls: [{ kind: "column", column: "any", count: "1d2" }] },
  },
  {
    type: "D",
    copper: cd(30, "4d6"),
    silver: cd(45, "6d6"),
    electrum: null,
    gold: cd(90, "5d8"),
    platinum: null,
    gems: cd(30, "1d8"),
    jewelry: cd(30, "1d8"),
    magicItems: {
      chancePercent: 20,
      rolls: [
        { kind: "column", column: "any", count: "1d2" },
        { kind: "fixed", itemType: "potion", count: 1 },
      ],
    },
  },
  {
    type: "E",
    copper: cd(30, "2d8"),
    silver: cd(60, "6d10"),
    electrum: cd(50, "3d8"),
    gold: cd(50, "4d10"),
    platinum: null,
    gems: cd(10, "1d10"),
    jewelry: cd(10, "1d10"),
    magicItems: {
      chancePercent: 30,
      rolls: [
        { kind: "column", column: "any", count: "1d4" },
        { kind: "fixed", itemType: "scroll", count: 1 },
      ],
    },
  },
  {
    type: "F",
    copper: null,
    silver: cd(40, "3d8"),
    electrum: cd(50, "4d8"),
    gold: cd(85, "6d10"),
    platinum: cd(70, "2d8"),
    gems: cd(20, "2d12"),
    jewelry: cd(10, "1d12"),
    magicItems: {
      chancePercent: 35,
      rolls: [
        { kind: "column", column: "anyExcWeapons", count: "1d4" },
        { kind: "fixed", itemType: "potion", count: 1 },
        { kind: "fixed", itemType: "scroll", count: 1 },
      ],
    },
  },
  {
    type: "G",
    copper: null,
    silver: null,
    electrum: null,
    gold: cd(90, "4d6x10"),
    platinum: cd(75, "5d8"),
    gems: cd(25, "3d6"),
    jewelry: cd(25, "1d10"),
    magicItems: {
      chancePercent: 50,
      rolls: [
        { kind: "column", column: "any", count: "1d4" },
        { kind: "fixed", itemType: "scroll", count: 1 },
      ],
    },
  },
  {
    // Dragon hoard: monetary/gems/magic chances scale with age category & Hit Dice.
    // See resolveTypeHChances() in generators/hoard.ts.
    type: "H",
    copper: cd(0, "8d10"),
    silver: cd(0, "6d10x10"),
    electrum: cd(0, "3d10x10"),
    gold: cd(0, "5d8x10"),
    platinum: cd(0, "9d8"),
    gems: cd(0, "1d100"),
    jewelry: cd(0, "10d4"),
    magicItems: {
      chancePercent: "special",
      rolls: [
        { kind: "column", column: "any", count: "1d4" },
        { kind: "fixed", itemType: "potion", count: 1 },
        { kind: "fixed", itemType: "scroll", count: 1 },
      ],
    },
  },
  {
    type: "I",
    copper: null,
    silver: null,
    electrum: null,
    gold: null,
    platinum: cd(80, "3d10"),
    gems: cd(50, "2d6"),
    jewelry: cd(50, "2d6"),
    magicItems: { chancePercent: 15, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  {
    type: "J",
    copper: cd(45, "3d8"),
    silver: cd(45, "1d8"),
    electrum: null,
    gold: null,
    platinum: null,
    gems: null,
    jewelry: null,
    magicItems: null,
  },
  {
    type: "K",
    copper: null,
    silver: cd(90, "2d10"),
    electrum: cd(35, "1d8"),
    gold: null,
    platinum: null,
    gems: null,
    jewelry: null,
    magicItems: null,
  },
  {
    type: "L",
    copper: null,
    silver: null,
    electrum: null,
    gold: null,
    platinum: null,
    gems: cd(50, "1d4"),
    jewelry: null,
    magicItems: null,
  },
  {
    type: "M",
    copper: null,
    silver: null,
    electrum: null,
    gold: cd(90, "4d10"),
    platinum: cd(90, "2d8x10"),
    gems: cd(55, "5d4"),
    jewelry: cd(45, "2d6"),
    magicItems: null,
  },
  {
    type: "N",
    copper: null,
    silver: null,
    electrum: null,
    gold: null,
    platinum: null,
    gems: null,
    jewelry: null,
    magicItems: { chancePercent: 40, rolls: [{ kind: "fixed", itemType: "potion", count: "2d4" }] },
  },
  {
    type: "O",
    copper: null,
    silver: null,
    electrum: null,
    gold: null,
    platinum: null,
    gems: null,
    jewelry: null,
    magicItems: { chancePercent: 50, rolls: [{ kind: "fixed", itemType: "scroll", count: "1d4" }] },
  },
];

export const INDIVIDUAL_TREASURE: HoardRow[] = [
  { type: "P", copper: cd(100, "3d8"), silver: null, electrum: null, gold: null, platinum: null, gems: null, jewelry: null, magicItems: null },
  { type: "Q", copper: null, silver: cd(100, "3d6"), electrum: null, gold: null, platinum: null, gems: null, jewelry: null, magicItems: null },
  { type: "R", copper: null, silver: null, electrum: cd(100, "2d6"), gold: null, platinum: null, gems: null, jewelry: null, magicItems: null },
  { type: "S", copper: null, silver: null, electrum: null, gold: cd(100, "2d4"), platinum: null, gems: null, jewelry: null, magicItems: null },
  { type: "T", copper: null, silver: null, electrum: null, gold: null, platinum: cd(100, "1d6"), gems: null, jewelry: null, magicItems: null },
  {
    type: "U",
    copper: cd(50, "1d20"),
    silver: cd(50, "1d20"),
    electrum: null,
    gold: cd(25, "1d20"),
    platinum: null,
    gems: cd(5, "1d4"),
    jewelry: cd(5, "1d4"),
    magicItems: { chancePercent: 2, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  {
    type: "V",
    copper: null,
    silver: cd(25, "1d20"),
    electrum: cd(25, "1d20"),
    gold: cd(50, "1d20"),
    platinum: cd(25, "1d20"),
    gems: cd(10, "1d4"),
    jewelry: cd(10, "1d4"),
    magicItems: { chancePercent: 5, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
];

export type DungeonLevel = "1" | "2" | "3" | "4-5" | "6-7" | "8+";

export const UNGUARDED_TREASURE: Record<DungeonLevel, HoardRow> = {
  "1": {
    type: "1",
    copper: cd(75, "1d8"),
    silver: cd(50, "1d6"),
    electrum: cd(25, "1d4"),
    gold: cd(7, "1d4"),
    platinum: cd(1, "1d4"),
    gems: cd(7, "1d4"),
    jewelry: cd(3, "1d4"),
    magicItems: { chancePercent: 2, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  "2": {
    type: "2",
    copper: cd(50, "1d10"),
    silver: cd(50, "1d8"),
    electrum: cd(25, "1d6"),
    gold: cd(20, "1d6"),
    platinum: cd(2, "1d4"),
    gems: cd(10, "1d6"),
    jewelry: cd(7, "1d4"),
    magicItems: { chancePercent: 5, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  "3": {
    type: "3",
    copper: cd(30, "2d6"),
    silver: cd(50, "1d10"),
    electrum: cd(25, "1d8"),
    gold: cd(50, "1d6"),
    platinum: cd(4, "1d4"),
    gems: cd(15, "1d6"),
    jewelry: cd(7, "1d6"),
    magicItems: { chancePercent: 8, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  "4-5": {
    type: "4-5",
    copper: cd(20, "3d6"),
    silver: cd(50, "2d6"),
    electrum: cd(25, "1d10"),
    gold: cd(50, "2d6"),
    platinum: cd(8, "1d4"),
    gems: cd(20, "1d8"),
    jewelry: cd(10, "1d6"),
    magicItems: { chancePercent: 12, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  "6-7": {
    type: "6-7",
    copper: cd(15, "4d6"),
    silver: cd(50, "3d6"),
    electrum: cd(25, "1d12"),
    gold: cd(70, "2d8"),
    platinum: cd(15, "1d4"),
    gems: cd(30, "1d8"),
    jewelry: cd(15, "1d6"),
    magicItems: { chancePercent: 16, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
  "8+": {
    type: "8+",
    copper: cd(10, "5d6"),
    silver: cd(50, "5d6"),
    electrum: cd(25, "2d8"),
    gold: cd(75, "4d6"),
    platinum: cd(30, "1d4"),
    gems: cd(40, "1d8"),
    jewelry: cd(30, "1d8"),
    magicItems: { chancePercent: 20, rolls: [{ kind: "column", column: "any", count: 1 }] },
  },
};
