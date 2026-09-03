import { chance, lookup, rollDice, rollSpec, rollTable } from "../../lib/dice";
import {
  INDIVIDUAL_TREASURE,
  LAIR_TREASURE,
  UNGUARDED_TREASURE,
  type CoinCell,
  type DungeonLevel,
  type HoardRow,
  type MagicItemsCell,
} from "../data/coinHoards";
import { GEM_CATEGORY, GEM_TYPE, GEM_VALUE_ADJUSTMENT, JEWELRY_BASE_VALUE, JEWELRY_TYPE, JEWEL_CATEGORY } from "../data/gems";
import { rollForcedPotion, rollForcedScroll, rollMagicItem } from "./magicItem";
import { DEFAULT_GEN_OPTIONS, type CoinResult, type GemResult, type GenOptions, type HoardResult, type JewelryResult, type RolledMagicItem } from "./types";

const COIN_GP_VALUE: Record<CoinResult["denomination"], number> = {
  Copper: 0.01,
  Silver: 0.1,
  Electrum: 0.5,
  Gold: 1,
  Platinum: 5,
};

// Ordered low-to-high value tiers, so "next lower"/"next higher" quality
// adjustments can shift one row in either direction (Gem -> Jewel on a 12).
const GEM_TIERS = [...GEM_CATEGORY.map((e) => e.value), JEWEL_CATEGORY];

function rollGemValue(): { category: string; baseValue: number; finalValue: number; adjustmentNote?: string } {
  const rolled = rollTable(GEM_CATEGORY);
  let idx = GEM_TIERS.findIndex((t) => t.name === rolled.name);
  const adjRoll = rollDice(2, 6);
  const adjustment = lookup(adjRoll, GEM_VALUE_ADJUSTMENT);

  if (adjustment.kind === "multiply") {
    const finalValue = Math.round(rolled.baseValue * adjustment.factor);
    return {
      category: rolled.name,
      baseValue: rolled.baseValue,
      finalValue,
      adjustmentNote: adjustment.factor === 1 ? undefined : `${adjustment.factor}x quality`,
    };
  }

  if (adjustment.kind === "next-lower") idx = Math.max(0, idx - 1);
  else idx = Math.min(GEM_TIERS.length - 1, idx + 1);
  const tier = GEM_TIERS[idx];
  return {
    category: tier.name,
    baseValue: tier.baseValue,
    finalValue: tier.baseValue,
    adjustmentNote: adjustment.kind === "next-higher" && tier.name === "Jewel" ? "became a Jewel" : `shifted to ${tier.name}`,
  };
}

function rollGem(): GemResult {
  const value = rollGemValue();
  return { ...value, gemType: rollTable(GEM_TYPE) };
}

/**
 * Per the book: roll each gem individually for small hoards; for 10+ gems,
 * roll Category/Value once for the whole batch (still rolling each gem's
 * specific Type for flavor) rather than rolling the full chain N times.
 */
function rollGemBatch(count: number): GemResult[] {
  if (count <= 0) return [];
  if (count < 10) return Array.from({ length: count }, rollGem);
  const value = rollGemValue();
  return Array.from({ length: count }, () => ({ ...value, gemType: rollTable(GEM_TYPE) }));
}

function rollJewelryBatch(count: number): JewelryResult[] {
  return Array.from({ length: count }, () => ({ jewelryType: rollTable(JEWELRY_TYPE), value: rollSpec(JEWELRY_BASE_VALUE) }));
}

function rollCoinCell(cell: CoinCell | null, denomination: CoinResult["denomination"], multiplier: number): CoinResult | null {
  if (!cell) return null;
  if (cell.chancePercent < 100 && !chance(cell.chancePercent)) return null;
  const amount = rollSpec(cell.dice) * multiplier;
  return amount > 0 ? { denomination, amount } : null;
}

function rollGemsCell(cell: CoinCell | null): GemResult[] {
  if (!cell) return [];
  if (cell.chancePercent < 100 && !chance(cell.chancePercent)) return [];
  return rollGemBatch(rollSpec(cell.dice));
}

function rollJewelryCell(cell: CoinCell | null): JewelryResult[] {
  if (!cell) return [];
  if (cell.chancePercent < 100 && !chance(cell.chancePercent)) return [];
  return rollJewelryBatch(rollSpec(cell.dice));
}

function rollMagicItemsCell(cell: MagicItemsCell | null, options: GenOptions): RolledMagicItem[] {
  if (!cell) return [];
  const pct = typeof cell.chancePercent === "number" ? cell.chancePercent : 100;
  if (pct < 100 && !chance(pct)) return [];

  const items: RolledMagicItem[] = [];
  for (const roll of cell.rolls) {
    const count = rollSpec(roll.count);
    for (let i = 0; i < count; i++) {
      if (roll.kind === "column") items.push(rollMagicItem(roll.column, options));
      else items.push(roll.itemType === "potion" ? rollForcedPotion() : rollForcedScroll());
    }
  }
  return items;
}

function rollHoardRow(row: HoardRow, coinMultiplier: number, options: GenOptions, label: string): HoardResult {
  const coins: CoinResult[] = [];
  const pushCoin = (cell: CoinCell | null, denom: CoinResult["denomination"]) => {
    const result = rollCoinCell(cell, denom, coinMultiplier);
    if (result) coins.push(result);
  };
  pushCoin(row.copper, "Copper");
  pushCoin(row.silver, "Silver");
  pushCoin(row.electrum, "Electrum");
  pushCoin(row.gold, "Gold");
  pushCoin(row.platinum, "Platinum");

  const gems = rollGemsCell(row.gems);
  const jewelry = rollJewelryCell(row.jewelry);
  const magicItems = rollMagicItemsCell(row.magicItems, options);

  return {
    label,
    coins,
    gems,
    jewelry,
    magicItems,
    totalCoinValueGp: coins.reduce((sum, c) => sum + c.amount * COIN_GP_VALUE[c.denomination], 0),
    totalGemValueGp: gems.reduce((sum, g) => sum + g.finalValue, 0),
    totalJewelryValueGp: jewelry.reduce((sum, j) => sum + j.value, 0),
    notes: [],
  };
}

// Type H (dragon) chances aren't fixed percentages — they scale with the
// dragon's age category (monetary treasure) and Hit Dice (gems/jewelry/magic
// items, at 5% per HD). The book gives only the two endpoints of the age
// range (35% at 2nd category, 85% at 7th); we interpolate linearly between them.
export function dragonMonetaryChance(ageCategory: number): number {
  const clamped = Math.min(7, Math.max(2, ageCategory));
  return 35 + (clamped - 2) * 10;
}

export function dragonItemChance(hitDice: number): number {
  return Math.min(100, Math.max(0, 5 * hitDice));
}

function resolveTypeHRow(row: HoardRow, monetaryPct: number, itemPct: number): HoardRow {
  const withChance = (cell: CoinCell | null, pct: number): CoinCell | null => (cell ? { ...cell, chancePercent: pct } : null);
  return {
    ...row,
    copper: withChance(row.copper, monetaryPct),
    silver: withChance(row.silver, monetaryPct),
    electrum: withChance(row.electrum, monetaryPct),
    gold: withChance(row.gold, monetaryPct),
    platinum: withChance(row.platinum, monetaryPct),
    gems: withChance(row.gems, itemPct),
    jewelry: withChance(row.jewelry, itemPct),
    magicItems: row.magicItems ? { chancePercent: itemPct, rolls: row.magicItems.rolls } : null,
  };
}

export interface DragonOptions {
  ageCategory: number;
  hitDice: number;
}

export function rollLairTreasure(type: string, options: GenOptions = DEFAULT_GEN_OPTIONS, dragon?: DragonOptions): HoardResult {
  const row = LAIR_TREASURE.find((r) => r.type === type);
  if (!row) throw new Error(`unknown Lair Treasure type: ${type}`);

  if (type === "H") {
    const monetaryPct = dragonMonetaryChance(dragon?.ageCategory ?? 5);
    const itemPct = dragonItemChance(dragon?.hitDice ?? 10);
    const resolved = resolveTypeHRow(row, monetaryPct, itemPct);
    return rollHoardRow(resolved, 100, options, "Lair Treasure Type H (Dragon)");
  }
  return rollHoardRow(row, 100, options, `Lair Treasure Type ${type}`);
}

export function rollIndividualTreasure(type: string, options: GenOptions = DEFAULT_GEN_OPTIONS): HoardResult {
  const row = INDIVIDUAL_TREASURE.find((r) => r.type === type);
  if (!row) throw new Error(`unknown Individual Treasure type: ${type}`);
  return rollHoardRow(row, 1, options, `Individual Treasure Type ${type}`);
}

export function rollUnguardedTreasure(level: DungeonLevel, options: GenOptions = DEFAULT_GEN_OPTIONS): HoardResult {
  const row = UNGUARDED_TREASURE[level];
  return rollHoardRow(row, 100, options, `Unguarded Treasure (Dungeon Level ${level})`);
}
