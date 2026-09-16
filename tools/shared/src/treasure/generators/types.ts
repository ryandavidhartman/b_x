import type { MagicItemCategory } from "../data/magicItemType";

export interface RolledMagicItem {
  category: MagicItemCategory;
  name: string;
  details: string[];
}

export interface CoinResult {
  denomination: "Copper" | "Silver" | "Electrum" | "Gold" | "Platinum";
  amount: number;
}

export interface GemResult {
  category: string;
  gemType: string;
  baseValue: number;
  finalValue: number;
  adjustmentNote?: string;
}

export interface JewelryResult {
  jewelryType: string;
  value: number;
}

export interface HoardResult {
  label: string;
  coins: CoinResult[];
  gems: GemResult[];
  jewelry: JewelryResult[];
  magicItems: RolledMagicItem[];
  totalCoinValueGp: number;
  totalGemValueGp: number;
  totalJewelryValueGp: number;
  notes: string[];
}

export interface GenOptions {
  /** Roll intelligence/alignment/powers for every sword-type weapon generated. */
  checkIntelligentSwords: boolean;
}

export const DEFAULT_GEN_OPTIONS: GenOptions = { checkIntelligentSwords: true };
