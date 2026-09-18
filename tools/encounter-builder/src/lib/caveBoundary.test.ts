// Regression test for a real bug found while adding the natural-cave rendering: two cells that
// touch only at a single corner (no shared cardinal edge — easy for a twisty cave layout to
// produce) put two DIFFERENT exposed edges at the same start corner. The original implementation
// keyed its edge map by start corner alone, so the second edge silently overwrote the first,
// splicing the two cells' separate boundary loops into one path that jumped straight across the
// map (visible as a long spurious diagonal line cutting through unrelated rooms on a generated
// cave map). `boundaryLoops` now keeps every edge at a shared corner and resolves the ambiguity
// with a clockwise turn-priority rule instead of last-write-wins.
import { describe, it, expect } from "vitest";
import { boundaryLoops, outerEnvelopeLoop, convexCorners } from "./caveBoundary";

function loopPointSets(loops: { x: number; y: number }[][]): Set<string>[] {
  return loops.map((loop) => new Set(loop.map((p) => `${p.x},${p.y}`)));
}

describe("boundaryLoops", () => {
  it("traces a single occupied cell as one 4-vertex loop", () => {
    const loops = boundaryLoops(new Set(["0,0"]));
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(4);
  });

  it("keeps two diagonally-touching cells as two separate loops, not one merged loop", () => {
    // (0,0) and (1,1) share only the single corner point (1,1) — no cardinal adjacency.
    const loops = boundaryLoops(new Set(["0,0", "1,1"]));
    expect(loops).toHaveLength(2);
    for (const loop of loops) expect(loop).toHaveLength(4);

    const sets = loopPointSets(loops);
    const cellAPoints = new Set(["0,0", "1,0", "1,1", "0,1"]);
    const cellBPoints = new Set(["1,1", "2,1", "2,2", "1,2"]);
    const matchesA = sets.some((s) => s.size === cellAPoints.size && [...s].every((p) => cellAPoints.has(p)));
    const matchesB = sets.some((s) => s.size === cellBPoints.size && [...s].every((p) => cellBPoints.has(p)));
    expect(matchesA).toBe(true);
    expect(matchesB).toBe(true);
  });

  it("traces a 2x2 block as one loop covering its outer perimeter, not one per cell", () => {
    // No collinear-point simplification by design (see jitterLoop) — a vertex sits at every unit
    // grid step, so a 2x2 block's outer perimeter (8 grid units around) is 8 points, not 4.
    const loops = boundaryLoops(new Set(["0,0", "1,0", "0,1", "1,1"]));
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(8);
  });

  it("handles an L-shaped region without merging or dropping any boundary vertex", () => {
    // perimeter = 4*cells - 2*sharedEdges = 4*3 - 2*2 = 8 grid units around.
    const loops = boundaryLoops(new Set(["0,0", "0,1", "1,1"]));
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(8);
  });
});

describe("outerEnvelopeLoop", () => {
  it("picks the outer perimeter over a smaller interior hole (courtyard) loop", () => {
    // A 3x3 block with its center cell missing — a ring, like a building with a courtyard.
    const ring = new Set<string>();
    for (let x = 0; x <= 2; x++) for (let y = 0; y <= 2; y++) if (!(x === 1 && y === 1)) ring.add(`${x},${y}`);
    const outer = outerEnvelopeLoop(ring);
    expect(outer).not.toBeNull();
    // The outer loop's bounding box spans the full 3x3 block (corners at 0 and 3), not the 1x1 hole.
    const xs = outer!.map((p) => p.x);
    const ys = outer!.map((p) => p.y);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(3);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(3);
  });

  it("returns null for an empty region", () => {
    expect(outerEnvelopeLoop(new Set())).toBeNull();
  });
});

describe("convexCorners", () => {
  it("finds all 4 corners of a plain square convex", () => {
    const [loop] = boundaryLoops(new Set(["0,0", "1,0", "0,1", "1,1"]));
    expect(convexCorners(loop)).toHaveLength(4);
  });

  it("excludes the one concave notch of an L-shaped region", () => {
    // 6 true geometric corners (5 convex + 1 concave, turning number 5*90 - 90 = 360), plus 2
    // collinear mid-edge points from the raw 8-vertex grid loop — convexCorners drops both the
    // concave one and the two collinear ones, keeping only the 5 convex corners.
    const [loop] = boundaryLoops(new Set(["0,0", "0,1", "1,1"]));
    expect(loop).toHaveLength(8);
    expect(convexCorners(loop)).toHaveLength(5);
  });
});
