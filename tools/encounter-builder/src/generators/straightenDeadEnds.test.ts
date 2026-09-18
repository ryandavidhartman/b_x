import { describe, it, expect } from "vitest";
import { generateWholeDungeon, straightenDeadEnds, type GenerateOptions, type DungeonNode } from "./randomDungeon";

const AREA_KINDS = new Set(["room", "chamber", "cave", "cavern", "stairs"]);

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

function occupiedCellsOf(nodes: DungeonNode[]): Set<string> {
  const occupied = new Set<string>();
  for (const n of nodes) for (const c of n.cells) occupied.add(`${c.x},${c.y}`);
  return occupied;
}

const CASE: GenerateOptions = { category: "dungeon", dungeonSubtype: "Standard Dungeon", partyLevel: 3, maxNodes: 20, startArea: "empty" };

describe("straightenDeadEnds", () => {
  it("is a no-op at 0%", () => {
    const nodes = generateWholeDungeon(CASE);
    expect(straightenDeadEnds(nodes, 0)).toBe(nodes);
  });

  it("never removes an area node (room/chamber/cave/cavern/stairs)", () => {
    for (let i = 0; i < 20; i++) {
      const nodes = generateWholeDungeon(CASE);
      const before = nodes.filter((n) => AREA_KINDS.has(n.kind)).map((n) => n.id);
      const after = straightenDeadEnds(nodes, 100);
      const afterIds = new Set(after.map((n) => n.id));
      for (const id of before) expect(afterIds.has(id)).toBe(true);
    }
  });

  it("never discards a corridor carrying a rolled wandering-monster encounter", () => {
    for (let i = 0; i < 20; i++) {
      const nodes = generateWholeDungeon(CASE);
      const withWandering = nodes.filter((n) => n.wanderingMonsters && n.wanderingMonsters.length > 0).map((n) => n.id);
      const after = straightenDeadEnds(nodes, 100);
      const afterIds = new Set(after.map((n) => n.id));
      for (const id of withWandering) expect(afterIds.has(id)).toBe(true);
    }
  });

  it("keeps the remaining map fully connected at every percentage", () => {
    for (const percent of [10, 50, 100]) {
      for (let i = 0; i < 10; i++) {
        const nodes = generateWholeDungeon(CASE);
        const after = straightenDeadEnds(nodes, percent);
        expect(floodFillConnected(occupiedCellsOf(after))).toBe(true);
      }
    }
  });

  it("removes at least some dead ends at 100% when any collapsible ones exist", () => {
    let sawRemoval = false;
    for (let i = 0; i < 30 && !sawRemoval; i++) {
      const nodes = generateWholeDungeon({ ...CASE, maxNodes: 30 });
      const after = straightenDeadEnds(nodes, 100);
      if (after.length < nodes.length) sawRemoval = true;
    }
    expect(sawRemoval).toBe(true);
  });
});
