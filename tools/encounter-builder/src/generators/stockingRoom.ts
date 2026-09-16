// Appendix E, "Stocking a Room": roll Contents, then the matching Treasure? column, resolving a
// Monster result via whichever Appendix D table (from tools/shared) fits the location, and
// treasure via the monster's own Treasure Type or Appendix B's Unguarded Treasures table.
import {
  rollDie,
  rollDungeonEncounter,
  rollWildernessEncounter,
  rollUrbanMonsterEncounter,
  rollTreasureForType,
  rollUnguardedTreasure,
  type DungeonEncounterResult,
  type WildernessEncounterResult,
  type UrbanMonsterEncounterResult,
  type HoardResult,
} from "@shared/index";
import { contentsForRoll, treasureForRoll, type RoomContents, type TreasureColumn } from "../data/stockingRoom";
import { partyLevelToDungeonLevel, type LocationInput } from "../lib/locationInput";

export type StockingEncounter = DungeonEncounterResult | WildernessEncounterResult | UrbanMonsterEncounterResult;

export interface StockRoomResult {
  contentsRoll: number;
  contents: RoomContents;
  treasureRoll: number | null;
  treasureYes: boolean | null;
  encounter: StockingEncounter | null;
  treasure: HoardResult | null;
}

function rollEncounterFor(input: LocationInput, partyLevel: number): StockingEncounter {
  switch (input.category) {
    case "dungeon": {
      if (!input.dungeonSubtype) throw new Error("dungeon location requires a subtype");
      return rollDungeonEncounter(input.dungeonSubtype, partyLevel);
    }
    case "wilderness": {
      if (!input.terrain) throw new Error("wilderness location requires a terrain");
      return rollWildernessEncounter(input.terrain, partyLevel);
    }
    case "urban":
      return rollUrbanMonsterEncounter("Urban", partyLevel);
    case "castle":
      return rollUrbanMonsterEncounter("Castle", partyLevel);
  }
}

export function stockRoom(input: LocationInput, partyLevel: number): StockRoomResult {
  const contentsRoll = rollDie(6);
  const contents = contentsForRoll(contentsRoll);

  let treasureRoll: number | null = null;
  let treasureYes: boolean | null = null;
  if (contents !== "Special") {
    treasureRoll = rollDie(6);
    treasureYes = treasureForRoll(contents as TreasureColumn, treasureRoll);
  }

  const encounter = contents === "Monster" ? rollEncounterFor(input, partyLevel) : null;

  let treasure: HoardResult | null = null;
  if (treasureYes) {
    const treasureType = encounter?.monster?.stats["Treasure Type"];
    if (encounter?.monster && treasureType) {
      // Dungeon rolls use Appendix D's own "wandering, not in lair" convention (matching
      // tools/shared's dungeonEncounter.ts precedent); wilderness/urban/castle monsters placed
      // here are treated as at home, per Appendix B's lair-vs-wandering treasure split.
      const inLair = input.category !== "dungeon";
      treasure = rollTreasureForType(treasureType, undefined, undefined, inLair);
    } else if (!encounter?.monster) {
      treasure = rollUnguardedTreasure(partyLevelToDungeonLevel(partyLevel));
    }
  }

  return { contentsRoll, contents, treasureRoll, treasureYes, encounter, treasure };
}

/** For a "Special" result (no Treasure? column of its own) — the DM may opt to roll the Empty
 * column instead, per the book's own suggestion. */
export function rollTreasureCheck(column: TreasureColumn): { roll: number; yes: boolean } {
  const roll = rollDie(6);
  return { roll, yes: treasureForRoll(column, roll) };
}

export function rollUnguardedTreasureForParty(partyLevel: number): HoardResult {
  return rollUnguardedTreasure(partyLevelToDungeonLevel(partyLevel));
}
