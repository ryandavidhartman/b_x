// Regression test for the "no disconnected islands" fix described in the dungeon-generator
// connectivity feedback: every physical cell this engine places (across rooms, chambers, caves,
// caverns, and corridors) must be reachable on foot from every other one via 4-directional
// adjacency. The generator used to have a code path (removed) that could, ~25% of the time, start
// a second branch that was never spatially wired back to the rest of the map — a party could never
// walk to it. This test drives the same public entry point the UI's "Generate" button uses, across
// every location category/subtype and a spread of map sizes, so that regression can't come back
// silently.
import { describe, it, expect } from "vitest";
import { generateWholeDungeon, type GenerateOptions } from "./randomDungeon";

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

function runAndCheck(opts: GenerateOptions) {
  const nodes = generateWholeDungeon(opts);
  const occupied = new Set<string>();
  for (const node of nodes) {
    for (const cell of node.cells) {
      const key = `${cell.x},${cell.y}`;
      // No two nodes should ever claim the same cell — tryPlace() is supposed to guarantee this.
      expect(occupied.has(key)).toBe(false);
      occupied.add(key);
    }
  }
  expect(floodFillConnected(occupied)).toBe(true);
}

const DUNGEON_SUBTYPES = ["Standard Dungeon", "Cave / Cavern Network", "Tomb / Crypt", "Evil Temple / Shrine", "Sewer", "Ruins"];
const WILDERNESS_TERRAINS = ["Forest", "Mountains", "Aquatic"];
const TRIALS_PER_CASE = 4;
const MAX_NODES_SPREAD = [3, 10, 25];

describe("randomDungeon connectivity", () => {
  for (const dungeonSubtype of DUNGEON_SUBTYPES) {
    for (const startArea of ["empty", 1, 6] as const) {
      it(`dungeon (${dungeonSubtype}, startArea=${startArea}) stays fully connected`, () => {
        for (let trial = 0; trial < TRIALS_PER_CASE; trial++) {
          for (const maxNodes of MAX_NODES_SPREAD) {
            runAndCheck({ category: "dungeon", dungeonSubtype, partyLevel: 3, maxNodes, startArea });
          }
        }
      });
    }
  }

  for (const terrain of WILDERNESS_TERRAINS) {
    it(`wilderness (${terrain}) stays fully connected`, () => {
      for (let trial = 0; trial < TRIALS_PER_CASE; trial++) {
        for (const maxNodes of MAX_NODES_SPREAD) {
          runAndCheck({ category: "wilderness", terrain, partyLevel: 3, maxNodes });
        }
      }
    });
  }

  for (const category of ["urban", "castle"] as const) {
    it(`${category} stays fully connected`, () => {
      for (let trial = 0; trial < TRIALS_PER_CASE; trial++) {
        for (const maxNodes of MAX_NODES_SPREAD) {
          runAndCheck({ category, partyLevel: 3, maxNodes });
        }
      }
    });
  }
});
