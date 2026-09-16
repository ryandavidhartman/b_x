// Public surface of tools/shared — the Appendix B/C/D generator logic that more than one app
// under tools/ needs. This folder is plain TypeScript source (no package.json, not an npm
// package); consumers import it via a bundler alias (see each app's vite.config.ts /
// tsconfig.app.json for the "@shared/..." alias). It was copied out of tools/encounter-generator
// rather than reimplemented, to avoid a third duplicate copy of this logic — see that app's own
// src/ for the original, still-independent copy.

export {
  rollDie,
  rollDice,
  rollSpec,
  chance,
  pick,
  table,
  lookup,
  rollTable,
  type DiceSpec,
  type RangeEntry,
} from "./lib/dice";

export { parseRange, inRange, findRowByRoll, cellText, type Range } from "./lib/rangeTable";

export {
  resolveMonsterLink,
  getMonsterHeading,
  type ResolvedMonster,
  type FallbackKind,
} from "./lib/resolveMonster";

export {
  parseCountSpec,
  parseNumberAppearing,
  rollAppearing,
  type AppearingSpec,
  type NumberAppearing,
} from "./lib/numberAppearing";

export type { Link, Cell, Row, Table, MonsterEntry, MonsterHeading, MonsterDb } from "./data/generated/types";

export {
  checkDungeonFrequency,
  checkWildernessFrequency,
  rollEncounterPurpose,
  broadTermFor,
  SETTLEMENT_ENCOUNTER_TURNS,
  type FrequencyResult,
  type WildernessFrequencyResult,
  type EncounterPurposeResult,
} from "./generators/encounterFrequency";

export {
  rollDungeonEncounter,
  DUNGEON_LOCATION_NAMES,
  type DungeonEncounterResult,
} from "./generators/dungeonEncounter";

export {
  rollWildernessEncounter,
  TERRAIN_NAMES,
  checkBecomingLost,
  checkForaging,
  rollCastleEncounter,
  CASTLE_OWNERS,
  type LoneNpcResult,
  type WildernessEncounterResult,
  type ForagingResult,
  type CastleEncounterResult,
} from "./generators/wildernessEncounter";

export {
  rollRace,
  rollUrbanProfession,
  rollRedLightProfession,
  rollNobleProfession,
  pickZeroLevelType,
  rollUrbanEncounter,
  rollUrbanMonsterEncounter,
  URBAN_LOCATION_NAMES,
  type TimeOfDay,
  type ZeroLevelType,
  type SubRoll,
  type UrbanEncounterResult,
  type UrbanMonsterEncounterResult,
} from "./generators/urbanEncounter";

export { rollTreasureForType } from "./generators/treasureAward";

export {
  rollLairTreasure,
  rollIndividualTreasure,
  rollUnguardedTreasure,
  dragonMonetaryChance,
  dragonItemChance,
  type DragonOptions,
} from "./treasure/generators/hoard";

export { rollMagicItem, rollForcedPotion, rollForcedScroll, type MagicItemColumn } from "./treasure/generators/magicItem";

export { rollIntelligentSword, type IntelligentSwordResult } from "./treasure/generators/intelligentSword";

export type {
  RolledMagicItem,
  CoinResult,
  GemResult,
  JewelryResult,
  HoardResult,
  GenOptions,
} from "./treasure/generators/types";
export { DEFAULT_GEN_OPTIONS } from "./treasure/generators/types";

export { LAIR_TREASURE, INDIVIDUAL_TREASURE, UNGUARDED_TREASURE, type DungeonLevel, type HoardRow } from "./treasure/data/coinHoards";

export { LevelPicker } from "./components/LevelPicker";
