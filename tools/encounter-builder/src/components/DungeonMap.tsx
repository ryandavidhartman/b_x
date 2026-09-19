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
//
// 3. A "Cave / Cavern Network" dungeon (the `natural` prop) skips both of the above for its walls
//    and floor entirely: the underlying grid is still the same square-cell engine (there's no book
//    rule to derive an amorphous footprint from), but hewn, right-angled walls read wrong for a
//    natural cave, so this traces the outer boundary of every occupied cell into closed polygon
//    loops (`boundaryLoops`), perturbs each vertex outward/inward with deterministic per-vertex
//    noise (`jitterLoop`), and renders the result as a smoothed blob (`smoothClosedPath`) fringed
//    with a dense comb of outward rock-hatch ticks (`rockHatchTicks`) instead of the crisp
//    per-cell wall segments + sparse stipple used everywhere else. Purely cosmetic — the placed
//    cells, doors, and connectivity are identical either way.
//
// 4. A "Tomb / Crypt" dungeon keeps the crisp constructed geometry (it's dressed, hewn stone, not
//    eroded rock — unlike a cave, there's no reason to bend its walls) but reads as funerary
//    architecture instead of a plain hewn dungeon: a cooler bone/grey floor tint (`TOMB_FLOOR_TINT`)
//    in place of the warm dungeon tan, evenly-spaced "coursing joint" ticks along every wall
//    (`masonryTicksForWall`) in place of the sparse random rock-stipple dots, and a symmetric pair
//    of pillars dropped into any room/chamber large enough to plausibly hold them (`ROOM_PILLARS`).
//    Also purely cosmetic — same placed cells, doors, contents, and connectivity either way.
//
// 5. An "Evil Temple / Shrine" dungeon also keeps crisp constructed geometry, but reads as one
//    monumental built structure rather than a lived-in dungeon or a burial complex: every wall gets
//    regularly-spaced outward pilaster/buttress stubs (`pilasterForWall`) — sparser and blockier
//    than a tomb's mortar-joint ticks, since architectural bays are wider than coursing — and the
//    single largest room/chamber in the whole generated complex (its "sanctuary," picked by floor
//    area, not a book roll) gets a colonnade of pillars plus an altar glyph, instead of every big
//    room getting pillars the way a tomb's many burial chambers do. Same purely-cosmetic caveat.
//
// 6. Temple and Castle both get a fortified building envelope on top of that, since pilasters (or
//    crenellations) alone — and an earlier attempt that just thickened the generated shape's own
//    jagged outline — still read as "a hewn dungeon with decoration," not "one building." A real
//    building's footprint is a solid volume with no gaps; even generators/buildingLayout.ts's own
//    ring-of-rooms shape isn't a perfect rectangle once the aisle/entrance stubs poke out. So the
//    envelope is the generated shape's plain axis-aligned bounding rectangle (always exactly 4
//    corners) with a diagonal-hatch background filling in the space inside that rectangle nothing
//    actually occupies — standing in for "undetailed solid construction," the way a real
//    architectural plan hatches solid masonry in section. Real rooms/corridors still draw their own
//    normal walls right on top, completely unchanged, so they read as distinct rooms carved out of
//    that mass.
//
// 7. A "Castle" (a whole LocationCategory, not a dungeon subtype) reads as martial fortification
//    rather than a temple's religious architecture: a cooler grey floor tint, no interior pilasters
//    (a castle's guard rooms and barracks don't need them — plain walls, same stipple as an
//    unstyled dungeon), a crenellated (alternating merlon squares) envelope instead of a plain
//    band, bigger round corner towers than a temple's small corner dot, and its centerpiece room
//    (see note #6's `centerpieceId`) reads as the bailey/courtyard — a plain well, not a temple's
//    altar-and-colonnade sanctuary, since a real castle courtyard was a working/muster yard.
//
// 8. A "Sewer" dungeon keeps randomDungeon.ts's own branching walk untouched (a sewer network IS
//    the kind of organic branching tunnel system that procedure already produces — no reason to
//    invent a packed floor plan the way Temple/Castle needed) and just reads as damp, grimy brick:
//    a murky green-brown floor tint, denser/shorter brick-joint wall ticks than a tomb's dressed
//    ashlar plus an occasional inward water-stain "drip" (`sewerBrickTicksForWall`), a wavy sewage
//    channel drawn down the middle of every corridor (`sewerChannels`) — the one map-scale detail
//    that reads as "sewer" at a glance — and a round manhole-grate glyph (`ManholeGlyph`) in place
//    of the book's own ladder-tread stairs glyph.
//
// 9. A "Ruins" dungeon uses generators/buildingLayout.ts's plain rectangle — same skeleton as
//    Castle (see note #6/#7) — since a ruin is meant to read as the recognizable footprint of a
//    fallen keep or temple, not a sprawling dungeon crawl, but everything about its rendering says
//    "long abandoned" instead of "intact": a mossy grey-green floor tint, every wall stroked with
//    an irregular broken `strokeDasharray` (`ruinsDashArray`) rather than a solid line, fallen-stone
//    rubble scattered on BOTH sides of every wall (`rubbleForWall` — unlike every other style's
//    stipple/joints, which only ever mark the outward side), sparse weed tufts growing through the
//    floor (`weedTuft`), and no corner towers, crenellations, or interior pilasters at all — they've
//    crumbled along with the rest of the structure.
//
// 10. Wilderness is the biggest departure of the four "still on randomDungeon.ts's own branching
//     walk" styles (see the file's own MapStyle-adjacent comments): walls, doors, and boxed rooms
//     are the wrong visual language for open terrain no matter what they're labeled, so this skips
//     wall extraction, door glyphs, and per-cell floor tiles entirely. Instead: one terrain-tinted
//     background wash across the whole explored area with scattered decorative marks
//     (`renderTerrainMark`, data in `lib/wildernessStyles.ts` — one of 14 bespoke terrains, chosen
//     by the `terrain` prop) standing in for the walk's own occupied cells; a dashed trail line
//     (colored/dashed per terrain) tracing every node's own anchor-to-far-end path, which chains up
//     through the whole node tree exactly the way the walk's cells already do, with no extra
//     bookkeeping; a plain circle marker (`WildernessAreaMarker`) instead of a walled footprint for
//     every "area" (room/chamber/cave/stairs); and an up/down chevron (`ElevationGlyph`) instead of
//     the book's own indoor ladder-tread glyph for a Table 12 "stairs" (Appendix E's broadened scope
//     calls it "Elevation Change" outdoors). Content glyphs (trap/hazard/pool/monster letters) are
//     unchanged — a trap or a pool of water makes just as much sense outdoors as in.
import { useEffect, useState, type ReactNode } from "react";
import { firstStepVector, type DungeonNode, type NodeKind, type Heading, type GridPoint } from "../generators/randomDungeon";
import type { LocationCategory, MapStyle } from "../lib/locationInput";
import { boundaryLoops, jitterLoop, smoothClosedPath, rockHatchTicks, hashSeed, mulberry32 } from "../lib/caveBoundary";
import { TERRAIN_STYLES, type MarkKind } from "../lib/wildernessStyles";

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

/** A Tomb/Crypt wall reads as dressed, coursed ashlar, not raw hewn rock — so instead of
 * `stippleForWall`'s sparse random speckle, this draws two evenly-spaced short perpendicular ticks
 * per unit wall segment (mortar joints between coursed blocks), on the same outward side. Regular
 * spacing (vs. the dungeon's random dot placement and the cave's dense random hatch) is what reads
 * as "worked stone" at a glance. */
function masonryTicksForWall(x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const rand = mulberry32(hashSeed(x1, y1, x2, y2, 11));
  return [0.33, 0.66].map((t) => {
    const bx = x1 + (x2 - x1) * t;
    const by = y1 + (y2 - y1) * t;
    const len = 2.2 + rand() * 1.4;
    return { x1: bx, y1: by, x2: bx + nx * len, y2: by + ny * len };
  });
}

/** A Sewer wall reads as damp brick — denser, shorter joint ticks than a tomb's dressed ashlar
 * (bricks are smaller than worked stone blocks), plus an occasional water-stain "drip" running
 * INWARD from the wall into the floor on a random fraction of segments, representing seepage —
 * the one texture in this app that points toward the floor instead of away from it. */
function sewerBrickTicksForWall(x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const rand = mulberry32(hashSeed(x1, y1, x2, y2, 17));
  const ticks = [0.25, 0.5, 0.75].map((t) => {
    const bx = x1 + (x2 - x1) * t;
    const by = y1 + (y2 - y1) * t;
    const len = 1.6 + rand() * 1.1;
    return { x1: bx, y1: by, x2: bx + nx * len, y2: by + ny * len };
  });
  if (rand() < 0.22) {
    const t = 0.2 + rand() * 0.6;
    const bx = x1 + (x2 - x1) * t;
    const by = y1 + (y2 - y1) * t;
    const len = 3 + rand() * 5;
    ticks.push({ x1: bx, y1: by, x2: bx - nx * len, y2: by - ny * len });
  }
  return ticks;
}

/** A Ruins wall isn't a continuous line at all — it's what's left of one, with whole stretches
 * collapsed. `strokeDasharray` gives every wall segment its own irregular broken pattern (a
 * genuinely gapped wall — actually omitting geometry — would mean an occupied cell facing a wall
 * that never renders at all, indistinguishable from a real opening; a dash pattern reads as
 * "crumbling" while keeping every wall visibly present). Hashed per-segment so parallel walls don't
 * all break at the same points. */
function ruinsDashArray(x1: number, y1: number, x2: number, y2: number): string {
  const rand = mulberry32(hashSeed(x1, y1, x2, y2, 23));
  const parts: number[] = [];
  for (let i = 0; i < 4; i++) parts.push(2 + rand() * 6);
  return parts.join(",");
}

/** Rubble — fallen stone chunks scattered on BOTH sides of a ruined wall (unlike every other
 * style's stipple/joints, which only ever mark the outward/unmapped side), since a real collapse
 * spills debris into the room as readily as outward. Bigger, rougher, and more irregular than
 * `stippleForWall`'s tidy rock speckle. */
function rubbleForWall(x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): { cx: number; cy: number; r: number }[] {
  const rand = mulberry32(hashSeed(x1, y1, x2, y2, 29));
  const chunks: { cx: number; cy: number; r: number }[] = [];
  const count = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const t = 0.1 + rand() * 0.8;
    const side = rand() < 0.6 ? 1 : -1; // debris skews outward, but plenty falls inward too
    const off = 1 + rand() * 5;
    chunks.push({
      cx: x1 + (x2 - x1) * t + nx * off * side,
      cy: y1 + (y2 - y1) * t + ny * off * side,
      r: 0.8 + rand() * 1.6,
    });
  }
  return chunks;
}

/** Not a book map symbol — a Ruins-only decoration: a small weed/moss tuft growing up through a
 * crack, scattered sparsely across the floor (this app's own addition; overgrowth isn't a book map
 * symbol at all). Purely a per-cell hashed chance, independent of anything rolled for that room. */
function weedTuft(cx: number, cy: number, seedX: number, seedY: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const rand = mulberry32(hashSeed(seedX, seedY, 37));
  const baseAngle = -Math.PI / 2 + (rand() - 0.5) * 0.8;
  const spread = 0.35 + rand() * 0.25;
  const len = 3.5 + rand() * 3;
  return [-spread, 0, spread].map((offset) => ({
    x1: cx,
    y1: cy,
    x2: cx + Math.cos(baseAngle + offset) * len,
    y2: cy + Math.sin(baseAngle + offset) * len,
  }));
}

/** Draws one of `lib/wildernessStyles.ts`'s per-terrain decorative marks at (cx,cy) — every kind
 * gets a small amount of hashed per-instance jitter (size/angle) so a field of the same mark never
 * looks like a stamped copy-paste, same spirit as this file's other hand-drawn textures. Not a book
 * map symbol for any of these — purely this app's own terrain dressing (file-header note #10). */
function renderTerrainMark(kind: MarkKind, cx: number, cy: number, color: string, scale: number, seedX: number, seedY: number): ReactNode {
  const rand = mulberry32(hashSeed(seedX, seedY, 43));
  const s = scale;
  switch (kind) {
    case "tree": {
      const r = (4 + rand() * 2) * s;
      return (
        <g key={`${seedX},${seedY}`}>
          <line x1={cx} y1={cy + r * 0.6} x2={cx} y2={cy + r * 1.3} stroke={color} strokeWidth={1.2 * s} />
          <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.75} />
        </g>
      );
    }
    case "wave": {
      const w = (6 + rand() * 2) * s;
      const h = 3 * s;
      return (
        <path
          key={`${seedX},${seedY}`}
          d={`M ${cx - w} ${cy} Q ${cx - w / 2} ${cy - h} ${cx} ${cy} Q ${cx + w / 2} ${cy + h} ${cx + w} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={1.3 * s}
          strokeLinecap="round"
        />
      );
    }
    case "arc": {
      const w = (7 + rand() * 3) * s;
      const h = (2.5 + rand() * 1.5) * s;
      return <path key={`${seedX},${seedY}`} d={`M ${cx - w} ${cy} Q ${cx} ${cy - h} ${cx + w} ${cy}`} fill="none" stroke={color} strokeWidth={1.3 * s} strokeLinecap="round" />;
    }
    case "rockCluster": {
      const parts = [0, 1, 2].map((i) => {
        const ang = rand() * Math.PI * 2;
        const dist = i === 0 ? 0 : (2 + rand() * 2) * s;
        return { cx: cx + Math.cos(ang) * dist, cy: cy + Math.sin(ang) * dist, r: (1.6 + rand() * 1.4) * s };
      });
      return (
        <g key={`${seedX},${seedY}`}>
          {parts.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={color} opacity={0.7} />
          ))}
        </g>
      );
    }
    case "tuft": {
      const baseAngle = -Math.PI / 2 + (rand() - 0.5) * 0.8;
      const spread = 0.35 + rand() * 0.25;
      const len = (3.5 + rand() * 3) * s;
      return (
        <g key={`${seedX},${seedY}`}>
          {[-spread, 0, spread].map((offset, i) => (
            <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(baseAngle + offset) * len} y2={cy + Math.sin(baseAngle + offset) * len} stroke={color} strokeWidth={1.2 * s} strokeLinecap="round" />
          ))}
        </g>
      );
    }
    case "tombstone": {
      const w = 4 * s;
      const h = 5 * s;
      return (
        <path
          key={`${seedX},${seedY}`}
          d={`M ${cx - w} ${cy + h} L ${cx - w} ${cy} A ${w} ${w} 0 0 1 ${cx + w} ${cy} L ${cx + w} ${cy + h} Z`}
          fill={color}
          opacity={0.7}
          stroke={color}
          strokeWidth={0.5}
        />
      );
    }
    case "reedClump": {
      const count = 3;
      return (
        <g key={`${seedX},${seedY}`}>
          {Array.from({ length: count }, (_, i) => {
            const dx = (i - (count - 1) / 2) * 1.6 * s;
            const len = (6 + rand() * 3) * s;
            const bow = (rand() - 0.5) * 2 * s;
            return <path key={i} d={`M ${cx + dx} ${cy} Q ${cx + dx + bow} ${cy - len / 2} ${cx + dx} ${cy - len}`} fill="none" stroke={color} strokeWidth={1.1 * s} strokeLinecap="round" />;
          })}
        </g>
      );
    }
    case "snowflake": {
      const r = (3 + rand()) * s;
      return (
        <g key={`${seedX},${seedY}`} stroke={color} strokeWidth={1 * s} strokeLinecap="round">
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
          <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
          <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} />
          <line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} />
        </g>
      );
    }
    case "cactus": {
      const h = (7 + rand() * 2) * s;
      return (
        <g key={`${seedX},${seedY}`} stroke={color} strokeWidth={1.6 * s} strokeLinecap="round" fill="none">
          <line x1={cx} y1={cy + h / 2} x2={cx} y2={cy - h / 2} />
          <path d={`M ${cx} ${cy} h ${3 * s} v ${-3 * s}`} />
        </g>
      );
    }
    case "fencePost": {
      const w = 5 * s;
      return (
        <g key={`${seedX},${seedY}`} stroke={color} strokeWidth={1.2 * s}>
          <line x1={cx - w} y1={cy - 2 * s} x2={cx - w} y2={cy + 2 * s} />
          <line x1={cx + w} y1={cy - 2 * s} x2={cx + w} y2={cy + 2 * s} />
          <line x1={cx - w} y1={cy} x2={cx + w} y2={cy} />
        </g>
      );
    }
    case "cropRow": {
      const w = 6 * s;
      return (
        <g key={`${seedX},${seedY}`} stroke={color} strokeWidth={1 * s} opacity={0.8}>
          {[-2, 0, 2].map((dy, i) => (
            <line key={i} x1={cx - w} y1={cy + dy * s} x2={cx + w} y2={cy + dy * s} />
          ))}
        </g>
      );
    }
    case "pool": {
      const rx = (4 + rand() * 2) * s;
      return <ellipse key={`${seedX},${seedY}`} cx={cx} cy={cy} rx={rx} ry={rx * 0.6} fill={color} opacity={0.6} />;
    }
  }
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

// A Tomb/Crypt reads cooler and more uniform than a lived-in dungeon — bone/grey stone throughout,
// not the warm dungeon tan — same node-kind keys as FLOOR_TINT so it's a drop-in swap.
const TOMB_FLOOR_TINT: Record<NodeKind, string> = {
  room: "#e6e2d6",
  chamber: "#dfdacb",
  corridor: "#d8d2c0",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#d8d2c0",
  secretDoor: "#d8d2c0",
  oneWayDoor: "#d8d2c0",
};

// A Sewer reads as damp, grimy brick — a murky green-brown cast, distinct from every other style's
// dry-stone palette.
const SEWER_FLOOR_TINT: Record<NodeKind, string> = {
  room: "#d7dcc4",
  chamber: "#d0d6b9",
  corridor: "#c8cfae",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#c8cfae",
  secretDoor: "#c8cfae",
  oneWayDoor: "#c8cfae",
};

// An Evil Temple/Shrine reads as worked stone too, but with a faint unwholesome wine/plum cast
// instead of the tomb's neutral bone-grey — still a light pastel wash (every floor tint in this
// map stays pale so glyphs/numbers keep contrast), just tinted toward "unholy" rather than "plain."
const TEMPLE_FLOOR_TINT: Record<NodeKind, string> = {
  room: "#e9dade",
  chamber: "#e2d1d7",
  corridor: "#dac8cf",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#dac8cf",
  secretDoor: "#dac8cf",
  oneWayDoor: "#dac8cf",
};

// A Castle reads as plain, martial cut stone — a cool grey with none of the temple's unholy cast
// or the tomb's bone warmth.
const CASTLE_FLOOR_TINT: Record<NodeKind, string> = {
  room: "#e3e4e7",
  chamber: "#dcdee2",
  corridor: "#d5d8dc",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#d5d8dc",
  secretDoor: "#d5d8dc",
  oneWayDoor: "#d5d8dc",
};

// A Ruins site reads as long-abandoned, overgrown stone — a cool, mossy grey-green, distinct from
// every other style's dry (or, for Sewer, wet-but-warm) palette.
const RUINS_FLOOR_TINT: Record<NodeKind, string> = {
  room: "#cfd8c4",
  chamber: "#c7d2b8",
  corridor: "#bfccae",
  cave: "#dde8d6",
  cavern: "#dde8d6",
  stairs: "#cfe0eb",
  deadEnd: "#bfccae",
  secretDoor: "#bfccae",
  oneWayDoor: "#bfccae",
};

/** An Evil Temple/Shrine wall reads as monumental built architecture — regularly-spaced outward
 * pilaster/buttress stubs, one roughly every other 10 ft wall segment (architectural bays are
 * wider than a tomb's mortar-joint spacing), positioned by the segment's own grid coordinate
 * rather than a running count so parallel wall runs stay in phase with each other. Blockier
 * (thicker, longer) than `masonryTicksForWall`'s joints, since a pilaster is a structural member,
 * not a seam. */
function pilasterForWall(x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): { x1: number; y1: number; x2: number; y2: number } | null {
  const gridPos = Math.round(nx !== 0 ? y1 / CELL_PX : x1 / CELL_PX);
  if (((gridPos % 2) + 2) % 2 !== 0) return null;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return { x1: mx, y1: my, x2: mx + nx * 5.5, y2: my + ny * 5.5 };
}

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

/** Not a book map symbol — a Sewer-only decoration (file-header note #8) marking a Table 12 stairs
 * result as a street-level manhole instead of the book's own ladder-tread glyph: a round grate
 * (a circle with a cross-hatch of bars) rather than a rectangular rung ladder, since that's how a
 * sewer's own vertical access points actually look from above. */
function ManholeGlyph({ x, y, letter }: { x: number; y: number; letter: "U" | "D" }) {
  const r = CELL_PX * 0.32;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={PAPER} stroke={INK} strokeWidth={1.8} />
      {[-0.5, 0, 0.5].map((t) => (
        <line key={`h${t}`} x1={x - r * 0.85} y1={y + t * r} x2={x + r * 0.85} y2={y + t * r} stroke={INK} strokeWidth={1} />
      ))}
      <text x={x + r + CELL_PX * 0.28} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.55} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2} paintOrder="stroke">
        {letter}
      </text>
    </g>
  );
}

/** Not a book map symbol — a Wilderness-only decoration (file-header note #10) marking a Table 12
 * "stairs" result (Appendix E's broadened scope's "Elevation Change") as a simple up/down chevron
 * instead of the book's own indoor ladder-tread glyph, which has nothing to climb outdoors. */
function ElevationGlyph({ x, y, letter }: { x: number; y: number; letter: "U" | "D" }) {
  const s = CELL_PX * 0.32;
  const dir = letter === "U" ? -1 : 1;
  return (
    <g>
      <polyline points={`${x - s},${y + s * 0.35 * dir} ${x},${y - s * 0.55 * dir} ${x + s},${y + s * 0.35 * dir}`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <text x={x} y={y + s * 1.3 * dir} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.45} fontWeight={700} fill={INK} stroke={PAPER} strokeWidth={2} paintOrder="stroke">
        {letter}
      </text>
    </g>
  );
}

/** Not a book map symbol — a Wilderness-only decoration (file-header note #10): every other style
 * shows an "area" (room/chamber/cave/stairs) as its own walled-off cell footprint, but there's
 * nothing to wall off outdoors, so a Wilderness area is just this plain marker — a circle with its
 * key number — at the area's own centroid, the way a real wilderness map marks a point of interest. */
function WildernessAreaMarker({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={CELL_PX * 0.62} fill={PAPER} stroke={INK} strokeWidth={1.8} opacity={0.92} />;
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

/** Not a book map symbol — a Tomb/Crypt-only decoration (see file-header note #4): a support
 * column viewed from above, the way published tomb/mausoleum maps mark them. Reused the book's own
 * "columns or pillars" dungeon-dressing wording, but the placement rule below (room size, not a
 * roll) is this app's own addition, since Appendix E never rolls for where pillars go. */
function PillarGlyph({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={CELL_PX * 0.22} fill={PAPER} stroke={INK} strokeWidth={1.6} />;
}

/** A room/chamber only reads as grand enough for a pair of support columns once it's at least 3
 * cells deep on both axes (so the pillars sit clearly clear of every wall) — below that, a real
 * tomb corridor or antechamber wouldn't have any. Positioned at the 1/3 and 2/3 points of the
 * room's own bounding box (not tied to individual cell centers) so they land symmetrically
 * regardless of the room's exact cell count. */
/** A room/chamber's own bounding box in px, from its cells — shared by `roomPillars` (tomb/temple)
 * and the temple's own altar placement, so both agree on where "the room" actually starts/ends. */
function roomBBoxPx(node: DungeonNode, px: (x: number) => number, py: (y: number) => number): { left: number; right: number; top: number; bottom: number; cellsW: number; cellsL: number } {
  const xs = node.cells.map((c) => c.x);
  const ys = node.cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { left: px(minX), right: px(maxX + 1), top: py(minY), bottom: py(maxY + 1), cellsW: maxX - minX + 1, cellsL: maxY - minY + 1 };
}

function roomPillars(node: DungeonNode, px: (x: number) => number, py: (y: number) => number): { x: number; y: number }[] {
  const { left, right, top, bottom, cellsW, cellsL } = roomBBoxPx(node, px, py);
  if (cellsW < 3 || cellsL < 3) return [];
  const xs2 = [left + (right - left) / 3, left + ((right - left) * 2) / 3];
  const ys2 = [top + (bottom - top) / 3, top + ((bottom - top) * 2) / 3];
  return xs2.flatMap((x) => ys2.map((y) => ({ x, y })));
}

/** Not a book map symbol — an Evil Temple/Shrine-only decoration (file-header note #5) marking
 * this generated complex's single largest room/chamber as its sanctuary: a slab with a plain
 * ring-and-bar sigil, deliberately generic rather than any specific real-world religious symbol,
 * echoing the book's own "altar"/"holy symbol" dungeon-dressing wording. */
function AltarGlyph({ x, y }: { x: number; y: number }) {
  const w = CELL_PX * 0.8;
  const h = CELL_PX * 0.36;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={h * 0.34} fill="none" stroke={INK} strokeWidth={1.3} />
      <line x1={x - w * 0.3} y1={y} x2={x + w * 0.3} y2={y} stroke={INK} strokeWidth={1.3} />
    </g>
  );
}

/** Not a book map symbol — a Castle-only decoration (file-header note #7) marking this generated
 * complex's bailey/courtyard: a plain well, the way a real castle's working yard would actually be
 * furnished, rather than a temple's colonnade (a castle bailey is a muster/work yard, not a
 * hypostyle hall). */
function WellGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={CELL_PX * 0.4} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={CELL_PX * 0.22} fill="none" stroke={INK} strokeWidth={1.2} />
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

export function DungeonMap({
  nodes,
  selectedId,
  onSelect,
  category,
  mapStyle,
  envelope,
  terrain,
}: {
  nodes: DungeonNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  category: LocationCategory;
  /** See `mapStyleFor` in lib/locationInput.ts — "natural" is a Cave/Cavern Network dungeon (file-
   * header note #3), "tomb" is a Tomb/Crypt (note #4). Every other category/subtype keeps the
   * original crisp constructed-wall style. */
  mapStyle: MapStyle;
  /** The building-layout generator's own precise outline (buildingLayout.ts's `BuildingEnvelope`)
   * — undefined for every non-building style, required (by construction, whenever `hasEnvelope` is
   * true below) for temple/castle. Passed straight through rather than re-derived from occupied
   * cells so a non-rectangular Temple shape renders as the actual polygon generated, not a
   * bounding-box approximation of it. */
  envelope?: { outline: GridPoint[]; corners: GridPoint[] };
  /** One of Appendix D's 14 wilderness terrain names — only meaningful when `mapStyle==="wilderness"`
   * (see file-header note #10 and `lib/wildernessStyles.ts`); undefined for every other style. */
  terrain?: string;
}) {
  const natural = mapStyle === "natural";
  const tomb = mapStyle === "tomb";
  const sewer = mapStyle === "sewer";
  const wilderness = mapStyle === "wilderness";
  const terrainStyle = wilderness ? (TERRAIN_STYLES[terrain ?? ""] ?? TERRAIN_STYLES.Plains) : null;
  const temple = mapStyle === "temple";
  const castle = mapStyle === "castle";
  const ruins = mapStyle === "ruins";
  function floorTintFor(kind: NodeKind): string {
    if (tomb) return TOMB_FLOOR_TINT[kind];
    if (sewer) return SEWER_FLOOR_TINT[kind];
    if (temple) return TEMPLE_FLOOR_TINT[kind];
    if (castle) return CASTLE_FLOOR_TINT[kind];
    if (ruins) return RUINS_FLOOR_TINT[kind];
    if (wilderness) return "transparent"; // one terrain-wide background wash instead — see note #10
    return FLOOR_TINT[kind];
  }
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
  // cell here already is one 10 ft square, so no separate grid layer is needed. A natural map
  // instead fills one solid blob per boundary loop (built below) and keeps these rects only as
  // invisible click targets, since a grid of individual tinted squares reads as hewn dungeon floor,
  // not a cave.
  const floorTiles = nodes.flatMap((node) =>
    node.cells.map((c, i) => (
      <rect
        key={`${node.id}-floor-${i}`}
        x={px(c.x)}
        y={py(c.y)}
        width={CELL_PX}
        height={CELL_PX}
        fill={natural ? "transparent" : floorTintFor(node.kind)}
        stroke={natural || wilderness ? "none" : "rgba(58,47,34,0.16)"}
        strokeWidth={0.75}
        onClick={() => onSelect(node.id)}
        style={{ cursor: "pointer" }}
      />
    )),
  );

  // --- Natural (cave) rendering: boundary-trace every occupied cell into closed loops, jitter and
  // smooth them into an organic outline, and fill/fringe them instead of drawing per-cell walls.
  // See the file-header note (#3) and the helper functions above for why.
  const naturalLoopsPx = natural
    ? boundaryLoops(new Set(cellOwner.keys()))
        .map((loop) => jitterLoop(loop, 1, 0.3))
        .map((loop) => loop.map((p) => ({ x: px(p.x), y: py(p.y) })))
    : [];
  const naturalFloorPath = naturalLoopsPx.map((loop) => smoothClosedPath(loop)).join(" ");
  const naturalWallPaths = naturalLoopsPx.map((loop, i) => <path key={`cave-wall-${i}`} d={smoothClosedPath(loop)} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />);
  const naturalHatch = naturalLoopsPx.flatMap((loop, i) =>
    rockHatchTicks(loop, i).map((t, j) => <line key={`cave-hatch-${i}-${j}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={INK} strokeWidth={1.1} opacity={0.6} strokeLinecap="round" />),
  );

  // A Sewer's own signature: a wavy sewage channel drawn down the middle of every corridor,
  // perturbed off each cell's own local direction (not the node's overall heading) so a
  // staircased diagonal corridor still gets a channel that follows its actual bends rather than
  // the coarser straight-line approximation `node.heading` alone would give.
  const sewerChannels = sewer
    ? nodes
        .filter((n) => n.kind === "corridor" && n.cells.length >= 2)
        .map((n) => {
          const centers = n.cells.map((c) => ({ x: px(c.x) + CELL_PX / 2, y: py(c.y) + CELL_PX / 2 }));
          const wavy = centers.map((c, i) => {
            const prev = centers[Math.max(0, i - 1)];
            const next = centers[Math.min(centers.length - 1, i + 1)];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const wave = Math.sin(i * 1.4) * CELL_PX * 0.14;
            return { x: c.x + nx * wave, y: c.y + ny * wave };
          });
          const d = `M ${wavy.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
          return <path key={`channel-${n.id}`} d={d} fill="none" stroke="#5c6b47" strokeWidth={2} opacity={0.55} strokeLinecap="round" />;
        })
    : [];

  // A Ruins floor is overgrown — a sparse per-cell hashed chance of a weed tuft, scattered across
  // every occupied cell regardless of what's actually rolled for that room (purely decorative, not
  // tied to Table 8 contents).
  const ruinsWeeds = ruins
    ? [...cellOwner.keys()].flatMap((key) => {
        const [cx, cy] = key.split(",").map(Number);
        if (mulberry32(hashSeed(cx, cy, 41))() >= 0.14) return [];
        return weedTuft(px(cx) + CELL_PX / 2, py(cy) + CELL_PX / 2, cx, cy);
      })
    : [];

  // --- Wilderness: one terrain-wide background wash (bounding box of everything occupied) with
  // scattered decorative marks standing in for the walk's own occupied cells, plus a dashed trail
  // line tracing every node's own anchor-to-far-end path — see file-header note (#10).
  let wildernessBBoxPx: { x: number; y: number; width: number; height: number } | null = null;
  if (wilderness) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const key of cellOwner.keys()) {
      const [x, y] = key.split(",").map(Number);
      xs.push(x);
      ys.push(y);
    }
    if (xs.length > 0) {
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      wildernessBBoxPx = { x: px(minX), y: py(minY), width: px(maxX + 1) - px(minX), height: py(maxY + 1) - py(minY) };
    }
  }
  const wildernessMarks =
    wilderness && terrainStyle
      ? [...cellOwner.keys()].flatMap((key) => {
          const [cx, cy] = key.split(",").map(Number);
          return terrainStyle.marks.flatMap((spec, mi) => {
            const rand = mulberry32(hashSeed(cx, cy, 50 + mi));
            if (rand() >= spec.density) return [];
            return [renderTerrainMark(spec.kind, px(cx) + CELL_PX / 2, py(cy) + CELL_PX / 2, spec.color, spec.scale ?? 1, cx, cy)];
          });
        })
      : [];
  // Every node contributes its own "anchor -> representative point" trail segment; since a node's
  // `anchor` is always its parent's own connection point, these chain into one continuous network
  // with no extra bookkeeping (no parentId filtering needed) — the same way occupied cells already
  // chain up without walls to mark the seams.
  const wildernessTrails: ReactNode[] = [];
  if (wilderness && terrainStyle) {
    for (const n of nodes) {
      if (n.kind === "corridor" && n.cells.length > 0) {
        const pts = [n.anchor, ...n.cells].map((c) => ({ x: px(c.x) + CELL_PX / 2, y: py(c.y) + CELL_PX / 2 }));
        const d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
        wildernessTrails.push(<path key={`trail-${n.id}`} d={d} fill="none" stroke={terrainStyle.trailColor} strokeWidth={1.6} strokeDasharray={terrainStyle.trailDash} strokeLinecap="round" />);
      } else if (n.cells.length > 0) {
        // An area node's children anchor from its farCell, not its own centroid marker — drawing
        // both segments (arrival at the marker, then departure to farCell) keeps the trail visibly
        // continuous through the marker instead of jumping straight to wherever farCell happens to be.
        const anchorPt = { x: px(n.anchor.x) + CELL_PX / 2, y: py(n.anchor.y) + CELL_PX / 2 };
        const cx = n.cells.reduce((s, c) => s + px(c.x), 0) / n.cells.length + CELL_PX / 2;
        const cy = n.cells.reduce((s, c) => s + py(c.y), 0) / n.cells.length + CELL_PX / 2;
        const farPt = { x: px(n.farCell.x) + CELL_PX / 2, y: py(n.farCell.y) + CELL_PX / 2 };
        wildernessTrails.push(
          <path
            key={`trail-${n.id}`}
            d={`M ${anchorPt.x} ${anchorPt.y} L ${cx} ${cy} L ${farPt.x} ${farPt.y}`}
            fill="none"
            stroke={terrainStyle.trailColor}
            strokeWidth={1.6}
            strokeDasharray={terrainStyle.trailDash}
            strokeLinecap="round"
          />,
        );
      } else {
        const v = firstStepVector(n.heading);
        const anchorPt = cellCenter(n.anchor.x, n.anchor.y);
        const mid = { x: anchorPt.x + (v.dx * CELL_PX) / 2, y: anchorPt.y + (v.dy * CELL_PX) / 2 };
        wildernessTrails.push(<line key={`trail-${n.id}`} x1={anchorPt.x} y1={anchorPt.y} x2={mid.x} y2={mid.y} stroke={terrainStyle.trailColor} strokeWidth={1.6} strokeDasharray={terrainStyle.trailDash} strokeLinecap="round" />);
      }
    }
  }

  // --- Building envelope (temple and castle both): tracing the generated shape's own (jagged,
  // gappy) silhouette still read as "a hewn maze with a thick outline," not "a building" — a real
  // building's footprint is a solid volume with no gaps, but a branching room-by-room/corridor-by-
  // corridor crawl sprawls with plenty of empty space between its arms. So instead, the envelope
  // comes straight from buildingLayout.ts's own precise `envelope` prop (its actual polygon — a
  // rectangle for Castle, or whichever shape Temple picked), with a hatch-filled background
  // standing in for "undetailed solid construction" everywhere inside that shape the dice never
  // actually reached. Real rooms/corridors still draw their own normal walls right on top,
  // completely unchanged, so they read as distinct rooms carved out of that mass — see file-header
  // notes (#6)/(#7).
  const hasEnvelope = (temple || castle || ruins) && !!envelope;
  const envelopeOutlinePx = envelope ? envelope.outline.map((p) => ({ x: px(p.x), y: py(p.y) })) : [];
  const envelopeCornersPx = envelope ? envelope.corners.map((p) => ({ x: px(p.x), y: py(p.y) })) : [];
  const envelopeFillPath = envelopeOutlinePx.length > 0 ? `M ${envelopeOutlinePx.map((p) => `${p.x} ${p.y}`).join(" L ")} Z` : "";

  // A castle's envelope also gets crenellations (alternating merlon squares projecting outward
  // along every side) and periodic wall towers (bigger round/square bumps, not just at the 4
  // corners) — the map-scale details that read as "castle" the way a plain thick wall doesn't.
  // Temple keeps a plain band instead — its pilasters are the interior signature. A plain
  // (non-rotated) shape looks the same regardless of which side it sits on, so no per-side rotation
  // math is needed for either.
  const crenellations: { x: number; y: number }[] = [];
  const wallTowers: { x: number; y: number; round: boolean; r: number }[] = [];
  if (castle && envelopeOutlinePx.length >= 3) {
    const CREN_PITCH = 10; // px: one merlon + one gap
    const TOWER_PITCH = 46; // px: one wall tower roughly every 25-30 ft of wall
    const CORNER_CLEARANCE = 16; // px: keep wall towers clear of the corner towers
    for (let i = 0; i < envelopeOutlinePx.length; i++) {
      const a = envelopeOutlinePx[i];
      const b = envelopeOutlinePx[(i + 1) % envelopeOutlinePx.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const nx = -uy;
      const ny = ux;
      const crenCount = Math.max(2, Math.round(len / CREN_PITCH));
      for (let t = 0; t < crenCount; t += 2) {
        const along = (t + 0.5) * (len / crenCount);
        crenellations.push({ x: a.x + ux * along + nx * 4.5, y: a.y + uy * along + ny * 4.5 });
      }
      const towerCount = Math.max(0, Math.round(len / TOWER_PITCH) - 1);
      for (let t = 1; t <= towerCount; t++) {
        const along = (t * len) / (towerCount + 1);
        if (along < CORNER_CLEARANCE || len - along < CORNER_CLEARANCE) continue;
        const tx = a.x + ux * along;
        const ty = a.y + uy * along;
        const rand = mulberry32(hashSeed(tx, ty, 3));
        wallTowers.push({ x: tx + nx * 3, y: ty + ny * 3, round: rand() < 0.6, r: 6.5 + rand() * 3 });
      }
    }
  }

  // A castle's own main entrance reads as a proper gatehouse — two flanking towers either side of
  // the actual threshold, not just wherever the periodic wall-tower spacing happened to land.
  const gatehouseTowers: { x: number; y: number; round: boolean; r: number }[] = [];
  if (castle) {
    const mainEntrance = nodes.find((n) => n.label === "Main Entrance");
    if (mainEntrance) {
      const c = cellCenter(mainEntrance.anchor.x, mainEntrance.anchor.y);
      const perp = perpVec(mainEntrance.heading);
      for (const side of [-1, 1]) {
        gatehouseTowers.push({ x: c.x + perp.dx * CELL_PX * 1.3 * side, y: c.y + perp.dy * CELL_PX * 1.3 * side, round: true, r: 8 });
      }
      // Drop any periodic wall tower that would otherwise overlap a gatehouse tower right next to it.
      for (let i = wallTowers.length - 1; i >= 0; i--) {
        if (gatehouseTowers.some((g) => Math.hypot(g.x - wallTowers[i].x, g.y - wallTowers[i].y) < 24)) wallTowers.splice(i, 1);
      }
    }
  }

  // --- Wall extraction: any edge of an occupied cell facing an unoccupied neighbor is a wall ----
  // `nx`/`ny` (the direction toward that unoccupied neighbor) is kept per segment so the stipple
  // pass below knows which side is "unmapped rock" to scatter its speckle on. Skipped for a natural
  // map — it uses the smoothed boundary loops above instead.
  const NEIGHBORS: { dx: number; dy: number; edge: "N" | "S" | "E" | "W" }[] = [
    { dx: 0, dy: -1, edge: "N" },
    { dx: 0, dy: 1, edge: "S" },
    { dx: 1, dy: 0, edge: "E" },
    { dx: -1, dy: 0, edge: "W" },
  ];
  const wallLines: { x1: number; y1: number; x2: number; y2: number; nx: number; ny: number }[] = [];
  for (const key of natural || wilderness ? [] : cellOwner.keys()) {
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
  // A Tomb/Crypt wall gets regular masonry-joint ticks, and an Evil Temple/Shrine wall gets sparser
  // pilaster/buttress stubs, instead of the sparse random rock speckle every other style uses — see
  // file-header notes #4/#5 and `masonryTicksForWall`/`pilasterForWall`.
  const wallStipple = tomb
    ? wallLines.flatMap((w, i) =>
        masonryTicksForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny).map((t, j) => (
          <line key={`joint-${i}-${j}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={INK} strokeWidth={1.2} opacity={0.7} strokeLinecap="round" />
        )),
      )
    : sewer
      ? wallLines.flatMap((w, i) =>
          sewerBrickTicksForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny).map((t, j) => (
            <line key={`brick-${i}-${j}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={INK} strokeWidth={1} opacity={0.6} strokeLinecap="round" />
          )),
        )
      : temple
        ? wallLines.flatMap((w, i) => {
            const p = pilasterForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny);
            return p ? [<line key={`pilaster-${i}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={INK} strokeWidth={3.2} strokeLinecap="square" opacity={0.85} />] : [];
          })
        : ruins
          ? wallLines.flatMap((w, i) =>
              rubbleForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny).map((c, j) => (
                <circle key={`rubble-${i}-${j}`} cx={c.cx} cy={c.cy} r={c.r} fill={INK} opacity={0.5} />
              )),
            )
          : wallLines.flatMap((w, i) =>
              stippleForWall(w.x1, w.y1, w.x2, w.y2, w.nx, w.ny).map((d, j) => (
                <circle key={`stipple-${i}-${j}`} cx={d.cx} cy={d.cy} r={d.r} fill={INK} opacity={0.55} />
              )),
            );

  // For a temple or castle, exactly one room/chamber in the whole generated complex reads as its
  // centerpiece (biggest floor area, ties broken by generation order) — for a building-layout
  // location this is, by construction, the central hall/courtyard itself. Picked here rather than
  // per-node so every node's overlay below can just check its own id against it. A temple's
  // centerpiece is its sanctuary (altar + colonnade); a castle's is its bailey (open, just a well —
  // real castle courtyards were the working/muster yard, not a colonnaded hall).
  const centerpieceId =
    temple || castle
      ? nodes
          .filter((n) => n.kind === "room" || n.kind === "chamber")
          .reduce<DungeonNode | null>((best, n) => {
            const area = (n.widthFt ?? 1) * (n.lengthFt ?? 1);
            const bestArea = best ? (best.widthFt ?? 1) * (best.lengthFt ?? 1) : -1;
            return area > bestArea ? n : best;
          }, null)?.id ?? null
      : null;

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
      const isCenterpiece = (temple || castle) && node.id === centerpieceId;
      const showPillars = (tomb && (node.kind === "room" || node.kind === "chamber")) || (temple && isCenterpiece);
      const pillars = showPillars ? roomPillars(node, px, py) : [];
      const altar = temple && isCenterpiece ? roomBBoxPx(node, px, py) : null;
      const well = castle && isCenterpiece ? roomBBoxPx(node, px, py) : null;
      return (
        <g key={`${node.id}-overlay`}>
          {wilderness && node.areaNumber !== undefined && <WildernessAreaMarker x={cx} y={cy} />}
          {pillars.map((p, i) => (
            <PillarGlyph key={`pillar-${i}`} x={p.x} y={p.y} />
          ))}
          {altar && <AltarGlyph x={(altar.left + altar.right) / 2} y={altar.top + (altar.bottom - altar.top) * 0.22} />}
          {well && <WellGlyph x={(well.left + well.right) / 2} y={(well.top + well.bottom) / 2} />}
          {node.areaNumber !== undefined && <AreaNumber x={cx} y={numberY} n={node.areaNumber} />}
          {letter && tokenCell && <MonsterLetterToken x={px(tokenCell.x) + CELL_PX / 2} y={py(tokenCell.y) + CELL_PX / 2} letter={letter} />}
          {stairsInRoom &&
            (sewer ? (
              <ManholeGlyph x={cx} y={glyphY} letter={stairDirectionLetter(node.label)} />
            ) : wilderness ? (
              <ElevationGlyph x={cx} y={glyphY} letter={stairDirectionLetter(node.label)} />
            ) : (
              <StairsGlyph x={cx} y={glyphY} heading={node.heading} natural={natural || node.kind === "cave" || node.kind === "cavern"} letter={stairDirectionLetter(node.label)} />
            ))}
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
      // A door (of any kind) doesn't mean anything outdoors — the underlying Table 6 roll still
      // happened (book-faithful), it just isn't drawn as a gateway symbol for Wilderness.
      if (!wilderness) {
        if (node.connectionToParent === "door") glyphs.push(<DoorGlyph key="door" x={mid.x} y={mid.y} heading={node.heading} />);
        else if (node.connectionToParent === "secretDoor") glyphs.push(<SecretDoorGlyph key="secret" x={mid.x} y={mid.y} heading={node.heading} />);
        else if (node.connectionToParent === "oneWayDoor") glyphs.push(<OneWayDoorGlyph key="oneway" x={mid.x} y={mid.y} heading={node.heading} />);
      }
      if (node.kind === "stairs") {
        const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
        const naturalStairs = natural || parent?.kind === "cave" || parent?.kind === "cavern";
        glyphs.push(
          sewer ? (
            <ManholeGlyph key="stairs" x={mid.x} y={mid.y} letter={stairDirectionLetter(node.label)} />
          ) : wilderness ? (
            <ElevationGlyph key="stairs" x={mid.x} y={mid.y} letter={stairDirectionLetter(node.label)} />
          ) : (
            <StairsGlyph key="stairs" x={mid.x} y={mid.y} heading={node.heading} natural={naturalStairs} letter={stairDirectionLetter(node.label)} />
          ),
        );
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
    (wilderness && selectedNode.cells.length > 0 ? (
      // A per-cell grid of highlight rects reveals the underlying square grid right through the
      // "no walls, just a marker" look every other Wilderness area uses — a single ring around the
      // node's own marker position reads as "selected" without breaking that illusion.
      (() => {
        const cx = selectedNode.cells.reduce((s, c) => s + px(c.x), 0) / selectedNode.cells.length + CELL_PX / 2;
        const cy = selectedNode.cells.reduce((s, c) => s + py(c.y), 0) / selectedNode.cells.length + CELL_PX / 2;
        return <circle cx={cx} cy={cy} r={CELL_PX * 0.85} fill="none" stroke="#8a3b2a" strokeWidth={2} style={{ pointerEvents: "none" }} />;
      })()
    ) : selectedNode.cells.length > 0 ? (
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
          {/* Diagonal-hatch fill for a building's "undetailed solid construction" background — the
              standard architectural-plan convention for solid material in section, reused here for
              whatever's inside the building's bounding rectangle that the dice never actually
              reached. Real floor tiles are opaque and draw on top, covering this everywhere a room
              or corridor actually exists. */}
          <pattern id="building-fill-hatch" width={7} height={7} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width={7} height={7} fill={floorTintFor("corridor")} />
            <line x1={0} y1={0} x2={0} y2={7} stroke={INK} strokeWidth={1} opacity={0.22} />
          </pattern>
        </defs>
        {natural && <path d={naturalFloorPath} fill={FLOOR_TINT.cave} stroke="none" />}
        {hasEnvelope && envelopeFillPath && (
          <path
            d={envelopeFillPath}
            fill="url(#building-fill-hatch)"
            stroke={INK}
            strokeWidth={7}
            strokeLinejoin="round"
            opacity={0.85}
            strokeDasharray={ruins ? "26,11,17,14,34,9,20,13" : undefined}
          />
        )}
        {wilderness && wildernessBBoxPx && terrainStyle && (
          <rect x={wildernessBBoxPx.x} y={wildernessBBoxPx.y} width={wildernessBBoxPx.width} height={wildernessBBoxPx.height} fill={terrainStyle.background} />
        )}
        {wildernessMarks}
        {wildernessTrails}
        {floorTiles}
        {sewerChannels}
        {wallStipple}
        {naturalHatch}
        <g filter="url(#hand-drawn-wobble)">
          {wallLines.map((w, i) => (
            <line
              key={i}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={INK}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={ruins ? ruinsDashArray(w.x1, w.y1, w.x2, w.y2) : undefined}
            />
          ))}
          {naturalWallPaths}
        </g>
        {ruins && ruinsWeeds.map((w, i) => <line key={`weed-${i}`} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#5c7a4a" strokeWidth={1.4} opacity={0.65} strokeLinecap="round" />)}
        {castle && crenellations.map((c, i) => <rect key={`cren-${i}`} x={c.x - 3.5} y={c.y - 3.5} width={7} height={7} fill={INK} />)}
        {castle &&
          [...wallTowers, ...gatehouseTowers].map((t, i) =>
            t.round ? (
              <circle key={`wtower-${i}`} cx={t.x} cy={t.y} r={t.r} fill={INK} stroke={PAPER} strokeWidth={1.5} />
            ) : (
              <rect key={`wtower-${i}`} x={t.x - t.r} y={t.y - t.r} width={t.r * 2} height={t.r * 2} fill={INK} stroke={PAPER} strokeWidth={1.5} />
            ),
          )}
        {hasEnvelope &&
          !ruins && // a ruin's corner towers have crumbled along with the rest of the wall — no intact turret glyph
          envelopeCornersPx.map((p, i) => <circle key={`turret-${i}`} cx={p.x} cy={p.y} r={castle ? 8.5 : 5} fill={INK} stroke={PAPER} strokeWidth={1.5} />)}
        {zeroCellHitTargets}
        {boundaryGlyphs}
        {areaOverlays}
        {highlight}
      </svg>
      <div className="dungeon-map-legend">
        {floorLegend(category).map(({ kind, label }) => (
          <span key={kind} className="legend-item">
            <span className="legend-swatch" style={{ background: wilderness && terrainStyle ? terrainStyle.background : floorTintFor(kind) }} />
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
        {!wilderness && !sewer && (
          <>
            <span className="legend-item">
              {/* This one and the 3 other legend previews below all offset a U/D letter well past
                  their glyph's own center (fine at real map scale, where nothing constrains how
                  far a glyph can spill) — a plain "0 0 24 24" viewBox clips that letter right at
                  the box edge. The wider viewBox gives it room without touching the glyphs' own
                  drawing math, which is still correct for the actual map. */}
              <svg className="legend-icon" viewBox="-6 -6 36 36">
                <StairsGlyph x={12} y={12} heading={90} natural={false} letter="U" />
              </svg>
              Stairs
            </span>
            <span className="legend-item">
              <svg className="legend-icon" viewBox="-6 -6 36 36">
                <StairsGlyph x={12} y={12} heading={90} natural={true} letter="D" />
              </svg>
              Natural Stairs
            </span>
          </>
        )}
        {sewer && (
          <span className="legend-item">
            <svg className="legend-icon" viewBox="-6 -6 36 36">
              <ManholeGlyph x={12} y={12} letter="U" />
            </svg>
            Manhole
          </span>
        )}
        {wilderness && (
          <span className="legend-item">
            <svg className="legend-icon" viewBox="-6 -6 36 36">
              <ElevationGlyph x={12} y={12} letter="U" />
            </svg>
            Elevation Change
          </span>
        )}
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
          Hazard
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
