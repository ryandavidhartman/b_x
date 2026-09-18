// Pure geometry helpers behind DungeonMap.tsx's per-subtype map styles — split out from the
// component so `boundaryLoops` stays unit-testable without tripping the react-refresh "only export
// components" lint rule, and so the geometry can be reasoned about independent of the SVG/React
// glue. Two consumers so far:
//
// - "natural" (Cave / Cavern Network), file-header note #3: trace the outer boundary of every
//   occupied cell into closed polygon loops, jitter each vertex outward/inward, then smooth the
//   result into an organic blob fringed with rock-hatch ticks, instead of the crisp per-cell walls
//   every other map style uses.
// - "temple"/(future) "castle", file-header note #6: same `boundaryLoops` tracer, but left crisp
//   and rectilinear (no jitter/smoothing) — `outerEnvelopeLoop` just picks out the single loop that
//   is the whole generated shape's outer silhouette, so it can be drawn as one thick fortified wall
//   distinct from the thin interior partition walls.

/** A grid-corner point (as opposed to a cell coordinate) — vertices here sit at cell corners, not
 * cell centers. */
export type GridPt = { x: number; y: number };

// --- Deterministic per-vertex/per-segment noise, shared with DungeonMap.tsx's own stipple pass for
// straight (non-natural) walls — no seeded-RNG library needed for a handful of small integer hashes.
export function hashSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h = Math.imul(h ^ Math.round(p * 100), 16777619);
  }
  return h >>> 0;
}
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Cardinal directions in on-screen clockwise order (y-down coordinates: N -> E -> S -> W -> N).
// Used only to resolve the pinch-point case in `boundaryLoops` below.
const CW_DIRS: GridPt[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
function cwDirIndex(d: GridPt): number {
  return CW_DIRS.findIndex((c) => c.x === d.x && c.y === d.y);
}

interface BoundaryEdge {
  from: GridPt;
  to: GridPt;
  dir: GridPt;
}

/** Turns a set of occupied cells (keyed `"x,y"`, cell coordinates) into closed polygon loops
 * tracing their outer (and any inner-hole) boundary, at cell-corner resolution. Convention: for a
 * cell (cx,cy) missing its neighbor on one side, the exposed edge is stored as a directed segment
 * with that cell's interior on the RIGHT of the direction of travel — e.g. a missing-North
 * neighbor stores the top edge running (cx+1,cy) -> (cx,cy). That convention is what
 * `jitterLoop`'s outward-normal formula assumes; flipping it flips which side reads as "outward."
 *
 * Most exposed edges have a unique start corner, so chaining edge-start -> edge-end is enough. The
 * one exception: two cells that touch only at a single corner (no shared cardinal edge — easy for
 * a twisty cave layout to produce) put two DIFFERENT exposed edges at the same start corner. When
 * that happens, the walk below picks whichever candidate is the sharpest clockwise turn away from
 * the direction it just arrived from — the standard wall-follower rule for keeping a self-touching
 * raster boundary's two loops from crossing into each other instead of splicing into one loop that
 * jumps straight across the map. */
export function boundaryLoops(occupied: Set<string>): GridPt[][] {
  const keyOf = (p: GridPt) => `${p.x},${p.y}`;
  const has = (x: number, y: number) => occupied.has(`${x},${y}`);
  const outgoing = new Map<string, BoundaryEdge[]>();
  function addEdge(from: GridPt, to: GridPt) {
    const dir = { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
    const k = keyOf(from);
    const arr = outgoing.get(k);
    const edge = { from, to, dir };
    if (arr) arr.push(edge);
    else outgoing.set(k, [edge]);
  }
  for (const key of occupied) {
    const [cx, cy] = key.split(",").map(Number);
    if (!has(cx, cy - 1)) addEdge({ x: cx + 1, y: cy }, { x: cx, y: cy });
    if (!has(cx, cy + 1)) addEdge({ x: cx, y: cy + 1 }, { x: cx + 1, y: cy + 1 });
    if (!has(cx - 1, cy)) addEdge({ x: cx, y: cy }, { x: cx, y: cy + 1 });
    if (!has(cx + 1, cy)) addEdge({ x: cx + 1, y: cy + 1 }, { x: cx + 1, y: cy });
  }

  const visited = new Set<BoundaryEdge>();
  const loops: GridPt[][] = [];
  for (const edges of outgoing.values()) {
    for (const startEdge of edges) {
      if (visited.has(startEdge)) continue;
      const loop: GridPt[] = [];
      let current: BoundaryEdge = startEdge;
      let guard = 0;
      while (!visited.has(current) && guard < 50000) {
        visited.add(current);
        loop.push(current.from);
        const candidates = outgoing.get(keyOf(current.to));
        if (!candidates || candidates.length === 0) break;
        if (candidates.length === 1) {
          current = candidates[0];
        } else {
          const backIdx = cwDirIndex({ x: -current.dir.x, y: -current.dir.y });
          let next = candidates[0];
          for (let step = 1; step <= 4; step++) {
            const found = candidates.find((c) => cwDirIndex(c.dir) === (backIdx + step) % 4);
            if (found) {
              next = found;
              break;
            }
          }
          current = next;
        }
        guard++;
      }
      if (loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

/** Displaces each boundary vertex along the (averaged) outward normal of its two adjacent edges —
 * a signed nudge, so the outline gets both outward bulges and inward notches, like weathered rock
 * rather than a uniformly-inflated balloon. Deterministic per vertex (hashed on its own grid
 * position plus `seedTag`, distinct per map so two caves don't wobble identically) so it's stable
 * across re-renders without a stored seed. */
export function jitterLoop(loop: GridPt[], seedTag: number, amount: number): GridPt[] {
  const n = loop.length;
  return loop.map((p, i) => {
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    const d1 = { x: p.x - prev.x, y: p.y - prev.y };
    const d2 = { x: next.x - p.x, y: next.y - p.y };
    // Outward normal of a directed edge (dx,dy) is (-dy,dx) — see boundaryLoops's convention note.
    const n1 = { x: -d1.y, y: d1.x };
    const n2 = { x: -d2.y, y: d2.x };
    let ax = n1.x + n2.x;
    let ay = n1.y + n2.y;
    const len = Math.hypot(ax, ay) || 1;
    ax /= len;
    ay /= len;
    const rand = mulberry32(hashSeed(p.x, p.y, seedTag));
    const amt = (rand() * 2 - 1) * amount;
    return { x: p.x + ax * amt, y: p.y + ay * amt };
  });
}

/** Smooths a closed polygon into a blobby outline by drawing quadratic curves through each edge's
 * midpoint, using the polygon's own vertices as control points — a standard corner-rounding trick
 * that needs no extra smoothing pass or curve library. */
export function smoothClosedPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 3) return "";
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(points[n - 1], points[0]);
  let d = `M ${start.x} ${start.y} `;
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const nextPt = points[(i + 1) % n];
    const m = mid(cur, nextPt);
    d += `Q ${cur.x} ${cur.y} ${m.x} ${m.y} `;
  }
  return d + "Z";
}

/** The reference cave maps' rocky wall texture is a dense fringe of short ticks pointing outward
 * from the wall, not the sparse per-segment stipple dots a straight hewn wall gets — this walks
 * the (already-jittered) boundary loop, spacing ticks every ~7px along it with a small randomized
 * length/angle per tick, same deterministic-hash approach as DungeonMap.tsx's own `stippleForWall`. */
export function rockHatchTicks(loopPx: { x: number; y: number }[], seedTag: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const n = loopPx.length;
  const ticks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = loopPx[i];
    const b = loopPx[(i + 1) % n];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 0.01) continue;
    const dirx = (b.x - a.x) / segLen;
    const diry = (b.y - a.y) / segLen;
    const nx = -diry;
    const ny = dirx;
    const count = Math.max(1, Math.round(segLen / 7));
    const rand = mulberry32(hashSeed(a.x, a.y, b.x, b.y, seedTag));
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      const baseX = a.x + (b.x - a.x) * t;
      const baseY = a.y + (b.y - a.y) * t;
      const len = 3 + rand() * 4.5;
      const angleJitter = (rand() - 0.5) * 1.1;
      const cosA = Math.cos(angleJitter);
      const sinA = Math.sin(angleJitter);
      const jnx = nx * cosA - ny * sinA;
      const jny = nx * sinA + ny * cosA;
      const startOff = 0.5 + rand() * 1.5;
      ticks.push({
        x1: baseX + nx * startOff,
        y1: baseY + ny * startOff,
        x2: baseX + jnx * (startOff + len),
        y2: baseY + jny * (startOff + len),
      });
    }
  }
  return ticks;
}

/** Picks out the one `boundaryLoops` result that is the whole generated shape's outer silhouette —
 * the biggest by bounding-box area, which reliably beats out any smaller interior hole loop (an
 * unmapped pocket fully enclosed by occupied cells, same as a real building's interior courtyard)
 * without needing full polygon-nesting/point-in-polygon logic to tell them apart. Returns null only
 * if there are no occupied cells at all. */
export function outerEnvelopeLoop(occupied: Set<string>): GridPt[] | null {
  const loops = boundaryLoops(occupied);
  if (loops.length === 0) return null;
  function bboxArea(loop: GridPt[]): number {
    const xs = loop.map((p) => p.x);
    const ys = loop.map((p) => p.y);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  }
  return loops.reduce((best, loop) => (bboxArea(loop) > bboxArea(best) ? loop : best));
}

/** A loop vertex is convex (an outward corner of the shape, like an actual corner of a building)
 * when the turn from its incoming to outgoing edge direction has a negative cross product — see
 * `boundaryLoops`'s "interior on the right" convention, which fixes this sign for every outer loop
 * this tracer produces. A concave vertex (an inward notch, like where two wings meet) has a
 * positive cross product instead and is excluded — a corner tower belongs at an actual corner of
 * the building's silhouette, not in a notch. Collinear points along a straight run have a zero
 * cross product and are excluded too, with no separate simplification pass needed. */
export function convexCorners(loop: GridPt[]): GridPt[] {
  const n = loop.length;
  const corners: GridPt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const d1 = { x: cur.x - prev.x, y: cur.y - prev.y };
    const d2 = { x: next.x - cur.x, y: next.y - cur.y };
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (cross < 0) corners.push(cur);
  }
  return corners;
}
