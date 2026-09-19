import { describe, it, expect } from "vitest";
import { generateBuildingLayout } from "./buildingLayout";
import type { TempleShape } from "./buildingShapes";
import type { GenerateOptions } from "./randomDungeon";

function floodFillConnected(occupied: Set<string>): boolean {
  if (occupied.size === 0) return true;
  const start = occupied.values().next().value!;
  const seen = new Set([start]);
  const stack = [start];
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const [x, y] = cur.split(",").map(Number);
    for (const [dx, dy] of deltas) {
      const key = `${x + dx},${y + dy}`;
      if (occupied.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push(key);
      }
    }
  }
  return seen.size === occupied.size;
}

function checkConnectedNoCollisions(opts: GenerateOptions, shape?: TempleShape) {
  const { nodes } = generateBuildingLayout(opts, shape);
  const occupied = new Set<string>();
  for (const node of nodes) {
    for (const cell of node.cells) {
      const key = `${cell.x},${cell.y}`;
      expect(occupied.has(key)).toBe(false);
      occupied.add(key);
    }
  }
  expect(floodFillConnected(occupied)).toBe(true);
  return nodes;
}

const RECTANGLE_CASES: GenerateOptions[] = [
  { category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 6 },
  { category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 },
  { category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 30 },
  { category: "castle", partyLevel: 3, maxNodes: 6 },
  { category: "castle", partyLevel: 3, maxNodes: 15 },
  { category: "castle", partyLevel: 3, maxNodes: 30 },
];

const POLYGON_SHAPES: TempleShape[] = ["rhombus", "hexagon", "octagon", "star", "circle", "oval"];

describe("generateBuildingLayout (rectangle)", () => {
  for (const opts of RECTANGLE_CASES) {
    it(`(${opts.category}, maxNodes=${opts.maxNodes}) stays fully connected with no cell collisions`, () => {
      for (let trial = 0; trial < 5; trial++) checkConnectedNoCollisions(opts);
    });
  }

  it("places at least one door (the main entrance) and roughly the requested number of rooms", () => {
    const { nodes } = generateBuildingLayout({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 });
    expect(nodes.some((n) => n.connectionToParent === "door")).toBe(true);
    const areaNodes = nodes.filter((n) => n.areaNumber !== undefined);
    // The courtyard is one extra area node beyond the requested room count, and a rare oversized
    // Table 2/4 roll can stub a bay out as a dead end (see commitRoom's collision fallback) instead
    // of becoming a real room — so this checks "close to," not exactly, 15 + 1.
    expect(areaNodes.length).toBeGreaterThanOrEqual(10);
    expect(areaNodes.length).toBeLessThanOrEqual(16);
  });

  it("gives every area node a sequential areaNumber with no gaps or duplicates", () => {
    const { nodes } = generateBuildingLayout({ category: "castle", partyLevel: 3, maxNodes: 20 });
    const numbers = nodes.map((n) => n.areaNumber).filter((n): n is number => n !== undefined);
    const sorted = [...numbers].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
  });

  it("returns a 4-corner rectangle envelope with all 4 vertices marked as corners", () => {
    const { envelope } = generateBuildingLayout({ category: "castle", partyLevel: 3, maxNodes: 15 });
    expect(envelope.outline).toHaveLength(4);
    expect(envelope.corners).toHaveLength(4);
  });
});

describe("generateBuildingLayout (polygon shapes)", () => {
  for (const shape of POLYGON_SHAPES) {
    it(`(${shape}, maxNodes=15) stays fully connected with no cell collisions, and places at least one door`, () => {
      for (let trial = 0; trial < 5; trial++) {
        const nodes = checkConnectedNoCollisions({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 }, shape);
        expect(nodes.some((n) => n.connectionToParent === "door")).toBe(true);
      }
    });

    // Regression: a small "Number of Rooms" alone can ask for a footprint too small for the fixed
    // wall thickness to fit inside at all (a star's tight waist between its points was the shape
    // that first exposed it — insetOutline's scale-toward-center approximation clamped to its own
    // floor and collapsed the whole building to nothing, rendering as an empty map). Every shape
    // gets the same size floor, so this checks all of them, not just star.
    it(`(${shape}, maxNodes=1) still produces a real, connected building instead of collapsing to nothing`, () => {
      const nodes = checkConnectedNoCollisions({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 1 }, shape);
      const totalCells = nodes.reduce((s, n) => s + n.cells.length, 0);
      expect(totalCells).toBeGreaterThan(20);
      expect(nodes.some((n) => n.connectionToParent === "door")).toBe(true);
    });

    it(`(${shape}) returns a non-empty envelope outline`, () => {
      const { envelope } = generateBuildingLayout({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 }, shape);
      expect(envelope.outline.length).toBeGreaterThan(0);
    });
  }

  it("marks every vertex of a polygonal shape (hexagon) as a corner, but no vertex of a round shape (circle)", () => {
    const hexagon = generateBuildingLayout({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 }, "hexagon");
    expect(hexagon.envelope.corners.length).toBe(hexagon.envelope.outline.length);
    expect(hexagon.envelope.corners.length).toBeGreaterThan(0);

    const circle = generateBuildingLayout({ category: "dungeon", dungeonSubtype: "Evil Temple / Shrine", partyLevel: 3, maxNodes: 15 }, "circle");
    expect(circle.envelope.corners).toHaveLength(0);
  });
});
