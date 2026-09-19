// A second, deliberately different spatial algorithm from this file's neighbor randomDungeon.ts —
// used only for Evil Temple/Shrine and Castle. Appendix E's own room-by-room/corridor-by-corridor
// walk (Table 1-23) grows an organic branching shape with plenty of empty space between its arms;
// no amount of cosmetic wall dressing on that shape reads as "one building" (see the DungeonMap.tsx
// design conversation this followed — a thick outline traced around the same jagged silhouette
// still looked like a decorated dungeon crawl, not a floor plan). A real building's footprint is
// instead a compact, mostly-filled volume, which needs a different SPATIAL algorithm, not a
// different skin — so this one places rooms concentrically instead of walking a random branch:
//
//   outer wall -> a ring of rooms (Table 2/2b sizes, same as any dungeon room) -> a 1-cell aisle
//   ring connecting all of them -> one central courtyard/great hall.
//
// Every room still rolls its own book content in full — size (Table 2/2b), Special shapes
// (Table 3/4), contents (Table 8), treasure (Table 9-11 / Appendix B), monsters (Appendix C/the
// book's own encounter tables), traps — via the exact same `generateRoomOrChamber`/
// `rollRoomOrChamberContents` the walk engine calls. Only the SPATIAL ARRANGEMENT is this app's own
// invention: no book table says to lay rooms out this way, or governs a courtyard, ring, or
// building envelope at all. `generateRoomOrChamber`'s `rollExits: false` means a room still rolls
// Table 5 for "further exits" (for completeness/flavor in its own roll transcript) but that roll's
// outcome isn't acted on, since the room's one real connection is fixed by its position in the
// ring, not a random walk.
//
// Castle always uses the plain rectangle below. Temple can additionally use a rhombus, hexagon,
// octagon, star, circle, or oval footprint (buildingShapes.ts) — same ring/aisle/courtyard idea,
// generalized to walk an arbitrary polygon's perimeter instead of 4 straight sides. A room is still
// always an axis-aligned box (this engine's own square-cell limit — see randomDungeon.ts's
// `snapToCardinal`), so a room sitting against a 30-degree hexagon wall won't hug it perfectly the
// way one against a rectangle's wall does; the gap just reads as more of the hatch-filled
// "undetailed construction" background DungeonMap.tsx already draws. The building's true outline
// still comes through clearly because the envelope band/hatch-fill trace the real polygon, not the
// rooms' own footprints.
import {
  type GenerateOptions,
  type GenState,
  type DungeonNode,
  type GridPoint,
  type Heading,
  tryPlace,
  makeNode,
  generateRoomOrChamber,
  rollRoomOrChamberContents,
} from "./randomDungeon";
import { type TempleShape, type Pt, scaledOutline, insetOutline, pointInPolygon, boundingBox, translate, pointAndNormalAtArcLength, polygonPerimeter, minVertexRadius } from "./buildingShapes";

const FT_PER_CELL = 10;
const SLOT_PITCH = 5; // cells of wall-space reserved per room bay (50 ft — comfortably fits every non-Special Table 2/2b roll)
const SLOT_DEPTH = 4; // cells a room extends inward from the building's own outer wall (40 ft)
const AISLE = 1; // cells of corridor ring between the room band and the courtyard
const MIN_COURTYARD = 6; // cells, each axis — even a small building gets a real hall, not a closet

/** What DungeonMap.tsx actually needs to draw the fortified envelope band, hatch-fill, and corner
 * towers — kept separate from the placed cells/nodes since it's a precise geometric outline (can
 * have fractional coordinates), not a set of occupied grid cells. */
export interface BuildingEnvelope {
  /** Closed polygon, clockwise, in the same grid-cell coordinate space as every node's cells. */
  outline: GridPoint[];
  /** Subset of `outline` worth a corner-tower glyph — every vertex for a polygonal shape, empty
   * for a circle/oval (a round building has no natural corner). */
  corners: GridPoint[];
}

export interface BuildingLayoutResult {
  nodes: DungeonNode[];
  envelope: BuildingEnvelope;
}

function splitFour(n: number): [number, number, number, number] {
  const base = Math.floor(n / 4);
  const rem = n % 4;
  return [base + (rem > 0 ? 1 : 0), base + (rem > 1 ? 1 : 0), base + (rem > 2 ? 1 : 0), base];
}

function bayCentersInRange(count: number, start: number): number[] {
  return Array.from({ length: count }, (_, i) => start + Math.round(i * SLOT_PITCH + SLOT_PITCH / 2));
}

function newState(opts: GenerateOptions): GenState {
  const maxNodes = opts.maxNodes ?? 20;
  return {
    category: opts.category,
    dungeonSubtype: opts.dungeonSubtype,
    terrain: opts.terrain,
    partyLevel: opts.partyLevel,
    occupied: new Set(),
    nodes: [],
    work: [],
    nextId: 0,
    maxNodes,
    hardNodeCap: Math.max(400, maxNodes * 20),
    areaCount: 0,
  };
}

export function generateBuildingLayout(opts: GenerateOptions, shape: TempleShape = "rectangle"): BuildingLayoutResult {
  return shape === "rectangle" ? generateRectangleLayout(opts) : generatePolygonLayout(opts, shape);
}

// --- Rectangle (Castle always; Temple's default) ------------------------------------------------
function generateRectangleLayout(opts: GenerateOptions): BuildingLayoutResult {
  const state = newState(opts);
  const N = Math.max(1, opts.maxNodes ?? 20);
  const [topN, bottomN, leftN, rightN] = splitFour(N);
  const bottomBays = bottomN + 1; // +1 reserved bay for the main entrance, not counted against "Number of Rooms"

  const W = Math.max(2 * (SLOT_DEPTH + AISLE) + MIN_COURTYARD, Math.max(topN, bottomBays) * SLOT_PITCH);
  const H = Math.max(2 * (SLOT_DEPTH + AISLE) + MIN_COURTYARD, 2 * (SLOT_DEPTH + AISLE) + Math.max(leftN, rightN) * SLOT_PITCH);

  const ringY0 = SLOT_DEPTH;
  const ringY1 = H - SLOT_DEPTH - 1;
  const ringX0 = SLOT_DEPTH;
  const ringX1 = W - SLOT_DEPTH - 1;

  // --- The aisle ring: two full-width rows and two full-height columns, forming a "#" so every
  // room bay's anchor point (however close it sits to a corner) always lands on an occupied cell.
  const ringNodesByCell = new Map<string, DungeonNode>();
  function placeRingLine(cells: GridPoint[], heading: Heading, label: string) {
    const fresh = cells.filter((c) => !state.occupied.has(`${c.x},${c.y}`));
    if (fresh.length === 0) return;
    tryPlace(state, fresh);
    const node = makeNode(state, null, "corridor", heading, fresh[0], fresh, label, "open");
    for (const c of node.cells) ringNodesByCell.set(`${c.x},${c.y}`, node);
  }
  placeRingLine(Array.from({ length: W }, (_, x) => ({ x, y: ringY0 })), 90, "Aisle (north)");
  placeRingLine(Array.from({ length: W }, (_, x) => ({ x, y: ringY1 })), 90, "Aisle (south)");
  placeRingLine(Array.from({ length: H }, (_, y) => ({ x: ringX0, y })), 180, "Aisle (west)");
  placeRingLine(Array.from({ length: H }, (_, y) => ({ x: ringX1, y })), 180, "Aisle (east)");

  // --- The courtyard: one big open hall filling everything the ring encloses — connects to the
  // ring by mere cell adjacency (both occupied), same as any two open spaces on this engine's map,
  // no door needed between a hall and its own surrounding aisle.
  const courtyardCells: GridPoint[] = [];
  for (let y = ringY0 + 1; y < ringY1; y++) for (let x = ringX0 + 1; x < ringX1; x++) courtyardCells.push({ x, y });
  tryPlace(state, courtyardCells);
  const courtyard = makeNode(state, null, "chamber", 0, courtyardCells[0], courtyardCells, "Great Hall", "open");
  courtyard.widthFt = (ringX1 - ringX0 - 1) * FT_PER_CELL;
  courtyard.lengthFt = (ringY1 - ringY0 - 1) * FT_PER_CELL;
  courtyard.shapeLabel = "Hall";
  rollRoomOrChamberContents(state, courtyard);

  // --- Room bays: one per side, anchored on the ring, growing outward to the building's own wall.
  function placeBay(anchor: GridPoint, heading: Heading) {
    const parent = ringNodesByCell.get(`${anchor.x},${anchor.y}`);
    generateRoomOrChamber(state, parent?.id ?? null, heading, anchor, "room", "door", false);
  }
  for (const x of bayCentersInRange(topN, 0)) placeBay({ x, y: ringY0 }, 0);
  const bottomCenters = bayCentersInRange(bottomBays, 0);
  const entranceIndex = Math.floor(bottomBays / 2);
  bottomCenters.forEach((x, i) => {
    if (i !== entranceIndex) placeBay({ x, y: ringY1 }, 180);
  });
  for (const y of bayCentersInRange(leftN, ringY0)) placeBay({ x: ringX0, y }, 270);
  for (const y of bayCentersInRange(rightN, ringY0)) placeBay({ x: ringX1, y }, 90);

  // --- Main entrance: a short corridor punched through the reserved bottom-center bay, from the
  // aisle ring straight out to a threshold cell just beyond the building's own outer wall — the one
  // deliberate break in an otherwise solid perimeter, marked with a real door glyph.
  const entranceX = bottomCenters[entranceIndex];
  const entranceAnchor = { x: entranceX, y: ringY1 };
  const entranceParent = ringNodesByCell.get(`${entranceAnchor.x},${entranceAnchor.y}`);
  const entranceCells: GridPoint[] = [];
  for (let y = ringY1 + 1; y <= H - 1; y++) entranceCells.push({ x: entranceX, y });
  tryPlace(state, entranceCells);
  const entranceCorridor = makeNode(state, entranceParent?.id ?? null, "corridor", 180, entranceAnchor, entranceCells, "Entrance Passage", "open");
  const thresholdCell = { x: entranceX, y: H };
  tryPlace(state, [thresholdCell]);
  makeNode(state, entranceCorridor.id, "corridor", 180, entranceCorridor.farCell, [thresholdCell], "Main Entrance", "door");

  const corners: GridPoint[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  return { nodes: state.nodes, envelope: { outline: corners, corners } };
}

// --- Polygon shapes (Temple only): rhombus, hexagon, octagon, star, circle, oval -----------------
/** Snaps an arbitrary direction to whichever cardinal heading it's closest to (largest dot
 * product) — used for a room's own growth direction, which must be axis-aligned (this engine's
 * square-cell room footprints can't be rotated — see randomDungeon.ts's `snapToCardinal`, the same
 * idea applied there to an approach corridor's heading instead of a polygon edge's normal). */
function snapDirectionToCardinal(dir: Pt): Heading {
  const options: [Heading, number, number][] = [
    [0, 0, -1],
    [90, 1, 0],
    [180, 0, 1],
    [270, -1, 0],
  ];
  let best: Heading = options[0][0];
  let bestDot = -Infinity;
  for (const [h, dx, dy] of options) {
    const dot = dir.x * dx + dir.y * dy;
    if (dot > bestDot) {
      bestDot = dot;
      best = h;
    }
  }
  return best;
}

function findNearestAisleCell(approx: Pt, aisleCells: Set<string>): GridPoint | null {
  const rx = Math.round(approx.x);
  const ry = Math.round(approx.y);
  for (let r = 0; r <= 4; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = rx + dx;
        const cy = ry + dy;
        if (aisleCells.has(`${cx},${cy}`)) return { x: cx, y: cy };
      }
    }
  }
  return null;
}

function generatePolygonLayout(opts: GenerateOptions, shape: Exclude<TempleShape, "rectangle">): BuildingLayoutResult {
  const state = newState(opts);
  const N = Math.max(1, opts.maxNodes ?? 20);
  // A small "Number of Rooms" alone can ask for a footprint too small for the fixed wall thickness
  // (SLOT_DEPTH+AISLE) to fit inside at all — a star's narrow valleys are the extreme case (its own
  // MINIMUM vertex radius, not its average, is what actually risks pinching shut), but any shape
  // can collapse to a degenerate sliver-or-nothing courtyard/aisle at a small enough size. This
  // shape's own vertices-at-perimeter-1 already say exactly how much perimeter it needs to keep
  // even its narrowest point above the minimum a real courtyard needs.
  const minRadius = SLOT_DEPTH + AISLE + MIN_COURTYARD / 2;
  const radiusPerUnitPerimeter = minVertexRadius(scaledOutline(shape, 1));
  const minPerimeterForShape = minRadius / radiusPerUnitPerimeter;
  const targetPerimeter = Math.max((N + 1) * SLOT_PITCH, minPerimeterForShape); // +1 bay's worth of perimeter reserved for the entrance

  const rawOuter = scaledOutline(shape, targetPerimeter);
  const rawAisleInset = insetOutline(rawOuter, SLOT_DEPTH);
  const rawCourtyardInset = insetOutline(rawOuter, SLOT_DEPTH + AISLE);
  const bbox = boundingBox(rawOuter);
  const margin = 2;
  const dx = margin - bbox.minX;
  const dy = margin - bbox.minY;
  const outer = translate(rawOuter, dx, dy);
  const aisleInset = translate(rawAisleInset, dx, dy);
  const courtyardInset = translate(rawCourtyardInset, dx, dy);

  const maxX = Math.ceil(boundingBox(outer).maxX) + 1;
  const maxY = Math.ceil(boundingBox(outer).maxY) + 1;

  // --- Rasterize the aisle ring and the courtyard directly from the polygon boundaries — the
  // polygon equivalent of the rectangle layout's "#"-shaped ring lines and rectangular hall.
  const aisleCellSet = new Set<string>();
  const aisleCells: GridPoint[] = [];
  const courtyardCells: GridPoint[] = [];
  for (let x = 0; x < maxX; x++) {
    for (let y = 0; y < maxY; y++) {
      const center = { x: x + 0.5, y: y + 0.5 };
      if (pointInPolygon(center, courtyardInset)) {
        courtyardCells.push({ x, y });
      } else if (pointInPolygon(center, aisleInset)) {
        aisleCellSet.add(`${x},${y}`);
        aisleCells.push({ x, y });
      }
    }
  }

  tryPlace(state, aisleCells);
  const aisleNode = makeNode(state, null, "corridor", 90, aisleCells[0] ?? { x: 0, y: 0 }, aisleCells, "Aisle", "open");

  tryPlace(state, courtyardCells);
  const courtyard = makeNode(state, null, "chamber", 0, courtyardCells[0] ?? { x: 0, y: 0 }, courtyardCells, "Great Hall", "open");
  const courtyardBox = boundingBox(courtyardInset);
  courtyard.widthFt = Math.round(courtyardBox.maxX - courtyardBox.minX) * FT_PER_CELL;
  courtyard.lengthFt = Math.round(courtyardBox.maxY - courtyardBox.minY) * FT_PER_CELL;
  courtyard.shapeLabel = "Hall";
  rollRoomOrChamberContents(state, courtyard);

  // --- Bay candidates: walk the outer polygon's perimeter at a steady pitch, anchoring each bay on
  // the nearest aisle cell reached by stepping inward from the wall, same idea as the rectangle
  // case's ring-line anchors — just following an arbitrary polygon instead of 4 straight sides.
  const total = polygonPerimeter(outer);
  const bayCount = Math.max(4, Math.round(total / SLOT_PITCH));
  const bayCandidates: { anchor: GridPoint; heading: Heading; y: number }[] = [];
  for (let i = 0; i < bayCount; i++) {
    const along = i * (total / bayCount);
    const { point, outwardNormal } = pointAndNormalAtArcLength(outer, along);
    const inward = { x: -outwardNormal.x, y: -outwardNormal.y };
    // The room itself grows OUTWARD from its aisle anchor toward the wall (matching the rectangle
    // layout's own convention — e.g. its top-band rooms anchor on the ring and grow north, away
    // from the courtyard which sits south of that ring); only the anchor's own position is found by
    // stepping INWARD from the boundary. Using `inward` for both, as an earlier version of this did,
    // sent every room's very first cell straight back into the aisle/courtyard it just came from —
    // an instant collision, silently swallowed by commitRoom's existing dead-end fallback.
    const heading = snapDirectionToCardinal(outwardNormal);
    const approxAnchor = { x: point.x + inward.x * SLOT_DEPTH, y: point.y + inward.y * SLOT_DEPTH };
    const anchor = findNearestAisleCell(approxAnchor, aisleCellSet);
    if (!anchor) continue;
    bayCandidates.push({ anchor, heading, y: point.y });
  }

  // --- Main entrance: placed FIRST, before any room, so its straight corridor to the outer wall
  // always gets a clean, uncontested path — same idea as the rectangle case's corridor punched
  // through a reserved bay, but this shape's bays don't tile the wall as exactly evenly, so a room
  // placed first could otherwise grow across where the entrance needs to go. Tries candidate bays
  // in order from visually "lowest" (largest y) to least-low, same bottom-center-ish convention the
  // rectangle layout uses, and actually checks `tryPlace`'s result — an earlier version of this
  // didn't, which could silently hand two different nodes the same cell. `dir` comes from the
  // already-cardinal-snapped `heading` (a lookup, not re-rounding the raw float direction) — two
  // independently-rounded float components can each land on +-1 and produce a diagonal vector,
  // which would break the "axis-aligned corridor" assumption everywhere else in this app.
  const CARDINAL_VECTORS: Record<Heading, { x: number; y: number }> = {
    0: { x: 0, y: -1 },
    45: { x: 1, y: -1 },
    90: { x: 1, y: 0 },
    135: { x: 1, y: 1 },
    180: { x: 0, y: 1 },
    225: { x: -1, y: 1 },
    270: { x: -1, y: 0 },
    315: { x: -1, y: -1 },
  };
  const byLowestFirst = [...bayCandidates].sort((a, b) => b.y - a.y);
  let entranceAnchorKey: string | null = null;
  for (const candidate of byLowestFirst) {
    const dir = CARDINAL_VECTORS[candidate.heading];
    const entranceCells: GridPoint[] = [];
    let cur = candidate.anchor;
    for (let i = 0; i < SLOT_DEPTH + 1; i++) {
      cur = { x: cur.x + dir.x, y: cur.y + dir.y };
      entranceCells.push(cur);
    }
    if (!tryPlace(state, entranceCells)) continue; // this bay's straight shot out is blocked — try the next-lowest
    entranceAnchorKey = `${candidate.anchor.x},${candidate.anchor.y}`;
    const entranceCorridor = makeNode(state, aisleNode.id, "corridor", candidate.heading, candidate.anchor, entranceCells, "Entrance Passage", "open");
    const thresholdCell = { x: entranceCorridor.farCell.x + dir.x, y: entranceCorridor.farCell.y + dir.y };
    if (tryPlace(state, [thresholdCell])) {
      makeNode(state, entranceCorridor.id, "corridor", candidate.heading, entranceCorridor.farCell, [thresholdCell], "Main Entrance", "door");
    }
    break;
  }

  // --- Every other bay becomes a real room, exactly as the rectangle layout's bays do.
  for (const bay of bayCandidates) {
    if (entranceAnchorKey === `${bay.anchor.x},${bay.anchor.y}`) continue;
    generateRoomOrChamber(state, aisleNode.id, bay.heading, bay.anchor, "room", "door", false);
  }

  const corners = shape === "circle" || shape === "oval" ? [] : outer;
  return { nodes: state.nodes, envelope: { outline: outer, corners } };
}
