// Appendix D, "Overland Hex Crawl Generation": Terrain Stepping, Points of Interest, Cataclysm.
import hexData from "../data/generated/hexCrawl.json";
import type { Table } from "../data/generated/types";
import { rollDie, rollDice } from "../lib/dice";
import { findRowByRoll, cellText } from "../lib/rangeTable";

const DATA = hexData as unknown as {
  terrainLoop: Table;
  newHex: Table;
  pointsOfInterest: Table;
  cataclysm: Table;
};

export const TERRAIN_LOOP: string[] = DATA.terrainLoop.rows
  .sort((a, b) => Number(cellText(a.Position)) - Number(cellText(b.Position)))
  .map((r) => cellText(r.Terrain));

export interface NewHexResult {
  terrain: string;
  roll: number;
  ruleText: string;
  rerolledPosition: boolean;
}

/** Advances from `currentTerrain` per a 2d6 roll on the New Hex table. */
export function rollNewHex(currentTerrain: string): NewHexResult {
  const roll = rollDice(2, 6);
  const row = findRowByRoll(DATA.newHex.rows, "2d6", roll);
  const ruleText = cellText(row?.["New Hex"]);
  const currentIdx = TERRAIN_LOOP.indexOf(currentTerrain);

  if (ruleText.includes("Unfamiliar territory")) {
    const others = TERRAIN_LOOP.filter((_, i) => i !== currentIdx);
    const terrain = others[Math.floor(Math.random() * others.length)] ?? currentTerrain;
    return { terrain, roll, ruleText, rerolledPosition: true };
  }

  const deltaMatch = ruleText.match(/\+(\d+) position/);
  const delta = deltaMatch ? parseInt(deltaMatch[1], 10) : 0;
  const nextIdx = ((currentIdx === -1 ? 0 : currentIdx) + delta) % TERRAIN_LOOP.length;
  return { terrain: TERRAIN_LOOP[nextIdx], roll, ruleText, rerolledPosition: false };
}

export interface PointOfInterestResult {
  hasPoi: boolean;
  checkRoll: number;
  location?: string;
  development?: string;
}

export function checkPointOfInterest(): PointOfInterestResult {
  const checkRoll = rollDie(6);
  if (checkRoll !== 1) return { hasPoi: false, checkRoll };
  const row = findRowByRoll(DATA.pointsOfInterest.rows, "d20", rollDie(20));
  return { hasPoi: true, checkRoll, location: cellText(row?.Location), development: cellText(row?.Development) };
}

export function rollCataclysm(depth = 0): string[] {
  const row = findRowByRoll(DATA.cataclysm.rows, "d8", rollDie(8));
  const result = cellText(row?.Cataclysm);
  if (result.toLowerCase().includes("roll twice more") && depth < 4) {
    return [...rollCataclysm(depth + 1), ...rollCataclysm(depth + 1)];
  }
  return [result];
}
