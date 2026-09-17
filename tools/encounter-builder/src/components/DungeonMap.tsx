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
//    `anchor + heading`, that single edge is enough to locate every door glyph, for both corridors
//    and rooms (a room's own near-wall cell facing its parent is always at `anchor + heading`, the
//    center of that wall — see `rectCells` in the generator).
import type { ReactNode } from "react";
import type { DungeonNode, NodeKind, Heading } from "../generators/randomDungeon";

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

const FLOOR_LEGEND: { kind: NodeKind; label: string }[] = [
  { kind: "room", label: "Room / Chamber" },
  { kind: "corridor", label: "Corridor" },
  { kind: "cave", label: "Cave / Cavern" },
  { kind: "stairs", label: "Stairs (floor)" },
];

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

export function DungeonMap({ nodes, selectedId, onSelect }: { nodes: DungeonNode[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (nodes.length === 0) {
    return <p className="note">No dungeon generated yet.</p>;
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
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
  const floorTiles = nodes.flatMap((node) =>
    node.cells.map((c, i) => (
      <rect
        key={`${node.id}-floor-${i}`}
        x={px(c.x)}
        y={py(c.y)}
        width={CELL_PX}
        height={CELL_PX}
        fill={FLOOR_TINT[node.kind]}
        onClick={() => onSelect(node.id)}
        style={{ cursor: "pointer" }}
      />
    )),
  );

  // --- Wall extraction: any edge of an occupied cell facing an unoccupied neighbor is a wall ----
  const NEIGHBORS: { dx: number; dy: number; edge: "N" | "S" | "E" | "W" }[] = [
    { dx: 0, dy: -1, edge: "N" },
    { dx: 0, dy: 1, edge: "S" },
    { dx: 1, dy: 0, edge: "E" },
    { dx: -1, dy: 0, edge: "W" },
  ];
  const wallLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const key of cellOwner.keys()) {
    const [cx, cy] = key.split(",").map(Number);
    for (const { dx, dy, edge } of NEIGHBORS) {
      if (cellOwner.has(cellKey(cx + dx, cy + dy))) continue;
      const x0 = px(cx);
      const y0 = py(cy);
      if (edge === "N") wallLines.push({ x1: x0, y1: y0, x2: x0 + CELL_PX, y2: y0 });
      else if (edge === "S") wallLines.push({ x1: x0, y1: y0 + CELL_PX, x2: x0 + CELL_PX, y2: y0 + CELL_PX });
      else if (edge === "W") wallLines.push({ x1: x0, y1: y0, x2: x0, y2: y0 + CELL_PX });
      else wallLines.push({ x1: x0 + CELL_PX, y1: y0, x2: x0 + CELL_PX, y2: y0 + CELL_PX });
    }
  }

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
      return (
        <g key={`${node.id}-overlay`}>
          {node.areaNumber !== undefined && <AreaNumber x={cx} y={numberY} n={node.areaNumber} />}
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
      const v = HEADING_VECTORS[node.heading];
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
      const v = HEADING_VECTORS[node.heading];
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
        const v = HEADING_VECTORS[selectedNode.heading];
        return <circle cx={c.x + (v.dx * CELL_PX) / 2} cy={c.y + (v.dy * CELL_PX) / 2} r={CELL_PX * 0.6} fill="none" stroke="#8a3b2a" strokeWidth={2} style={{ pointerEvents: "none" }} />;
      })()
    ));

  return (
    <div className="dungeon-map-wrap">
      <svg
        className="dungeon-map"
        width={Math.min(widthPx, 1400)}
        height={Math.min(heightPx, 900)}
        viewBox={`0 0 ${widthPx} ${heightPx}`}
        role="img"
        aria-label="Generated dungeon map"
      >
        {floorTiles}
        {wallLines.map((w, i) => (
          <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        ))}
        {zeroCellHitTargets}
        {boundaryGlyphs}
        {areaOverlays}
        {highlight}
      </svg>
      <div className="dungeon-map-legend">
        {FLOOR_LEGEND.map(({ kind, label }) => (
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
    </div>
  );
}
