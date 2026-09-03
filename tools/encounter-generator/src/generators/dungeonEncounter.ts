// Appendix C, "Dungeon Random Encounters": dungeon level -> 1d12 on the Monster Sub-table
// Matrix -> Monster Level -> d% on that level's table -> monster + number appearing.
import dungeonData from "../data/generated/dungeonEncounters.json";
import type { Table } from "../data/generated/types";
import { rollDie } from "../lib/dice";
import { findRowByRoll, cellText } from "../lib/rangeTable";
import { resolveMonsterLink, type ResolvedMonster } from "../lib/resolveMonster";
import { parseCountSpec, rollAppearing, type AppearingSpec } from "../lib/numberAppearing";
import { pickLinkFromCell } from "../lib/cellChoice";
import { checkPowerMismatch, levelBandForDungeonLevel, type PartyLevelBand } from "../lib/powerLevel";

const DATA = dungeonData as unknown as {
  matrix: Table;
  levels: Record<string, { table: Table; dragonSubtable: Table | null }>;
};

export const DUNGEON_LEVEL_OPTIONS = DATA.matrix.rows.map((r) => cellText(r["Dungeon Level"]));

function dungeonLevelNumber(levelLabel: string): number {
  const m = levelLabel.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

interface DragonResult {
  age: string;
  hitPointsPerHd: string;
  monster: ResolvedMonster | null;
}

export interface DungeonEncounterResult {
  dungeonLevel: string;
  matrixRoll: number;
  monsterLevel: number;
  tableRoll: number;
  monsterLabel: string;
  monster: ResolvedMonster | null;
  isNpcParty: boolean;
  dragon: DragonResult | null;
  countSpec: AppearingSpec;
  rolledCount: number;
  adjustedCount: number;
  npcLevelBoost: number;
  choiceNote?: string;
  /** The party-level band this result is actually appropriate for, when it exceeds the band the
   * dungeon level itself implies (see src/lib/powerLevel.ts) — defense-in-depth on top of the
   * Monster Sub-table Matrix's own scaling. */
  outOfPlace: PartyLevelBand | null;
}

/** The book's "lesser monsters scale up / greater monsters scale down (min 1) / NPC parties
 * level up instead" adjustment for a Monster Level that doesn't match the dungeon level it was
 * rolled on. Represents each dungeon-level range by its lower bound (e.g. "10-11" -> 10). */
function adjustCount(baseCount: number, dungeonLevel: string, monsterLevel: number): { count: number; npcLevelBoost: number } {
  const dLevel = dungeonLevelNumber(dungeonLevel);
  const diff = monsterLevel - dLevel;
  if (diff === 0) return { count: baseCount, npcLevelBoost: 0 };
  if (diff > 0) return { count: Math.max(1, baseCount - diff), npcLevelBoost: 0 };
  return { count: baseCount + Math.abs(diff), npcLevelBoost: Math.abs(diff) };
}

export function rollDungeonEncounter(dungeonLevel: string): DungeonEncounterResult {
  const matrixRow = DATA.matrix.rows.find((r) => cellText(r["Dungeon Level"]) === dungeonLevel);
  if (!matrixRow) throw new Error(`unknown dungeon level: ${dungeonLevel}`);

  const matrixRoll = rollDie(12);
  let monsterLevel = 1;
  for (let ml = 1; ml <= 10; ml++) {
    const raw = cellText(matrixRow[`ML ${ml}`]);
    if (raw === "-" || raw === "") continue;
    const [lo, hi] = raw.includes("-") ? raw.split("-").map(Number) : [Number(raw), Number(raw)];
    if (matrixRoll >= lo && matrixRoll <= hi) {
      monsterLevel = ml;
      break;
    }
  }

  const levelData = DATA.levels[String(monsterLevel)];
  const tableRoll = rollDie(100);
  const row = findRowByRoll(levelData.table.rows, "d%", tableRoll, { percentile: true });
  if (!row) throw new Error(`no row for roll ${tableRoll} on Monster Level ${monsterLevel}`);

  const monsterCell = row["Monster Encountered"];
  const monsterLabel = cellText(monsterCell);
  const isNpcParty = monsterLabel.startsWith("NPC Party");
  const isDragon = monsterLabel.startsWith("Dragon") && monsterCell.links.length === 0;

  let monster: ResolvedMonster | null = null;
  let dragon: DragonResult | null = null;
  let choiceNote: string | undefined;

  if (isDragon && levelData.dragonSubtable) {
    const dRoll = rollDie(100);
    const dRow = findRowByRoll(levelData.dragonSubtable.rows, "d%", dRoll, { percentile: true });
    if (dRow) {
      const typeCell = dRow.Type;
      const link = typeCell.links[0];
      const resolved = link ? resolveMonsterLink(link.label, link.anchor) : null;
      dragon = { age: cellText(dRow.Age), hitPointsPerHd: cellText(dRow["Hit Points per HD"]), monster: resolved };
    }
  } else if (!isNpcParty) {
    const { chosenLink, note } = pickLinkFromCell(monsterCell);
    choiceNote = note;
    if (chosenLink) monster = resolveMonsterLink(chosenLink.label, chosenLink.anchor);
  }

  const countSpec = parseCountSpec(cellText(row["#"]));
  const rolledCount = isNpcParty ? 0 : rollAppearing(countSpec);
  const { count: adjustedCount, npcLevelBoost } = isNpcParty
    ? { count: 0, npcLevelBoost: Math.max(0, monsterLevel - dungeonLevelNumber(dungeonLevel)) }
    : adjustCount(rolledCount, dungeonLevel, monsterLevel);

  const primaryMonster = dragon?.monster ?? monster;
  const outOfPlace = primaryMonster ? checkPowerMismatch(primaryMonster.stats["Hit Dice"], levelBandForDungeonLevel(dungeonLevel)) : null;

  return {
    dungeonLevel, matrixRoll, monsterLevel, tableRoll,
    monsterLabel, monster, isNpcParty, dragon,
    countSpec, rolledCount, adjustedCount, npcLevelBoost, choiceNote,
    outOfPlace,
  };
}
