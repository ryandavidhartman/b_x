// Appendix E, "Random Dungeon Generation": Tables 1-23, transcribed directly from
// combined-monsters.md ("### Random Dungeon Generation" through the end of Appendix E). Branchy
// tables (footnotes that trigger further rolls, cascading rerolls, row-dependent sub-columns)
// keep their conditional logic in ../generators/randomDungeon.ts — this file is pure data.
import { table, type RangeEntry } from "@shared/index";

// --- Table 1: Starting Area Shape (1d6) ------------------------------------------------------
export const STARTING_AREA: RangeEntry<string>[] = table([
  ["1", "Area 1"],
  ["2", "Area 2"],
  ["3", "Area 3"],
  ["4", "Area 4"],
  ["5", "Area 5"],
  ["6", "Area 6"],
]);

// --- Table 2(a): Room (1d20) / Table 2(b): Chambers (1d20) -----------------------------------
export interface RoomDimensions {
  width: number;
  length: number;
}
export type RoomSizeResult = RoomDimensions | "Special";

export const ROOM_SIZE: RangeEntry<RoomSizeResult>[] = table<RoomSizeResult>([
  ["1", { width: 10, length: 10 }],
  ["2-4", { width: 20, length: 20 }],
  ["5-7", { width: 30, length: 30 }],
  ["8-10", { width: 40, length: 40 }],
  ["11", { width: 10, length: 20 }],
  ["12-13", { width: 20, length: 30 }],
  ["14-15", { width: 20, length: 40 }],
  ["16-18", { width: 30, length: 40 }],
  ["19-20", "Special"],
]);

export const CHAMBER_SIZE: RangeEntry<RoomSizeResult>[] = table<RoomSizeResult>([
  ["1", { width: 10, length: 20 }],
  ["2-4", { width: 20, length: 20 }],
  ["5-6", { width: 30, length: 30 }],
  ["7-8", { width: 40, length: 40 }],
  ["9-10", { width: 20, length: 30 }],
  ["11-13", { width: 20, length: 40 }],
  ["14-15", { width: 40, length: 50 }],
  ["16-17", { width: 40, length: 60 }],
  ["18-20", "Special"],
]);

// --- Table 3: Special Rooms or Chambers (1d20) ------------------------------------------------
export type SpecialShape = "Cave" | "Circular" | "Hexagonal" | "Octagonal" | "Oval" | "Special" | "Trapezoidal" | "Triangular";

export const SPECIAL_SHAPE: RangeEntry<SpecialShape>[] = table([
  ["1", "Cave"],
  ["2-6", "Circular"],
  ["7-8", "Hexagonal"],
  ["9-10", "Octagonal"],
  ["11-12", "Oval"],
  ["13-14", "Special"],
  ["15-17", "Trapezoidal"],
  ["18-20", "Triangular"],
]);

// Circular's own sub-roll (1d20): 1-6 pool, 7 well, 8-11 shaft, 12-20 -> Table 4.
export type CircularFeature = "Pool" | "Well" | "Shaft" | "None";
export const CIRCULAR_FEATURE: RangeEntry<CircularFeature>[] = table([
  ["1-6", "Pool"],
  ["7", "Well"],
  ["8-11", "Shaft"],
  ["12-20", "None"],
]);

// --- Table 4: Approximate Size Table for Unusual Rooms (1d20) --------------------------------
export type UnusualSize = number | "Reroll";
export const UNUSUAL_SIZE: RangeEntry<UnusualSize>[] = table<UnusualSize>([
  ["1-3", 500],
  ["4-6", 1000],
  ["7-8", 1500],
  ["9-10", 2500],
  ["11-12", 3250],
  ["13-15", 4000],
  ["16-20", "Reroll"],
]);

// --- Table 5: Number of Exits (1d20) ----------------------------------------------------------
// The book prints this as two side-by-side (area threshold -> exit count) pairs per row. Encoded
// here as one row per d20 range, carrying both branches; the engine picks the branch that matches
// the room/chamber's actual rolled area.
export type ExitsOutcome =
  | { kind: "fixed"; count: number }
  | { kind: "secret-check" } // "0*" - dead end unless a 25% secret-door check succeeds
  | { kind: "1d4" }
  | { kind: "switch" }; // "1**" - a passage for a room, a door for a chamber

export interface ExitsRow {
  min: number;
  max: number;
  threshold: number | null; // sq ft boundary between the two branches; null = both branches identical ("Any")
  atOrBelow: ExitsOutcome;
  above: ExitsOutcome;
}

export const NUMBER_OF_EXITS: ExitsRow[] = [
  { min: 1, max: 4, threshold: 500, atOrBelow: { kind: "fixed", count: 1 }, above: { kind: "fixed", count: 2 } },
  { min: 5, max: 7, threshold: 500, atOrBelow: { kind: "fixed", count: 2 }, above: { kind: "fixed", count: 3 } },
  { min: 8, max: 9, threshold: 500, atOrBelow: { kind: "fixed", count: 3 }, above: { kind: "fixed", count: 4 } },
  { min: 10, max: 12, threshold: 1000, atOrBelow: { kind: "secret-check" }, above: { kind: "fixed", count: 1 } },
  { min: 13, max: 15, threshold: 1500, atOrBelow: { kind: "secret-check" }, above: { kind: "fixed", count: 1 } },
  { min: 16, max: 19, threshold: null, atOrBelow: { kind: "1d4" }, above: { kind: "1d4" } },
  { min: 20, max: 20, threshold: null, atOrBelow: { kind: "switch" }, above: { kind: "switch" } },
];

// --- Table 6: Exit Location (1d20) -------------------------------------------------------------
export type ExitLocation = "Left Wall" | "Opposite Wall" | "Right Wall" | "Same Wall";
export const EXIT_LOCATION: RangeEntry<ExitLocation>[] = table([
  ["1-4", "Left Wall"],
  ["5-12", "Opposite Wall"],
  ["13-16", "Right Wall"],
  ["17-20", "Same Wall"],
]);

// Collision reroll (1d20), when a located exit would open into already-mapped space.
export type CollisionResolution = "Opposite Wall" | "Secret Door" | "One-Way Door";
export const EXIT_COLLISION: RangeEntry<CollisionResolution>[] = table([
  ["1-10", "Opposite Wall"],
  ["11-15", "Secret Door"],
  ["16-20", "One-Way Door"],
]);

// --- Table 7: Exit Direction, Chamber Passage (1d20) --------------------------------------------
export type TurnDirection = "Straight" | "Left 45" | "Right 45";
export const EXIT_DIRECTION_CHAMBER: RangeEntry<TurnDirection>[] = table([
  ["1-16", "Straight"],
  ["17-18", "Left 45"],
  ["19-20", "Right 45"],
]);

// --- Table 8: Chamber or Room Contents (1d20) ---------------------------------------------------
export type RoomContentsResult = "Empty" | "Monster" | "Monster and Treasure" | "Stairs" | "Trick or Trap" | "Treasure";
export const CHAMBER_ROOM_CONTENTS: RangeEntry<RoomContentsResult>[] = table([
  ["1-7", "Empty"],
  ["8-11", "Monster"],
  ["12-17", "Monster and Treasure"],
  ["18", "Stairs"],
  ["19", "Trick or Trap"],
  ["20", "Treasure"],
]);

// --- Table 9: Treasure Container (1d20) ----------------------------------------------------------
export const TREASURE_CONTAINER: RangeEntry<string>[] = table([
  ["1-2", "Bags"],
  ["3-4", "Sacks"],
  ["5-6", "Coffers"],
  ["7-8", "Chests"],
  ["9-10", "Large Chests"],
  ["11-12", "Pottery Jars"],
  ["13-14", "Metal Urns"],
  ["15-16", "Stone Containers"],
  ["17-18", "Iron Trunks"],
  ["19-20", "None, loose"],
]);

// --- Table 10: Treasure Guards & Wards (1d20) ------------------------------------------------
export const TREASURE_GUARDS: RangeEntry<string>[] = table([
  ["1-2", "Blade scything across inside"],
  ["3-4", "Contact poison on container"],
  ["5-6", "Contact poison on treasure"],
  ["7", "Gas released by opening container"],
  ["8", "Explosive runes"],
  ["9-10", "Poisoned needles in lock"],
  ["11", "Poisoned needles in handles"],
  ["12", "Poisonous insect or reptile living inside container"],
  ["13", "Spears released from walls when container opened"],
  ["14", "Spring darts firing from front of container"],
  ["15", "Spring darts firing from top of container"],
  ["16", "Spring darts firing up from inside bottom of container"],
  ["17", "Stone block dropping in front of container"],
  ["18", "Symbol"],
  ["19", "Trapdoor opening in front of container"],
  ["20", "Trapdoor opening 6 ft in front of container"],
]);

// --- Table 11: Treasure Hidden By or In (1d20) ------------------------------------------------
export const TREASURE_HIDDEN: RangeEntry<string>[] = table([
  ["1-2", "Behind a loose wall stone"],
  ["3-4", "Illusion to change appearance or hide item"],
  ["5-7", "Invisibility"],
  ["8-11", "In a nearby secret room"],
  ["12", "In an ordinary container in plain view"],
  ["13", "Inside or under trash or dung heap"],
  ["14", "Non-magically disguised"],
  ["15", "Secret space under container"],
  ["16-17", "Secret compartment in container"],
  ["18-20", "Under a loose flooring stone"],
]);

// --- Table 12: Stairs (1d20) --------------------------------------------------------------------
export const STAIRS: RangeEntry<string>[] = table([
  ["1-5", "Down 1 level"],
  ["6", "Down 2 levels"],
  ["7", "Down 3 levels"],
  ["8-9", "Up 1 level"],
  ["10", "Up to a dead end"],
  ["11", "Down to a dead end"],
  ["12", "Chimney up 1 level, passage continues"],
  ["13", "Chimney up 2 levels, passage continues"],
  ["14", "Chimney down 2 levels, passage continues"],
  ["15-16", "Trap door down 1 level, passage continues"],
  ["17", "Trap door down 2 levels, passage continues"],
  ["18-20", "Down 1 level into chamber"],
]);

// --- Table 13: Caves (1d20) ---------------------------------------------------------------------
export interface CaveResult {
  label: string;
  width: number;
  length: number;
  rollPools?: boolean;
  rollLakes?: boolean;
}
export const CAVES: RangeEntry<CaveResult>[] = table([
  ["1-5", { label: "Cave 40 x 60 ft", width: 40, length: 60 }],
  ["6-7", { label: "Cave 50 x 75 ft", width: 50, length: 75 }],
  ["8-9", { label: "Double Cave: 30 x 30 ft, 60 x 60 ft", width: 60, length: 60 }],
  ["10-11", { label: "Double Cave: 30 x 50 ft, 80 x 100 ft", width: 80, length: 100, rollPools: true }],
  ["12-14", { label: "Cavern 100 x 125 ft", width: 100, length: 125, rollPools: true }],
  ["15-16", { label: "Cavern 125 x 150 ft", width: 125, length: 150 }],
  ["17-18", { label: "Cavern 150 x 200 ft", width: 150, length: 200, rollPools: true }],
  ["19-20", { label: "Cavern 300 x 400 ft", width: 300, length: 400, rollLakes: true }],
]);

// --- Table 14: Pools (1d20) / Table 15: Lakes (1d20) ---------------------------------------------
export type PoolResult = "No pool" | "Pool" | "Pool, monster" | "Pool, monster, and treasure" | "Magic pool";
export const POOLS: RangeEntry<PoolResult>[] = table([
  ["1-12", "No pool"],
  ["13-14", "Pool"],
  ["15-16", "Pool, monster"],
  ["17-19", "Pool, monster, and treasure"],
  ["20", "Magic pool"],
]);

export type LakeResult = "No lake" | "Lake" | "Lake, monster" | "Lake, monster and treasure" | "Enchanted Lake";
export const LAKES: RangeEntry<LakeResult>[] = table([
  ["1-12", "No lake"],
  ["13-15", "Lake"],
  ["16-17", "Lake, monster"],
  ["18-19", "Lake, monster and treasure"],
  ["20", "Enchanted Lake"],
]);

// --- Table 16: Magic Pools (1d20) ----------------------------------------------------------------
export type MagicPoolCategory = "Transmute" | "Attribute" | "Talking" | "Transporter";
export const MAGIC_POOL_CATEGORY: RangeEntry<MagicPoolCategory>[] = table([
  ["1-8", "Transmute"],
  ["9-15", "Attribute"],
  ["16-17", "Talking"],
  ["18-20", "Transporter"],
]);
export const MAGIC_POOL_TRANSMUTE: RangeEntry<"Platinum" | "Lead">[] = table([
  ["1-12", "Platinum"],
  ["13-20", "Lead"],
]);
export const ATTRIBUTES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"] as const;
export const MAGIC_POOL_ALIGNMENT: RangeEntry<"Lawful" | "Neutral" | "Chaotic">[] = table([
  ["1-2", "Lawful"],
  ["3-4", "Neutral"],
  ["5-6", "Chaotic"],
]);
export const MAGIC_POOL_TRANSPORT: RangeEntry<string>[] = table([
  ["1-7", "Back to the surface"],
  ["8-12", "Elsewhere on the level"],
  ["13-16", "One level down"],
  ["17-20", "Many miles away (wilderness/outdoor adventure)"],
]);

// --- Table 17: General, Doors, and Passages (1d20) ------------------------------------------------
export type GeneralResult = "Chamber" | "Continue" | "Dead End" | "Door" | "Side Passage" | "Stairs" | "Turn" | "Wandering Monster";
export const GENERAL: RangeEntry<GeneralResult>[] = table([
  ["1-3", "Chamber"],
  ["4", "Continue"],
  ["5", "Dead End"],
  ["6-10", "Door"],
  ["11-14", "Side Passage"],
  ["15", "Stairs"],
  ["16-19", "Turn"],
  ["20", "Wandering Monster"],
]);

// --- Table 18: Door Location (1d20) ---------------------------------------------------------------
export type DoorLocation = "Left" | "Right" | "Ahead";
export const DOOR_LOCATION: RangeEntry<DoorLocation>[] = table([
  ["1-6", "Left"],
  ["7-12", "Right"],
  ["13-20", "Ahead"],
]);

// --- Table 19: Behind the Door (1d20) -------------------------------------------------------------
export type BehindDoorKind = "Side Door" | "Straight Passage" | "Passage Left 45" | "Passage Right 45" | "Room" | "Chamber";
export const BEHIND_THE_DOOR: RangeEntry<BehindDoorKind>[] = table([
  ["1-3", "Side Door"],
  ["4-8", "Straight Passage"],
  ["9", "Passage Left 45"],
  ["10", "Passage Right 45"],
  ["11-18", "Room"],
  ["19-20", "Chamber"],
]);

// --- Table 20: Side Passages (1d20) ---------------------------------------------------------------
export type SidePassageKind = "Left 90" | "Right 90" | "Left 45" | "Right 45" | "T" | "Y" | "Four-Way" | "Five-Way";
export const SIDE_PASSAGES: RangeEntry<SidePassageKind>[] = table([
  ["1-4", "Left 90"],
  ["5-8", "Right 90"],
  ["9", "Left 45"],
  ["10", "Right 45"],
  ["11-13", "T"],
  ["14-15", "Y"],
  ["16-19", "Four-Way"],
  ["20", "Five-Way"],
]);

// --- Table 21: Passage Width (1d20) / Table 22: Special Passages (1d20) --------------------------
export type PassageWidthResult = number | "Special";
export const PASSAGE_WIDTH: RangeEntry<PassageWidthResult>[] = table<PassageWidthResult>([
  ["1", 5],
  ["2-13", 10],
  ["14-17", 20],
  ["18", 30],
  ["19-20", "Special"],
]);

export type SpecialPassageKind = "40ft wide" | "50ft wide" | "Stream" | "River" | "Chasm";
export const SPECIAL_PASSAGES: RangeEntry<SpecialPassageKind>[] = table([
  ["1-7", "40ft wide"],
  ["8-12", "50ft wide"],
  ["13-15", "Stream"],
  ["16-19", "River"],
  ["20", "Chasm"],
]);

// --- Table 23: Turns (1d20) -------------------------------------------------------------------------
export type TurnResult = "Left 90" | "Left 45" | "Right 90" | "Right 45";
export const TURNS: RangeEntry<TurnResult>[] = table([
  ["1-9", "Left 90"],
  ["10", "Left 45"],
  ["11-19", "Right 90"],
  ["20", "Right 45"],
]);
