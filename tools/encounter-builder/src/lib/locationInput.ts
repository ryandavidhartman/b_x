// Maps this app's own LOCATION_TYPES vocabulary (App.tsx) onto the category + subtype keys the
// shared Appendix D generators actually expect. Appendix E's own prose spells the dungeon
// subtypes without spaces around the slash ("Cave/Cavern Network"); tools/shared's data (sourced
// from Appendix C/D) spells them with spaces ("Cave / Cavern Network") — this is a real, harmless
// naming mismatch between the book's own two appendices, not a bug introduced here.
import type { DungeonLevel } from "@shared/index";

export const LOCATION_TYPES = [
  "Standard Dungeon",
  "Cave/Cavern Network",
  "Tomb/Crypt",
  "Evil Temple/Shrine",
  "Sewer",
  "Ruins",
  "Wilderness",
  "Urban",
  "Castle",
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

const DUNGEON_SUBTYPE_TO_DATA_KEY: Partial<Record<LocationType, string>> = {
  "Standard Dungeon": "Standard Dungeon",
  "Cave/Cavern Network": "Cave / Cavern Network",
  "Tomb/Crypt": "Tomb / Crypt",
  "Evil Temple/Shrine": "Evil Temple / Shrine",
  Sewer: "Sewer",
  Ruins: "Ruins",
};

export type LocationCategory = "dungeon" | "wilderness" | "urban" | "castle";

/** The resolved shape every Appendix D-driven generator in this app actually needs — derived
 * from the raw LocationType + (for Wilderness) a chosen terrain, once per panel, rather than
 * re-deriving it in every generator. */
export interface LocationInput {
  category: LocationCategory;
  dungeonSubtype?: string;
  terrain?: string;
}

export function categoryFor(locationType: LocationType): LocationCategory {
  if (locationType in DUNGEON_SUBTYPE_TO_DATA_KEY) return "dungeon";
  if (locationType === "Wilderness") return "wilderness";
  if (locationType === "Castle") return "castle";
  return "urban";
}

export function dungeonDataKeyFor(locationType: LocationType): string | null {
  return DUNGEON_SUBTYPE_TO_DATA_KEY[locationType] ?? null;
}

/** Appendix B's Unguarded Treasures table (and every other Appendix B lookup this app makes) is
 * keyed by dungeon level bucket, not a bare 1-20 number — Appendix E's own text says to use "the
 * party's level, the same input as everything else in this step," so this app derives the bucket
 * automatically instead of asking the DM to set it twice. */
export function partyLevelToDungeonLevel(level: number): DungeonLevel {
  if (level <= 3) return String(level) as DungeonLevel;
  if (level <= 5) return "4-5";
  if (level <= 7) return "6-7";
  return "8+";
}
