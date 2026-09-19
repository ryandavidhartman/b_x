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

/** DungeonMap.tsx's purely cosmetic per-subtype rendering style — none of these change placed
 * cells, doors, or connectivity, only how the same square-cell grid gets drawn. "natural" (Cave /
 * Cavern Network), "tomb" (Tomb/Crypt), "sewer" (Sewer), and "wilderness" (category "wilderness")
 * all still run on randomDungeon.ts's own branching walk, just skinned differently — a sewer
 * network, and Appendix E's own broadened wilderness scope (Room→"Clearing", Corridor→"Trail"),
 * are exactly the kind of organic branching shape that procedure already produces, so none of them
 * ever needed a different spatial algorithm, only different dressing — wilderness's own dressing is
 * just the biggest swing of the four, since walls/doors/boxed rooms are the wrong visual language
 * for open terrain regardless of what they're labeled (see DungeonMap.tsx's own note). "temple"
 * (Evil Temple/Shrine), "castle" (category "castle"), and "ruins" (Ruins) are a bigger departure:
 * `isBuildingLayout` below marks them as using generators/buildingLayout.ts's wholly different
 * spatial algorithm instead (see that file's own header) — a real building's compact, packed
 * footprint isn't achievable from the walk engine's organic branching shape at all, cosmetic skin
 * or not. Ruins always uses the plain rectangle (same as Castle, no shape picker) since it's meant
 * to read as "the recognizable footprint of a fallen keep/temple," just rendered broken-down.
 * Standard Dungeon and Urban are the only ones left reading as "constructed" (unstyled). */
export type MapStyle = "constructed" | "natural" | "tomb" | "sewer" | "wilderness" | "temple" | "castle" | "ruins";

export function mapStyleFor(input: LocationInput): MapStyle {
  if (input.category === "castle") return "castle";
  if (input.category === "wilderness") return "wilderness";
  if (input.category !== "dungeon") return "constructed";
  if (input.dungeonSubtype === "Cave / Cavern Network") return "natural";
  if (input.dungeonSubtype === "Tomb / Crypt") return "tomb";
  if (input.dungeonSubtype === "Evil Temple / Shrine") return "temple";
  if (input.dungeonSubtype === "Sewer") return "sewer";
  if (input.dungeonSubtype === "Ruins") return "ruins";
  return "constructed";
}

/** Temple, Castle, and Ruins use generators/buildingLayout.ts's ring-of-rooms/courtyard algorithm
 * instead of randomDungeon.ts's book-faithful branching walk — see `MapStyle`'s own doc comment for
 * why. Exported so GeneratePanel.tsx can pick a generator, and DungeonMap.tsx/other callers don't
 * need to duplicate the "which styles are building-layout" list. */
export function isBuildingLayout(style: MapStyle): boolean {
  return style === "temple" || style === "castle" || style === "ruins";
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
