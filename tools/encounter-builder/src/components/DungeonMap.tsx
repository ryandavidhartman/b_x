// Renders the generated node graph as a proper wall-and-symbol dungeon map, using the book's own
// map-symbol legend (Appendix E, "Map Symbols," source `D&D Basic Rulebook p.B58`) instead of the
// flat colored-block grid this component started as. Two ideas make this work:
//
// 1. Walls aren't drawn per-node — every occupied cell across the whole dungeon is checked against
//    its 4 neighbors, and any edge whose neighbor cell is NOT occupied gets a wall segment. Two
//    adjacent cells belonging to different nodes (a corridor flowing into a room) get NO wall on
//    their shared edge — that's what makes the floor look continuous, matching how a real dungeon
//    map reads. This also means a plain dead end needs no symbol at all: nothing occupies the cell
//    beyond it, so the wall-extraction step draws its cap automatically.
// 2. A door (or secret/one-way door) is a symbol drawn ACROSS an already-open threshold, not a
//    break in a wall — so it's rendered separately from wall-extraction, at the boundary between
//    every node and its parent, keyed off `DungeonNode.connectionToParent` (set by the generator).
//    Since the generator always anchors a node at its parent's `farCell` and its first cell sits at
//    `anchor + firstStepVector(heading)`, that single edge is enough to locate every door glyph,
//    for both corridors and rooms (a room's own near-wall cell facing its parent is always at that
//    same offset, the center of that wall — see `rectCells`/`commitRoom` in the generator). Plain
//    `HEADING_VECTORS[heading]` would be wrong here for a diagonal heading — see `firstStepVector`.
import { useEffect, useState, type ReactNode } from "react";
import { firstStepVector, type DungeonNode, type NodeKind, type Heading } from "../generators/randomDungeon";
import type { LocationCategory } from "../lib/locationInput";

const CELL_PX = 18;
const PAD_CELLS = 2;
const INK = "#3a2f22";
const PAPER = "#fdf8ee";

// Local copy of the generator's own heading vectors — small enough not to warrant exporting an
// engine internal just for this.
const HEADING_VECTORS: Record<Heading, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  45: { dx: 1, dy: -1 },
  90: { dx: 1, dy: 0 },
  135: { dx: 1, dy: 1 },
  180: { dx: 0, dy: 1 },
  225: { dx: -1, dy: 1 },
  270: { dx: -1, dy: 0 },
  315: { dx: -1, dy: -1 },
};
function perpVec(h: Heading) {
  return HEADING_VECTORS[((h + 90) % 360) as Heading];
}
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

// --- Hand-drawn texture: deterministic per-segment noise so a wall's stipple/wobble is stable
// across re-renders (no seeded-RNG library needed for a handful of small integer hashes). ------
function hashSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h = Math.imul(h ^ Math.round(p * 100), 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** One published-module wall reads as the edge of hewn rock — since this engine never draws a
 * wall except where an occupied cell faces unmapped space (see the file-header note on wall
 * extraction), every wall segment qualifies for the same speckled "rock" halo the reference maps
 * use, scattered on the outward (unmapped) side of the line. */
function stippleForWall(x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): { cx: number; cy: number; r: number }[] {
  const rand = mulberry32(hashSeed(x1, y1, x2, y2));
  const dots: { cx: number; cy: number; r: number }[] = [];
  const count = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i++) {
    const t = 0.12 + rand() * 0.76;
    const off = 1.5 + rand() * 4.5;
    const jitter = (rand() - 0.5) * 2;
    dots.push({
      cx: x1 + (x2 - x1) * t + nx * off + ny * jitter,
      cy: y1 + (y2 - y1) * t + ny * off + nx * jitter,
      r: 0.5 + rand() * 0.7,
    });
  }
  return dots;
}

// Light floor tint by node kind — walls now carry the real structural signal, so this just gives
// an at-a-glance sense of room vs. corridor vs. natural cave, much lighter than the old fills.
const FLOOR_TINT: Record<NodeKind, string> = {
  room: "#f1e9d6",
  chamber: "#ece0c2",
  corridor: "#e3d8bd",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#e3d8bd",
  secretDoor: "#e3d8bd",
  oneWayDoor: "#e3d8bd",
};

// Same map, same mechanics, for every location category (per the broadened Random Dungeon
// Generation scope) — only a Wilderness site reads its terms differently (a clearing joined by
// trails, not a room off a corridor).
function floorLegend(category: LocationCategory): { kind: NodeKind; label: string }[] {
  const wild = category === "wilderness";
  return [
    { kind: "room", label: wild ? "Clearing / Camp Feature" : "Room / Chamber" },
    { kind: "corridor", label: wild ? "Trail" : "Corridor" },
    { kind: "cave", label: "Cave / Cavern" },
    { kind: "stairs", label: wild ? "Elevation Change (floor)" : "Stairs (floor)" },
  ];
}

/** Key number for a room/chamber/cave/stairs node, centered on its cells — cross-references the
 * room-by-room log the same way a published dungeon key's numbered map does. */
function AreaNumber({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.8} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2.5} paintOrder="stroke">
      {n}
    </text>
  );
}

// --- Book map-symbol glyphs --------------------------------------------------------------------
// Each glyph is centered at (x, y); `heading` is only used by the boundary glyphs (door variants,
// stairs) to orient the cross-passage tick — letters/icons are drawn upright regardless of
// heading, since an upright letter reads better on a map than a rotated one and rotating a glyph
// around its own center doesn't move its position anyway.

function DoorTick({ x, y, heading }: { x: number; y: number; heading: Heading }) {
  const p = perpVec(heading);
  const half = CELL_PX * 0.4;
  return <line x1={x - p.dx * half} y1={y - p.dy * half} x2={x + p.dx * half} y2={y + p.dy * half} stroke={INK} strokeWidth={2.5} />;
}

/** Book legend: "Door" — a tick across the passage with an open leaf drawn on it. */
function DoorGlyph({ x, y, heading }: { x: number; y: number; heading: Heading }) {
  const s = CELL_PX * 0.42;
  return (
    <g>
      <DoorTick x={x} y={y} heading={heading} />
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={PAPER} stroke={INK} strokeWidth={1.4} />
    </g>
  );
}

/** Book legend has a circled "S" for one of its secret-door variants — reusing that letter here
 * for every secret-door connection this engine produces (it doesn't distinguish one-way secret
 * doors from two-way ones the way the book's legend does). */
function SecretDoorGlyph({ x, y, heading }: { x: number; y: number; heading: Heading }) {
  return (
    <g>
      <DoorTick x={x} y={y} heading={heading} />
      <circle cx={x} cy={y} r={CELL_PX * 0.32} fill={PAPER} stroke={INK} strokeWidth={1.4} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.5} fontWeight={700} fill={INK}>
        S
      </text>
    </g>
  );
}

/** Book legend: "One Way Door" — a tick with an arrow showing the direction it can be passed. */
function OneWayDoorGlyph({ x, y, heading }: { x: number; y: number; heading: Heading }) {
  const v = HEADING_VECTORS[heading];
  const len = CELL_PX * 0.34;
  const tip = { x: x + v.dx * len, y: y + v.dy * len };
  const backLeft = { x: x - v.dy * len * 0.4, y: y + v.dx * len * 0.4 };
  const backRight = { x: x + v.dy * len * 0.4, y: y - v.dx * len * 0.4 };
  return (
    <g>
      <DoorTick x={x} y={y} heading={heading} />
      <polygon points={`${tip.x},${tip.y} ${backLeft.x},${backLeft.y} ${backRight.x},${backRight.y}`} fill={INK} />
    </g>
  );
}

// Stair direction: the book's own STAIRS table (Table 12) rows are readable text like "Down 1
// level", "Chimney up 2 levels, passage continues" — whichever of "up"/"down" appears first in
// the text is this stair's direction. No row in that table contains both words as its own
// direction (only as part of "up ... down" ordering), so first-occurrence is unambiguous.
function stairDirectionLetter(label: string): "U" | "D" {
  const lower = label.toLowerCase();
  const upIdx = lower.indexOf("up");
  const downIdx = lower.indexOf("down");
  if (upIdx === -1) return "D";
  if (downIdx === -1) return "U";
  return upIdx < downIdx ? "U" : "D";
}

/** Book legend: "Stairs" (a ladder-tread glyph, "u[rungs]d") vs. "Natural Stairs" (same idea, in
 * the book's own separate glyph for a cave/cavern context) — `natural` switches to a dashed rung
 * style for that case. `letter` is this engine's own addition (the book's glyph doesn't encode
 * direction) so a DM can tell up from down without opening the room log. */
function StairsGlyph({ x, y, heading, natural, letter }: { x: number; y: number; heading: Heading; natural: boolean; letter: "U" | "D" }) {
  const p = perpVec(heading);
  const v = HEADING_VECTORS[heading];
  const half = CELL_PX * 0.38;
  const rungs = [-0.3, 0, 0.3];
  return (
    <g>
      {rungs.map((t, i) => (
        <line
          key={i}
          x1={x + v.dx * t * CELL_PX - p.dx * half}
          y1={y + v.dy * t * CELL_PX - p.dy * half}
          x2={x + v.dx * t * CELL_PX + p.dx * half}
          y2={y + v.dy * t * CELL_PX + p.dy * half}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray={natural ? "2,1.5" : undefined}
        />
      ))}
      <text x={x + p.dx * (half + CELL_PX * 0.32)} y={y + p.dy * (half + CELL_PX * 0.32)} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.55} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2} paintOrder="stroke">
        {letter}
      </text>
    </g>
  );
}

/** Book legend: plain "T" for Trap (uncircled — only the trap-DOOR variants get a circled letter
 * in the book's own legend, so a plain bold "T" is the book-accurate rendering here). */
function TrapGlyph({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.7} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2.5} paintOrder="stroke">
      T
    </text>
  );
}

/** Book legend: "Open Pit" (filled square) vs. "Covered Pit" (outlined square with an X) — this
 * engine's own approximation of the legend's exact fill patterns, not a pixel reproduction of the
 * book's art. Which trap results count as "covered" is a judgment call — see `pitIsCovered`. */
function PitGlyph({ x, y, covered }: { x: number; y: number; covered: boolean }) {
  const s = CELL_PX * 0.5;
  if (!covered) {
    return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={INK} stroke={PAPER} strokeWidth={1} />;
  }
  return (
    <g>
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <line x1={x - s / 2} y1={y - s / 2} x2={x + s / 2} y2={y + s / 2} stroke={INK} strokeWidth={1.2} />
      <line x1={x + s / 2} y1={y - s / 2} x2={x - s / 2} y2={y + s / 2} stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

/** Not a book map symbol — Environmental Hazards are this book's own Shadowdark-sourced addition
 * (see Appendix E, "Environmental Hazards"), not part of the original D&D map-symbol legend, so
 * there's no legend glyph to reuse. A plain bold "H" follows the same letter-glyph convention the
 * book itself uses for T/C/F/S; this app's own extension, not a book symbol. */
function HazardGlyph({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.7} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2.5} paintOrder="stroke">
      H
    </text>
  );
}

/** Book legend: "Pool" (wavy lines in a box). Reused for both a cave Pool and a cave Lake result
 * — the legend also has a separate contour-line "Pool or Lake" glyph for a natural feature, but
 * one boxed wavy-line icon reads clearly at this map's scale for either case. */
function PoolGlyph({ x, y }: { x: number; y: number }) {
  const w = CELL_PX * 0.85;
  const h = CELL_PX * 0.55;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={PAPER} stroke={INK} strokeWidth={1.2} />
      <path d={`M ${x - w * 0.35} ${y} q ${w * 0.18} ${-h * 0.35} ${w * 0.35} 0 q ${w * 0.18} ${h * 0.35} ${w * 0.35} 0`} fill="none" stroke={INK} strokeWidth={1.4} />
    </g>
  );
}

/** Book legend: "Ladder" (two rails with a rung). Only ever appears on a pre-drawn Starting Area
 * (Area VI's own art includes one) — the generator's own room-by-room procedure has no roll that
 * produces a ladder outside that fixed layout. */
function LadderGlyph({ x, y }: { x: number; y: number }) {
  const w = CELL_PX * 0.5;
  const h = CELL_PX * 0.7;
  return (
    <g stroke={INK} strokeWidth={1.6}>
      <line x1={x - w / 2} y1={y - h / 2} x2={x - w / 2} y2={y + h / 2} />
      <line x1={x + w / 2} y1={y - h / 2} x2={x + w / 2} y2={y + h / 2} />
      <line x1={x - w / 2} y1={y} x2={x + w / 2} y2={y} />
    </g>
  );
}

// A pit trap where the mechanism itself conceals the drop (a trapdoor, a false door, a section of
// floor/ceiling that drops) reads as the legend's "Covered Pit"; a plain "pit, 10 ft" or a bare
// spiked/poisoned pit with no concealment mechanism named reads as "Open Pit." Judgment call.
function pitIsCovered(text: string): boolean {
  const t = text.toLowerCase();
  return /trap door|false door|locking|dropping/.test(t);
}

function symbolForNode(node: DungeonNode): { kind: "trap" | "pit"; covered?: boolean } | { kind: "hazard" } | { kind: "pool" } | { kind: "ladder" } | null {
  if (node.trap) {
    const isPit = node.trap.toLowerCase().includes("pit");
    return isPit ? { kind: "pit", covered: pitIsCovered(node.trap) } : { kind: "trap" };
  }
  if (node.hazard) return { kind: "hazard" };
  const hasWater = node.notes.some((n) => (n.startsWith("Pool: ") && !n.includes("No pool")) || (n.startsWith("Lake: ") && !n.includes("No lake")));
  if (hasWater) return { kind: "pool" };
  if (node.notes.some((n) => n.startsWith("Ladder"))) return { kind: "ladder" };
  return null;
}

/** Book-module convention (see the reference Shadowdark maps): a single bold letter dropped at a
 * monster's actual cell, distinct from the area number, with a legend line spelling out which
 * monster each letter means on *this* map. Letters are assigned per map, not fixed per monster
 * type, since which monsters actually appear varies every generation. */
function assignMonsterLetters(nodes: DungeonNode[]): Map<string, string> {
  const letters = "ABDEFGHIJKLMNPQRSTUVWXYZ"; // skip C ("Covered Pit" cue elsewhere) and O (reads like a digit at this scale).
  const assigned = new Map<string, string>();
  let next = 0;
  for (const node of nodes) {
    const name = node.encounter?.monster?.headingName;
    if (!name || assigned.has(name)) continue;
    assigned.set(name, letters[next % letters.length]);
    next++;
  }
  return assigned;
}

function MonsterLetterToken({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <g>
      <rect x={x - 8} y={y - 8} width={16} height={16} fill="#fdf8ee" stroke={INK} strokeWidth={1} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={INK}>
        {letter}
      </text>
    </g>
  );
}

export function DungeonMap({ nodes, selectedId, onSelect, category }: { nodes: DungeonNode[]; selectedId: string | null; onSelect: (id: string) => void; category: LocationCategory }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Esc closes full screen, and the page behind it shouldn't scroll while it's open — both undone
  // the moment full screen closes, whichever way that happens (button, Esc, or a re-render that
  // drops this node's map entirely).
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  if (nodes.length === 0) {
    return <p className="note">No dungeon generated yet.</p>;
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const monsterLetters = assignMonsterLetters(nodes);
  const cellOwner = new Map<string, DungeonNode>();
  for (const node of nodes) {
    for (const c of node.cells) cellOwner.set(cellKey(c.x, c.y), node);
  }

  const points = nodes.flatMap((n) => (n.cells.length > 0 ? n.cells : [n.anchor]));
  const minX = Math.min(...points.map((p) => p.x)) - PAD_CELLS;
  const maxX = Math.max(...points.map((p) => p.x)) + PAD_CELLS;
  const minY = Math.min(...points.map((p) => p.y)) - PAD_CELLS;
  const maxY = Math.max(...points.map((p) => p.y)) + PAD_CELLS;
  const widthPx = (maxX - minX) * CELL_PX;
  const heightPx = (maxY - minY) * CELL_PX;

  function px(x: number) {
    return (x - minX) * CELL_PX;
  }
  function py(y: number) {
    return (y - minY) * CELL_PX;
  }
  function cellCenter(x: number, y: number) {
    return { x: px(x) + CELL_PX / 2, y: py(y) + CELL_PX / 2 };
  }

  // --- Floor tiles (one <rect> per occupied cell, clickable back to its owning node) -----------
  // A faint stroke on every tile reads as the reference maps' background graph-paper grid — each
  // cell here already is one 10 ft square, so no separate grid layer is needed.
  const floorTiles = nodes.flatMap((node) =>
    node.cells.map((c, i) => (
      <rect
        key={`${node.id}-floor-${i}`}
        x={px(c.x)}
        y={py(c.y)}
        width={CELL_PX}
        height={CELL_PX}
        fill={FLOOR_TINT[node.kind]}
        stroke="rgba(58,47,34,0.16)"
        strokeWidth={0.75}
        onClick={() => onSelect(node.id)}
        style={{ cursor: "pointer" }}
      />
    )),
  );

  // --- Wall extraction: any edge of an occupied cell facing an unoccupied neighbor is a wall ----
  // `nx`/`ny` (the direction toward that unoccupied neighbor) is kept per segment so the stipple
  // pass below knows which side is "unmapped rock" to scatter its speckle on.
  const NEIGHBORS: { dx: number; dy: number; edge: "N" | "S" | "E" | "W" }[] = [
    { dx: 0, dy: -1, edge: "N" },
    { dx: 0, dy: 1, edge: "S" },
    { dx: 1, dy: 0, edge: "E" },
    { dx: -1, dy: 0, edge: "W" },
  ];
  const wallLines: { x1: number; y1: number; x2: number; y2: number; nx: number; ny: number }[] = [];
  for (const key of cellOwner.keys()) {
    const [cx, cy] = key.split(",").map(Number);
    for (const { dx, dy, edge } of NEIGHBORS) {
      if (cellOwner.has(cellKey(cx + dx, cy + dy))) continue;
      const x0 = px(cx);
      const y0 = py(cy);
      if (edge === "N") wallLines.push({ x1: x0, y1: y0, x2: x0 + CELL_PX, y2: y0, nx: dx, ny: dy });
      else if (edge === "S") wallLines.push({ x1: x0, y1: y0 + CELL_PX, x2: x0 + CELL_PX, y2: y0 + CELL_PX, nx: dx, ny: dy });
      else if (edge === "W") wallLines.push({ x1: x0, y1: y0, x2: x0, y2: y0 + CELL_PX, nx: dx, ny: dy });
      else wallLines.push({ x1: x0 + CELL_PX, y1: y0, x2: x0 + CELL_PX, y2: y0 + CELL_PX, nx: dx, ny: dy });
    }
  }
  const wallStipple = wallLines.flatMap((w, i) =>
    stippleForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny).map((d, j) => (
      <circle key={`stipple-${i}-${j}`} cx={d.cx} cy={d.cy} r={d.r} fill={INK} opacity={0.55} />
    )),
  );

  // --- Area numbers + content glyphs (trap/hazard/pool/stairs-in-room), one per node with cells -
  const areaOverlays = nodes
    .filter((n) => n.cells.length > 0)
    .map((node) => {
      const cx = node.cells.reduce((s, c) => s + px(c.x), 0) / node.cells.length + CELL_PX / 2;
      const cy = node.cells.reduce((s, c) => s + py(c.y), 0) / node.cells.length + CELL_PX / 2;
      const symbol = symbolForNode(node);
      const stairsInRoom = node.contents === "Stairs";
      const numberY = symbol || stairsInRoom ? cy - CELL_PX * 0.45 : cy;
      const glyphY = cy + CELL_PX * 0.45;
      // A monster token sits at a different cell than the area number, matching the reference
      // maps (number and monster letter are both visible within a room, not overlapping) — only
      // possible when the room spans more than one cell, so a single-cell room skips the token
      // and relies on the key text instead.
      const monsterName = node.encounter?.monster?.headingName;
      const letter = monsterName ? monsterLetters.get(monsterName) : undefined;
      const tokenCell = node.cells.length > 1 ? node.cells[0] : null;
      return (
        <g key={`${node.id}-overlay`}>
          {node.areaNumber !== undefined && <AreaNumber x={cx} y={numberY} n={node.areaNumber} />}
          {letter && tokenCell && <MonsterLetterToken x={px(tokenCell.x) + CELL_PX / 2} y={py(tokenCell.y) + CELL_PX / 2} letter={letter} />}
          {stairsInRoom && <StairsGlyph x={cx} y={glyphY} heading={node.heading} natural={node.kind === "cave" || node.kind === "cavern"} letter={stairDirectionLetter(node.label)} />}
          {symbol?.kind === "trap" && <TrapGlyph x={cx} y={glyphY} />}
          {symbol?.kind === "pit" && <PitGlyph x={cx} y={glyphY} covered={!!symbol.covered} />}
          {symbol?.kind === "hazard" && <HazardGlyph x={cx} y={glyphY} />}
          {symbol?.kind === "pool" && <PoolGlyph x={cx} y={glyphY} />}
          {symbol?.kind === "ladder" && <LadderGlyph x={cx} y={glyphY} />}
        </g>
      );
    });

  // --- Boundary glyphs: doors/secret doors/one-way doors, and stand-alone stairs nodes ----------
  const boundaryGlyphs = nodes
    .filter((n) => n.parentId !== null)
    .map((node) => {
      const v = firstStepVector(node.heading);
      const mid = { x: cellCenter(node.anchor.x, node.anchor.y).x + (v.dx * CELL_PX) / 2, y: cellCenter(node.anchor.x, node.anchor.y).y + (v.dy * CELL_PX) / 2 };
      const glyphs: ReactNode[] = [];
      if (node.connectionToParent === "door") glyphs.push(<DoorGlyph key="door" x={mid.x} y={mid.y} heading={node.heading} />);
      else if (node.connectionToParent === "secretDoor") glyphs.push(<SecretDoorGlyph key="secret" x={mid.x} y={mid.y} heading={node.heading} />);
      else if (node.connectionToParent === "oneWayDoor") glyphs.push(<OneWayDoorGlyph key="oneway" x={mid.x} y={mid.y} heading={node.heading} />);
      if (node.kind === "stairs") {
        const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
        const natural = parent?.kind === "cave" || parent?.kind === "cavern";
        glyphs.push(<StairsGlyph key="stairs" x={mid.x} y={mid.y} heading={node.heading} natural={natural} letter={stairDirectionLetter(node.label)} />);
      }
      if (glyphs.length === 0) return null;
      return (
        <g key={`${node.id}-boundary`} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
          {glyphs}
        </g>
      );
    });

  // --- Zero-cell node markers (dead ends get nothing beyond the wall cap; secret/one-way doors
  // and stand-alone stairs already got their glyph above, but still need a click target) --------
  const zeroCellHitTargets = nodes
    .filter((n) => n.cells.length === 0)
    .map((node) => {
      const c = cellCenter(node.anchor.x, node.anchor.y);
      const v = firstStepVector(node.heading);
      const mid = { x: c.x + (v.dx * CELL_PX) / 2, y: c.y + (v.dy * CELL_PX) / 2 };
      return <circle key={`${node.id}-hit`} cx={mid.x} cy={mid.y} r={CELL_PX * 0.55} fill="transparent" onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }} />;
    });

  const selectedNode = selectedId ? nodesById.get(selectedId) : undefined;
  const highlight =
    selectedNode &&
    (selectedNode.cells.length > 0 ? (
      <g style={{ pointerEvents: "none" }}>
        {selectedNode.cells.map((c, i) => (
          <rect key={i} x={px(c.x)} y={py(c.y)} width={CELL_PX} height={CELL_PX} fill="none" stroke="#8a3b2a" strokeWidth={2} />
        ))}
      </g>
    ) : (
      (() => {
        const c = cellCenter(selectedNode.anchor.x, selectedNode.anchor.y);
        const v = firstStepVector(selectedNode.heading);
        return <circle cx={c.x + (v.dx * CELL_PX) / 2} cy={c.y + (v.dy * CELL_PX) / 2} r={CELL_PX * 0.6} fill="none" stroke="#8a3b2a" strokeWidth={2} style={{ pointerEvents: "none" }} />;
      })()
    ));

  // Full screen drops the 1400x900 display cap entirely (the wrap becomes a viewport-filling,
  // scrollable overlay instead) so the map renders at its native cell scale — more of it fits
  // before scrolling, and what's on screen is bigger, both the point of popping it out.
  const svgWidth = isFullscreen ? widthPx : Math.min(widthPx, 1400);
  const svgHeight = isFullscreen ? heightPx : Math.min(heightPx, 900);

  return (
    <div className={isFullscreen ? "dungeon-map-wrap dungeon-map-wrap--fullscreen" : "dungeon-map-wrap"}>
      <button
        type="button"
        className="dungeon-map-fullscreen-toggle"
        onClick={() => setIsFullscreen((v) => !v)}
        aria-label={isFullscreen ? "Exit full screen" : "View map full screen"}
      >
        {isFullscreen ? "✕ Close" : "⛶ Full Screen"}
      </button>
      <svg
        className="dungeon-map"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${widthPx} ${heightPx}`}
        role="img"
        aria-label="Generated dungeon map"
      >
        <defs>
          {/* A shared, deterministic noise field (default seed) displaces every wall the same way
              at any shared coordinate, so two segments meeting at a corner wobble in step instead
              of pulling apart — that's what keeps this looking hand-drawn instead of glitchy. */}
          <filter id="hand-drawn-wobble" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency={0.045} numOctaves={2} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {floorTiles}
        {wallStipple}
        <g filter="url(#hand-drawn-wobble)">
          {wallLines.map((w, i) => (
            <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          ))}
        </g>
        {zeroCellHitTargets}
        {boundaryGlyphs}
        {areaOverlays}
        {highlight}
      </svg>
      <div className="dungeon-map-legend">
        {floorLegend(category).map(({ kind, label }) => (
          <span key={kind} className="legend-item">
            <span className="legend-swatch" style={{ background: FLOOR_TINT[kind] }} />
            {label}
          </span>
        ))}
      </div>
      <div className="dungeon-map-legend">
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <DoorGlyph x={12} y={12} heading={90} />
          </svg>
          Door
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <SecretDoorGlyph x={12} y={12} heading={90} />
          </svg>
          Secret Door
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <OneWayDoorGlyph x={12} y={12} heading={90} />
          </svg>
          One-Way Door
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <StairsGlyph x={12} y={12} heading={90} natural={false} letter="U" />
          </svg>
          Stairs
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <StairsGlyph x={12} y={12} heading={90} natural={true} letter="D" />
          </svg>
          Natural Stairs
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <TrapGlyph x={12} y={12} />
          </svg>
          Trap
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <PitGlyph x={12} y={12} covered={false} />
          </svg>
          Open Pit
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <PitGlyph x={12} y={12} covered={true} />
          </svg>
          Covered Pit
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <PoolGlyph x={12} y={12} />
          </svg>
          Pool / Lake
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <HazardGlyph x={12} y={12} />
          </svg>
          Hazard (not a book symbol — this app's own addition)
        </span>
        <span className="legend-item">
          <svg className="legend-icon" viewBox="0 0 24 24">
            <LadderGlyph x={12} y={12} />
          </svg>
          Ladder
        </span>
      </div>
      {monsterLetters.size > 0 && (
        <div className="dungeon-map-legend">
          {[...monsterLetters.entries()].map(([name, letter]) => (
            <span key={name} className="legend-item">
              <span className="legend-letter">{letter}</span>
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
