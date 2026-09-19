// Pure per-terrain style data for DungeonMap.tsx's Wilderness rendering (file-header note #10) —
// no geometry or JSX here, just which decorative marks belong to which of Appendix D's 14
// wilderness terrains, and in what color/density. Terrain names match `TERRAIN_NAMES` from
// tools/shared (Object.keys of the wilderness terrain table) exactly, so this table's keys stay
// meaningful without needing their own separate union type check.
export type MarkKind = "tree" | "wave" | "arc" | "rockCluster" | "tuft" | "tombstone" | "reedClump" | "snowflake" | "cactus" | "fencePost" | "cropRow" | "pool";

export interface MarkSpec {
  kind: MarkKind;
  color: string;
  /** Chance (0-1) an occupied cell gets this mark at all — independent per mark, so a terrain with
   * two marks can have both, one, or neither on any given cell. */
  density: number;
  /** Relative size multiplier vs. that mark's own default size, default 1. */
  scale?: number;
}

export interface TerrainStyle {
  background: string;
  marks: MarkSpec[];
  trailColor: string;
  /** SVG stroke-dasharray for the trail line — every terrain gets its own rhythm (a wide dotted
   * "current" line for open water, a tight scree-scramble dash for mountains, and so on), not just
   * a different color, since the trail is the one element every terrain has in common. */
  trailDash: string;
}

export const TERRAIN_STYLES: Record<string, TerrainStyle> = {
  Aquatic: {
    background: "#c9dde8",
    marks: [{ kind: "wave", color: "#7fa8c2", density: 0.2 }],
    trailColor: "#4d7896",
    trailDash: "1,4",
  },
  Arctic: {
    background: "#e6eef2",
    marks: [
      { kind: "snowflake", color: "#a9c9d6", density: 0.14 },
      { kind: "arc", color: "#c3d5dc", density: 0.06, scale: 0.7 },
    ],
    trailColor: "#8fa8b3",
    trailDash: "2,5",
  },
  Desert: {
    background: "#ecdfb8",
    marks: [
      { kind: "arc", color: "#d0bd83", density: 0.24 },
      { kind: "cactus", color: "#7a8f5c", density: 0.05 },
    ],
    trailColor: "#a68f55",
    trailDash: "1,5",
  },
  Forest: {
    background: "#c3d9b0",
    marks: [{ kind: "tree", color: "#5c8a4a", density: 0.22 }],
    trailColor: "#6b4f34",
    trailDash: "4,3",
  },
  Graveyard: {
    background: "#c7ccbb",
    marks: [
      { kind: "tombstone", color: "#84887c", density: 0.1 },
      { kind: "tuft", color: "#8c9678", density: 0.08, scale: 0.7 },
    ],
    trailColor: "#7a7d70",
    trailDash: "3,3",
  },
  Hills: {
    background: "#c9d3a3",
    marks: [{ kind: "arc", color: "#9fae78", density: 0.18, scale: 1.2 }],
    trailColor: "#7a6a45",
    trailDash: "5,3",
  },
  Jungle: {
    background: "#a9c98a",
    marks: [
      { kind: "tree", color: "#4a7a3a", density: 0.3, scale: 1.15 },
      { kind: "tuft", color: "#6fa050", density: 0.16, scale: 1.2 },
    ],
    trailColor: "#3f5c30",
    trailDash: "2,3",
  },
  "Lost World": {
    background: "#bcc99a",
    marks: [
      { kind: "tree", color: "#6b7a3f", density: 0.2, scale: 1.3 },
      { kind: "rockCluster", color: "#9a8f7a", density: 0.06 },
    ],
    trailColor: "#6b5a3f",
    trailDash: "4,4",
  },
  Marine: {
    background: "#a9c4d8",
    marks: [{ kind: "wave", color: "#6b93b3", density: 0.14, scale: 1.3 }],
    trailColor: "#3d5f7a",
    trailDash: "1,6",
  },
  Mountains: {
    background: "#c9c2b0",
    marks: [
      { kind: "rockCluster", color: "#8f887a", density: 0.2 },
      { kind: "arc", color: "#a49c8a", density: 0.1, scale: 1.4 },
    ],
    trailColor: "#6e6355",
    trailDash: "5,4",
  },
  Plains: {
    background: "#dbe0b0",
    marks: [{ kind: "tuft", color: "#a8b56a", density: 0.08 }],
    trailColor: "#96895a",
    trailDash: "6,3",
  },
  Rural: {
    background: "#d6d9ae",
    marks: [
      { kind: "cropRow", color: "#a08a5c", density: 0.12 },
      { kind: "fencePost", color: "#7a6440", density: 0.04 },
    ],
    trailColor: "#7a6440",
    trailDash: "5,2",
  },
  Tundra: {
    background: "#cdd3bf",
    marks: [{ kind: "tuft", color: "#8d9a7c", density: 0.1, scale: 0.7 }],
    trailColor: "#7d8a72",
    trailDash: "3,4",
  },
  Wetlands: {
    background: "#c0cba8",
    marks: [
      { kind: "reedClump", color: "#4f6b3f", density: 0.18 },
      { kind: "pool", color: "#8aa3ac", density: 0.05 },
    ],
    trailColor: "#4f5f3f",
    trailDash: "2,3",
  },
};
