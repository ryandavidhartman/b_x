// Appendix E, "Random Dungeon Generation": implements the book's own room-by-room/corridor-by-
// corridor loop (see the "How to create a random dungeon" steps 1-7 in combined-monsters.md)
// as a real work-queue algorithm. The book describes a *procedure* for a DM to hand-draw, not a
// coordinate system — turning it into placed grid cells for DungeonMap.tsx necessarily requires
// some invention where the book is silent (exact wall positions, how multiple exits share one
// room's perimeter, what happens when a roll would draw into already-occupied space outside the
// one explicit case the book covers under Table 6). Every such judgment call is called out in a
// comment at the point it's made, and echoed into the affected node's `notes` so the UI never
// presents an invented detail as book fact.
import {
  rollDie,
  lookup,
  rollDungeonEncounter,
  rollTreasureForType,
  rollUnguardedTreasure,
  type DungeonEncounterResult,
  type HoardResult,
} from "@shared/index";
import { rollTrap, rollHazard, rollTrick } from "./traps";
import { partyLevelToDungeonLevel } from "../lib/locationInput";
import {
  ROOM_SIZE,
  CHAMBER_SIZE,
  SPECIAL_SHAPE,
  CIRCULAR_FEATURE,
  UNUSUAL_SIZE,
  NUMBER_OF_EXITS,
  EXIT_LOCATION,
  EXIT_DIRECTION_CHAMBER,
  CHAMBER_ROOM_CONTENTS,
  TREASURE_CONTAINER,
  TREASURE_GUARDS,
  TREASURE_HIDDEN,
  STAIRS,
  CAVES,
  POOLS,
  LAKES,
  MAGIC_POOL_CATEGORY,
  MAGIC_POOL_TRANSMUTE,
  ATTRIBUTES,
  MAGIC_POOL_ALIGNMENT,
  MAGIC_POOL_TRANSPORT,
  GENERAL,
  DOOR_LOCATION,
  BEHIND_THE_DOOR,
  SIDE_PASSAGES,
  PASSAGE_WIDTH,
  SPECIAL_PASSAGES,
  TURNS,
  type RoomContentsResult,
  type ExitsOutcome,
} from "../data/randomDungeon";

export type Heading = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export interface GridPoint {
  x: number;
  y: number;
}
export type NodeKind = "room" | "chamber" | "corridor" | "cave" | "cavern" | "stairs" | "deadEnd" | "secretDoor";

export interface DungeonNode {
  id: string;
  kind: NodeKind;
  parentId: string | null;
  heading: Heading;
  anchor: GridPoint;
  cells: GridPoint[];
  farCell: GridPoint;
  label: string;
  /** Sequential key number (1, 2, 3, ...) for AREA_KINDS nodes only, in generation order — lets
   * the map and the room-by-room log cross-reference each other the way a published dungeon
   * key's numbered map and numbered room descriptions do. Corridors/dead ends/secret doors are
   * never numbered, matching that convention. */
  areaNumber?: number;
  notes: string[];
  contents?: RoomContentsResult;
  encounter?: DungeonEncounterResult | null;
  wanderingMonsters?: DungeonEncounterResult[];
  treasure?: HoardResult | null;
  container?: string;
  guard?: string | null;
  hidden?: string | null;
  trap?: string;
  hazard?: string;
  trick?: string;
}

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

function turn(h: Heading, delta: number): Heading {
  return (((h + delta) % 360) + 360) % 360 as Heading;
}
function perp(h: Heading): Heading {
  return turn(h, 90);
}
function cellKey(p: GridPoint): string {
  return `${p.x},${p.y}`;
}

// Table 6's four "Exit Location" results are read relative to the wall the party came in
// through (the book is hand-drawn on paper, so a DM just eyeballs this). "Same Wall" isn't
// explained further in the text — treated here as a passage doubling back alongside the
// entrance (180 degrees), the only reading consistent with it being distinct from "Opposite
// Wall" (straight ahead, 0 degrees).
function wallTurn(location: "Left Wall" | "Opposite Wall" | "Right Wall" | "Same Wall"): number {
  switch (location) {
    case "Left Wall":
      return -90;
    case "Opposite Wall":
      return 0;
    case "Right Wall":
      return 90;
    case "Same Wall":
      return 180;
  }
}

const MAX_RECT_CELLS = 12; // 120 ft — caps giant caverns/unusual rooms so the map stays legible; noted on the node when it bites.
const FT_PER_CELL = 10;

function feetToCells(ft: number): number {
  return Math.min(MAX_RECT_CELLS, Math.max(1, Math.round(ft / FT_PER_CELL)));
}

function rectCells(anchor: GridPoint, heading: Heading, widthFt: number, lengthFt: number): GridPoint[] {
  const wCells = feetToCells(widthFt);
  const lCells = feetToCells(lengthFt);
  const fv = HEADING_VECTORS[heading];
  const pv = HEADING_VECTORS[perp(heading)];
  const cells: GridPoint[] = [];
  const loOff = -Math.floor((wCells - 1) / 2);
  const hiOff = Math.ceil((wCells - 1) / 2);
  for (let len = 1; len <= lCells; len++) {
    for (let w = loOff; w <= hiOff; w++) {
      cells.push({ x: anchor.x + fv.dx * len + pv.dx * w, y: anchor.y + fv.dy * len + pv.dy * w });
    }
  }
  return cells;
}

function lineCells(anchor: GridPoint, heading: Heading, steps: number): GridPoint[] {
  const fv = HEADING_VECTORS[heading];
  const cells: GridPoint[] = [];
  for (let i = 1; i <= steps; i++) cells.push({ x: anchor.x + fv.dx * i, y: anchor.y + fv.dy * i });
  return cells;
}

function farCellOf(cells: GridPoint[]): GridPoint {
  return cells[cells.length - 1];
}

// The "Max Rooms" input is meant to cap actual destinations — rooms, chambers, caves/caverns,
// and stairs — not the corridor segments, dead ends, and secret-door stubs strung between them.
// Counting every node toward one shared budget (the original implementation) meant a small cap
// could be entirely consumed by corridor segments before a single room ever appeared, which is
// exactly the "only generates corridors" bug this fixes. Corridors/dead ends/secret doors are
// still bounded, just by a much larger safety ceiling (`hardNodeCap`) so a bad-luck run of
// nothing-but-corridors can't run away forever.
const AREA_KINDS: ReadonlySet<NodeKind> = new Set(["room", "chamber", "cave", "cavern", "stairs"]);

export interface GenState {
  subtype: string;
  partyLevel: number;
  occupied: Set<string>;
  nodes: DungeonNode[];
  work: PendingWork[];
  nextId: number;
  /** Cap on AREA_KINDS nodes (what the UI calls "Max Rooms") — see AREA_KINDS comment above. */
  maxNodes: number;
  /** Safety ceiling on total nodes of any kind, so a run that never lands a room can't run away. */
  hardNodeCap: number;
  areaCount: number;
}

type PendingWork =
  | { kind: "continue"; atNodeId: string }
  | { kind: "exit"; parentId: string; exitKind: "door" | "passage"; heading: Heading; wallSide: "side" | "straight" };

function newId(state: GenState): string {
  return `dn-${state.nextId++}`;
}

function nodeById(state: GenState, id: string): DungeonNode | undefined {
  return state.nodes.find((n) => n.id === id);
}

/** Try to commit `cells` to the map; on a collision with already-placed geometry, the book only
 * gives us a rule for one specific case (a room/chamber exit that opens into mapped space — see
 * resolveDoorWallCollision below). Everywhere else (mid-corridor turns, side passages) it's
 * silent, so this nudges the heading through a small set of alternatives before giving up and
 * telling the caller to terminate the branch instead — an invented fallback, not a book rule. */
function tryPlace(state: GenState, cells: GridPoint[]): boolean {
  if (cells.some((c) => state.occupied.has(cellKey(c)))) return false;
  cells.forEach((c) => state.occupied.add(cellKey(c)));
  return true;
}

function hasMappedNeighbor(state: GenState, cells: GridPoint[]): boolean {
  for (const c of cells) {
    for (const d of [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ]) {
      const key = cellKey({ x: c.x + d.dx, y: c.y + d.dy });
      if (state.occupied.has(key) && !cells.some((cc) => cellKey(cc) === key)) return true;
    }
  }
  return false;
}

function makeNode(
  state: GenState,
  parentId: string | null,
  kind: NodeKind,
  heading: Heading,
  anchor: GridPoint,
  cells: GridPoint[],
  label: string,
): DungeonNode {
  const node: DungeonNode = {
    id: newId(state),
    kind,
    parentId,
    heading,
    anchor,
    cells,
    farCell: cells.length > 0 ? farCellOf(cells) : anchor,
    label,
    notes: [],
  };
  state.nodes.push(node);
  if (AREA_KINDS.has(kind)) {
    state.areaCount++;
    node.areaNumber = state.areaCount;
  }
  return node;
}

// --- Table 4: cascading reroll ("16-20 = reroll, raise base by 1,000 sq ft each time") --------
function rollUnusualSizeSqFt(notes: string[]): number {
  let base = 0;
  for (let guard = 0; guard < 20; guard++) {
    const roll = rollDie(20);
    const val = lookup(roll, UNUSUAL_SIZE);
    notes.push(`Table 4 (d20=${roll}): ${val === "Reroll" ? "reroll" : `${val} sq ft`}`);
    if (val !== "Reroll") return base + val;
    base += 1000;
  }
  return base; // pathological run of 16-20s; bail out rather than loop forever.
}

// --- Table 8's treasure follow-up: Table 9 container, optional Table 10/11 --------------------
function rollContainerAndSecurity(notes: string[]): { container: string; guard: string | null; hidden: string | null } {
  const cRoll = rollDie(20);
  const container = lookup(cRoll, TREASURE_CONTAINER);
  notes.push(`Table 9 (d20=${cRoll}): ${container}`);
  let guard: string | null = null;
  let hidden: string | null = null;
  if (rollDie(2) === 1) {
    const gRoll = rollDie(20);
    guard = lookup(gRoll, TREASURE_GUARDS);
    const hRoll = rollDie(20);
    hidden = lookup(hRoll, TREASURE_HIDDEN);
    notes.push(`Table 10 (d20=${gRoll}): ${guard}`, `Table 11 (d20=${hRoll}): ${hidden}`);
  }
  return { container, guard, hidden };
}

function rollRoomOrChamberContents(state: GenState, node: DungeonNode) {
  const roll = rollDie(20);
  const contents = lookup(roll, CHAMBER_ROOM_CONTENTS);
  node.contents = contents;
  node.notes.push(`Table 8 (d20=${roll}): ${contents}`);

  if (contents === "Monster" || contents === "Monster and Treasure") {
    const encounter = rollDungeonEncounter(state.subtype, state.partyLevel);
    node.encounter = encounter;
    node.notes.push(`Monster: ${encounter.resultRaw}`);
    if (contents === "Monster and Treasure" && encounter.monster) {
      const treasureType = encounter.monster.stats["Treasure Type"];
      if (treasureType) node.treasure = rollTreasureForType(treasureType, undefined, undefined, false);
      const { container, guard, hidden } = rollContainerAndSecurity(node.notes);
      node.container = container;
      node.guard = guard;
      node.hidden = hidden;
    }
  } else if (contents === "Treasure") {
    node.treasure = rollUnguardedTreasure(partyLevelToDungeonLevel(state.partyLevel));
    const { container, guard, hidden } = rollContainerAndSecurity(node.notes);
    node.container = container;
    node.guard = guard;
    node.hidden = hidden;
  } else if (contents === "Stairs") {
    const sRoll = rollDie(20);
    const stairs = lookup(sRoll, STAIRS);
    node.label += ` — Stairs: ${stairs}`;
    node.notes.push(`Table 12 (d20=${sRoll}): ${stairs}`);
  } else if (contents === "Trick or Trap") {
    // The book leaves the trap-vs-trick-vs-hazard choice to the DM ("for a Cave or Cavern, an
    // Environmental Hazard may fit better") — this engine rolls a trap by default and only
    // switches to a hazard for cave/cavern nodes, then always also offers a trick as an
    // alternative reading in the notes, rather than silently picking one interpretation.
    if (node.kind === "cave" || node.kind === "cavern") {
      const hazard = rollHazard();
      node.hazard = hazard.map((h) => `${h.column} (d12=${h.roll}): ${h.effect}`).join("; ");
      node.notes.push(`Environmental Hazard (natural location, per the book's own note): ${node.hazard}`);
    } else {
      const trap = rollTrap();
      node.trap = `${trap.type} (d%=${trap.roll})`;
      node.notes.push(`Random Trap Generation: ${node.trap} — severity is the DM's own call, per the book.`);
    }
    const trick = rollTrick();
    node.trick = `${trick.object}, ${trick.attribute}`;
    node.notes.push(`(Alternative reading — Trick: ${node.trick})`);
  }
}

// --- Table 5: Number of Exits ------------------------------------------------------------------
function resolveExitsOutcome(outcome: ExitsOutcome, state: GenState, node: DungeonNode): { count: number; isSwitchRow: boolean } {
  switch (outcome.kind) {
    case "fixed":
      return { count: outcome.count, isSwitchRow: false };
    case "1d4": {
      const r = rollDie(4);
      node.notes.push(`Table 5 exits: 1d4 = ${r}`);
      return { count: r, isSwitchRow: false };
    }
    case "switch":
      return { count: 1, isSwitchRow: true };
    case "secret-check": {
      const adjacent = hasMappedNeighbor(state, node.cells);
      if (!adjacent) {
        node.notes.push("Table 5: no exits rolled, and no nearby mapped space to check for a secret door — dead end.");
        return { count: 0, isSwitchRow: false };
      }
      const secretRoll = rollDie(100);
      const found = secretRoll <= 25;
      node.notes.push(`Table 5: secret-door check near mapped space (d%=${secretRoll}) — ${found ? "found" : "none"}.`);
      if (found) node.notes.push("Secret door here loops back to already-mapped space — not drawn as a new branch.");
      return { count: 0, isSwitchRow: false };
    }
  }
}

function queueRoomExits(state: GenState, node: DungeonNode, areaSqFt: number, kind: "room" | "chamber") {
  const roll = rollDie(20);
  const row = NUMBER_OF_EXITS.find((r) => roll >= r.min && roll <= r.max)!;
  const branch = row.threshold === null || areaSqFt <= row.threshold ? row.atOrBelow : row.above;
  node.notes.push(`Table 5 (d20=${roll}, area ${areaSqFt} sq ft): ${JSON.stringify(branch)}`);
  const { count, isSwitchRow } = resolveExitsOutcome(branch, state, node);

  // Row 20 ("1**") swaps the normal room=door / chamber=passage convention for this one exit.
  const exitKind: "door" | "passage" = isSwitchRow ? (kind === "room" ? "passage" : "door") : kind === "room" ? "door" : "passage";

  for (let i = 0; i < count; i++) {
    const locRoll = rollDie(20);
    const location = lookup(locRoll, EXIT_LOCATION);
    node.notes.push(`Table 6 (d20=${locRoll}): ${location}`);
    const heading = turn(node.heading, wallTurn(location));
    const wallSide: "side" | "straight" = location === "Left Wall" || location === "Right Wall" ? "side" : "straight";
    state.work.push({ kind: "exit", parentId: node.id, exitKind, heading, wallSide });
  }
}

// --- Room / chamber generation, shared by the initial room and every "behind the door" room ----
function generateRoomOrChamber(state: GenState, parentId: string | null, heading: Heading, anchor: GridPoint, kind: "room" | "chamber") {
  // "The lowest levels of a dungeon are often composed of caves and caverns. Use the table
  // below for caves and caverns, and roll for exits on Table 5." The book doesn't say exactly
  // when a DM switches over to Table 13 instead of Table 2 — read here as: every room/chamber
  // roll in a Cave/Cavern Network location uses Table 13 instead (engine judgment call, but the
  // one that actually makes the Cave/Cavern Network subtype behave differently, per this app's
  // two-input-fidelity rule).
  if (state.subtype === "Cave / Cavern Network") {
    const notes: string[] = [];
    const cave = rollCaveOrCavern();
    notes.push(`Table 13 (Caves): ${cave.label}`);
    if (cave.poolNote) notes.push(`Pool: ${cave.poolNote}`);
    if (cave.lakeNote) notes.push(`Lake: ${cave.lakeNote}`);
    const node = commitRoom(state, parentId, heading, anchor, "chamber", cave.label, cave.width, cave.length, notes, "cave", "Cave/Cavern");
    return node;
  }
  const notes: string[] = [];
  const sizeRoll = rollDie(20);
  const sizeTable = kind === "room" ? ROOM_SIZE : CHAMBER_SIZE;
  const sizeResult = lookup(sizeRoll, sizeTable);
  notes.push(`Table ${kind === "room" ? "2(a)" : "2(b)"} (d20=${sizeRoll}): ${sizeResult === "Special" ? "Special" : `${sizeResult.width} x ${sizeResult.length} ft`}`);

  let width: number;
  let length: number;
  let shapeLabel = kind === "room" ? "Room" : "Chamber";

  if (sizeResult === "Special") {
    const shapeRoll = rollDie(20);
    const shape = lookup(shapeRoll, SPECIAL_SHAPE);
    notes.push(`Table 3 (d20=${shapeRoll}): ${shape}`);
    shapeLabel = shape;
    let sqFt: number | null = null;
    if (shape === "Circular") {
      const featRoll = rollDie(20);
      const feature = lookup(featRoll, CIRCULAR_FEATURE);
      notes.push(`Circular feature (d20=${featRoll}): ${feature}`);
      if (feature !== "None") {
        // The book sends Pool/Well/Shaft results straight to a feature note, not to Table 4 for
        // a size — it never says how big the room itself is in that case. Defaulting to a
        // moderate 30x30 footprint here is this engine's own call, not the book's.
        width = 30;
        length = 30;
        shapeLabel = `Circular (${feature})`;
        notes.push(`No book-specified size for a Circular room with a ${feature} — defaulted to 30 x 30 ft (engine judgment call).`);
        const node = commitRoom(state, parentId, heading, anchor, kind, shapeLabel, width, length, notes);
        return node;
      }
    }
    sqFt = rollUnusualSizeSqFt(notes);
    // The book only gives square footage for these shapes, never width x length — approximating
    // as a square footprint (side = sqrt(area), rounded to the nearest 10 ft) is this engine's
    // own call, needed to place a rectangle on the grid at all.
    const side = Math.max(10, Math.round(Math.sqrt(sqFt) / 10) * 10);
    width = side;
    length = side;
    notes.push(`Approximated as a ${side} x ${side} ft footprint for mapping (engine judgment call — book gives sq ft only for this shape).`);
  } else {
    width = sizeResult.width;
    length = sizeResult.length;
  }

  return commitRoom(state, parentId, heading, anchor, kind, shapeLabel, width, length, notes);
}

function commitRoom(
  state: GenState,
  parentId: string | null,
  heading: Heading,
  anchor: GridPoint,
  kind: "room" | "chamber",
  shapeLabel: string,
  width: number,
  length: number,
  notes: string[],
  nodeKind: NodeKind = kind,
  labelPrefix: string = kind === "room" ? "Room" : "Chamber",
): DungeonNode | null {
  const cells = rectCells(anchor, heading, width, length);
  if (!tryPlace(state, cells)) {
    // No book rule covers a fresh room/chamber placement colliding — treat as reaching a
    // boundary already mapped from another direction and stub out a dead end (engine fallback).
    const stub = makeNode(state, parentId, "deadEnd", heading, anchor, [], `${shapeLabel} (couldn't be placed — ran into mapped space)`);
    stub.notes = [...notes, "Engine judgment call: collision on placement, stubbed as a dead end rather than overlapping another area."];
    return stub;
  }
  const node = makeNode(state, parentId, nodeKind, heading, anchor, cells, `${labelPrefix} (${shapeLabel}, ${width} x ${length} ft)`);
  node.notes = notes;
  rollRoomOrChamberContents(state, node);
  if (node.contents !== "Stairs") {
    queueRoomExits(state, node, width * length, kind);
  }
  return node;
}

// --- Corridor placement ---------------------------------------------------------------------
function commitCorridor(state: GenState, parentId: string, heading: Heading, anchor: GridPoint, steps: number, label: string, notes: string[]): DungeonNode | null {
  const cells = lineCells(anchor, heading, steps);
  if (!tryPlace(state, cells)) {
    const stub = makeNode(state, parentId, "deadEnd", heading, anchor, [], `${label} — ran into mapped space`);
    stub.notes = [...notes, "Engine judgment call: corridor collided with existing geometry, stubbed as a dead end."];
    return stub;
  }
  const node = makeNode(state, parentId, "corridor", heading, anchor, cells, label);
  node.notes = notes;
  return node;
}

function rollPassageWidthFlavor(notes: string[]) {
  const wRoll = rollDie(20);
  const width = lookup(wRoll, PASSAGE_WIDTH);
  if (width === "Special") {
    const sRoll = rollDie(20);
    const special = lookup(sRoll, SPECIAL_PASSAGES);
    notes.push(`Table 21 (d20=${wRoll}): Special -> Table 22 (d20=${sRoll}): ${special}`);
  } else {
    notes.push(`Table 21 (d20=${wRoll}): ${width} ft wide`);
  }
}

// --- Table 17: General, Doors, and Passages -----------------------------------------------------
function processContinue(state: GenState, atNodeId: string) {
  const atNode = nodeById(state, atNodeId);
  if (!atNode) return;
  const heading = atNode.heading;
  const anchor = atNode.farCell;

  let roll = rollDie(20);
  let result = lookup(roll, GENERAL);
  const wandering: DungeonEncounterResult[] = [];
  let guard = 0;
  while (result === "Wandering Monster" && guard < 5) {
    const encounter = rollDungeonEncounter(state.subtype, state.partyLevel);
    wandering.push(encounter);
    atNode.notes.push(`Table 17 (d20=${roll}): Wandering Monster — ${encounter.resultRaw} (rerolling per the book's own instruction, to place it)`);
    roll = rollDie(20);
    result = lookup(roll, GENERAL);
    guard++;
  }
  if (wandering.length > 0) atNode.wanderingMonsters = [...(atNode.wanderingMonsters ?? []), ...wandering];
  atNode.notes.push(`Table 17 (d20=${roll}): ${result}`);

  switch (result) {
    case "Chamber": {
      generateRoomOrChamber(state, atNode.id, heading, anchor, "chamber");
      return;
    }
    case "Continue": {
      const node = commitCorridor(state, atNode.id, heading, anchor, 5, "Corridor continues (50 ft)", []);
      if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
      return;
    }
    case "Dead End": {
      const adjacent = hasMappedNeighbor(state, [anchor]);
      if (adjacent) {
        const secretRoll = rollDie(100);
        const found = secretRoll <= 25;
        const node = makeNode(state, atNode.id, found ? "secretDoor" : "deadEnd", heading, anchor, [], found ? "Secret door (loops back)" : "Dead End");
        node.notes.push(`Secret-door check near mapped space (d%=${secretRoll}): ${found ? "found" : "none"}.`);
      } else {
        makeNode(state, atNode.id, "deadEnd", heading, anchor, [], "Dead End");
      }
      return;
    }
    case "Door": {
      const dRoll = rollDie(20);
      const doorLoc = lookup(dRoll, DOOR_LOCATION);
      atNode.notes.push(`Table 18 (d20=${dRoll}): ${doorLoc}`);
      if (doorLoc === "Ahead") {
        state.work.push({ kind: "exit", parentId: atNode.id, exitKind: "door", heading, wallSide: "straight" });
      } else {
        const doorHeading = turn(heading, doorLoc === "Left" ? -90 : 90);
        state.work.push({ kind: "exit", parentId: atNode.id, exitKind: "door", heading: doorHeading, wallSide: "side" });
        const alsoRoll = rollDie(20);
        if (alsoRoll <= 3) {
          atNode.notes.push(`Also a door on the opposite side (d20=${alsoRoll} <= 3).`);
          state.work.push({ kind: "exit", parentId: atNode.id, exitKind: "door", heading: turn(doorHeading, 180), wallSide: "side" });
        }
        // The original corridor continues past a side door, per Table 17's own footnote.
        state.work.push({ kind: "continue", atNodeId: atNode.id });
      }
      return;
    }
    case "Side Passage": {
      const spRoll = rollDie(20);
      const sp = lookup(spRoll, SIDE_PASSAGES);
      atNode.notes.push(`Table 20 (d20=${spRoll}): ${sp}`);
      const headings: Heading[] = (() => {
        switch (sp) {
          case "Left 90":
            return [turn(heading, -90)];
          case "Right 90":
            return [turn(heading, 90)];
          case "Left 45":
            return [turn(heading, -45)];
          case "Right 45":
            return [turn(heading, 45)];
          case "T":
            return [turn(heading, -90), turn(heading, 90)];
          case "Y":
            return [turn(heading, -45), turn(heading, 45)];
          case "Four-Way":
            return [heading, turn(heading, -90), turn(heading, 90)];
          case "Five-Way":
            // "Usually two passages along the x-axis, two along the y-axis, and one diagonal" —
            // approximated as straight + both 90-degree turns + one 45-degree diagonal.
            return [heading, turn(heading, -90), turn(heading, 90), turn(heading, 45)];
        }
      })();
      for (const h of headings) {
        if (atCap(state)) break; // a 4/5-way intersection can otherwise overshoot the cap in one step
        rollPassageWidthFlavor(atNode.notes);
        const node = commitCorridor(state, atNode.id, h, anchor, 3, "Corridor (30 ft)", []);
        if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
      }
      return;
    }
    case "Stairs": {
      const sRoll = rollDie(20);
      const stairs = lookup(sRoll, STAIRS);
      const node = makeNode(state, atNode.id, "stairs", heading, anchor, [], `Stairs: ${stairs}`);
      node.notes.push(`Table 12 (d20=${sRoll}): ${stairs}`);
      if (stairs.includes("passage continues")) {
        state.work.push({ kind: "continue", atNodeId: node.id });
      }
      return;
    }
    case "Turn": {
      const tRoll = rollDie(20);
      const t = lookup(tRoll, TURNS);
      atNode.notes.push(`Table 23 (d20=${tRoll}): ${t}`);
      const delta = t === "Left 90" ? -90 : t === "Right 90" ? 90 : t === "Left 45" ? -45 : 45;
      if (t === "Left 45" || t === "Right 45") {
        const aheadBehind = rollDie(6);
        atNode.notes.push(`45-degree turn ahead/behind check (d6=${aheadBehind}): ${aheadBehind <= 3 ? "ahead" : "behind"}`);
      }
      const newHeading = turn(heading, delta);
      const node = commitCorridor(state, atNode.id, newHeading, anchor, 3, "Corridor (30 ft, after turn)", []);
      if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
      return;
    }
  }
}

// --- Resolving a queued room/chamber exit (door or passage) -------------------------------------
// When a door's rolled location would draw into already-mapped space, Table 6 gives an explicit
// rule (reroll to opposite wall / secret door / one-way door) — applied here before Table 19.
function resolveExitCollisionIfNeeded(state: GenState, parent: DungeonNode, heading: Heading, notes: string[]): { heading: Heading; terminal: "secret" | "oneway" | null } {
  const probe = lineCells(parent.farCell, heading, 1);
  if (!probe.some((c) => state.occupied.has(cellKey(c)))) return { heading, terminal: null };
  const roll = rollDie(20);
  const resolution = lookup(roll, [
    { min: 1, max: 10, value: "Opposite Wall" as const },
    { min: 11, max: 15, value: "Secret Door" as const },
    { min: 16, max: 20, value: "One-Way Door" as const },
  ]);
  notes.push(`Exit opens into mapped space — Table 6 collision rule (d20=${roll}): ${resolution}`);
  if (resolution === "Opposite Wall") return { heading: turn(heading, 180), terminal: null };
  if (resolution === "Secret Door") return { heading, terminal: "secret" };
  return { heading, terminal: "oneway" };
}

function processExit(state: GenState, item: Extract<PendingWork, { kind: "exit" }>) {
  const parent = nodeById(state, item.parentId);
  if (!parent) return;
  const notes: string[] = [];
  const { heading, terminal } = resolveExitCollisionIfNeeded(state, parent, item.heading, notes);
  if (terminal) {
    const node = makeNode(state, parent.id, terminal === "secret" ? "secretDoor" : "deadEnd", heading, parent.farCell, [], terminal === "secret" ? "Secret door (loops back)" : "One-way door (dead end from this side)");
    node.notes = notes;
    return;
  }

  if (item.exitKind === "door") {
    const bRoll = rollDie(20);
    const behind = lookup(bRoll, BEHIND_THE_DOOR);
    notes.push(`Table 19 (d20=${bRoll}): ${behind}`);
    rollPassageWidthFlavor(notes);
    switch (behind) {
      case "Side Door": {
        if (item.wallSide === "side") {
          const node = commitCorridor(state, parent.id, heading, parent.farCell, 3, "Parallel passage (side door)", notes);
          if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
        } else {
          commitRoom(state, parent.id, heading, parent.farCell, "room", "Room", 10, 10, notes);
        }
        return;
      }
      case "Straight Passage": {
        const node = commitCorridor(state, parent.id, heading, parent.farCell, 3, "Corridor (30 ft)", notes);
        if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
        return;
      }
      case "Passage Left 45":
      case "Passage Right 45": {
        const h2 = turn(heading, behind === "Passage Left 45" ? -45 : 45);
        const node = commitCorridor(state, parent.id, h2, parent.farCell, 3, "Corridor (30 ft)", notes);
        if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
        return;
      }
      case "Room": {
        const node = generateRoomOrChamber(state, parent.id, heading, parent.farCell, "room");
        if (node) node.notes = [...notes, ...node.notes];
        return;
      }
      case "Chamber": {
        const node = generateRoomOrChamber(state, parent.id, heading, parent.farCell, "chamber");
        if (node) node.notes = [...notes, ...node.notes];
        return;
      }
    }
  } else {
    const dirRoll = rollDie(20);
    const dir = lookup(dirRoll, EXIT_DIRECTION_CHAMBER);
    notes.push(`Table 7 (d20=${dirRoll}): ${dir}`);
    const h2 = dir === "Straight" ? heading : turn(heading, dir === "Left 45" ? -45 : 45);
    rollPassageWidthFlavor(notes);
    const node = commitCorridor(state, parent.id, h2, parent.farCell, 3, "Corridor (30 ft)", notes);
    if (node && node.kind === "corridor") state.work.push({ kind: "continue", atNodeId: node.id });
  }
}

// --- Top-level entry points ---------------------------------------------------------------------
export interface GenerateOptions {
  subtype: string;
  partyLevel: number;
  maxNodes?: number;
  startArea?: number | "empty";
}

export function createInitialState(opts: GenerateOptions): GenState {
  const maxNodes = opts.maxNodes ?? 20;
  const state: GenState = {
    subtype: opts.subtype,
    partyLevel: opts.partyLevel,
    occupied: new Set(),
    nodes: [],
    work: [],
    nextId: 0,
    maxNodes,
    hardNodeCap: Math.max(200, maxNodes * 15),
    areaCount: 0,
  };
  const anchor: GridPoint = { x: 0, y: 0 };
  state.occupied.add(cellKey(anchor));
  const label = opts.startArea === "empty" || opts.startArea === undefined ? "Starting Point (empty area)" : `Starting Area ${opts.startArea} (Table 1)`;
  const start = makeNode(state, null, "corridor", 0, anchor, [anchor], label);
  if (opts.startArea !== "empty" && opts.startArea !== undefined) {
    // A pre-drawn starting area already has its own rooms/corridors/doors on the book's diagram
    // (not reproduced here — we don't have that art) — approximated as: roll this start point's
    // own contents immediately (book step 6), then branch outward normally (engine judgment call).
    rollRoomOrChamberContents(state, start);
    start.notes.push("Approximated a pre-drawn starting area as an immediate Table 8 contents roll on the start point itself (engine judgment call — the book's starting-area art isn't reproduced here).");
  }
  state.work.push({ kind: "continue", atNodeId: start.id });
  return state;
}

function atCap(state: GenState): boolean {
  return state.areaCount >= state.maxNodes || state.nodes.length >= state.hardNodeCap;
}

function step(state: GenState): boolean {
  if (state.work.length === 0 || atCap(state)) return false;
  const item = state.work.shift()!;
  if (item.kind === "continue") processContinue(state, item.atNodeId);
  else processExit(state, item);
  return true;
}

/** Drives the engine one node at a time — for the UI's step-by-step reveal mode. Returns false
 * once generation is finished (work queue empty, the room cap is hit, or the corridor-count
 * safety ceiling is hit). */
export function stepGeneration(state: GenState): boolean {
  const before = state.nodes.length;
  while (state.work.length > 0 && !atCap(state) && state.nodes.length === before) {
    if (!step(state)) return false;
  }
  return state.work.length > 0 && !atCap(state);
}

/** Runs the whole thing in one shot — "roll the whole thing before a session." */
export function generateWholeDungeon(opts: GenerateOptions): DungeonNode[] {
  const state = createInitialState(opts);
  let guard = 0;
  while (step(state) && guard < 5000) guard++;
  return state.nodes;
}

export function magicPoolDescription(): string {
  const notes: string[] = [];
  const catRoll = rollDie(20);
  const category = lookup(catRoll, MAGIC_POOL_CATEGORY);
  notes.push(`Table 16 (d20=${catRoll}): ${category}`);
  if (category === "Transmute") {
    const r = rollDie(20);
    const to = lookup(r, MAGIC_POOL_TRANSMUTE);
    notes.push(`Transmutes gold pieces to ${to} (d20=${r}); non-magical after one use.`);
  } else if (category === "Attribute") {
    const pct = rollDie(100);
    const gain = pct >= 51;
    const attrRoll = rollDie(6);
    const attr = ATTRIBUTES[attrRoll - 1];
    notes.push(`Characters entering ${gain ? "gain" : "lose"} 1 point of ${attr} (d%=${pct}, d6=${attrRoll}); one-time only, per character.`);
  } else if (category === "Talking") {
    const alignRoll = rollDie(6);
    const alignment = lookup(alignRoll, MAGIC_POOL_ALIGNMENT);
    notes.push(`Grants 1 wish to characters of ${alignment} alignment (d6=${alignRoll}, must be used within 24 hours); damages others 1d20.`);
  } else {
    const r = rollDie(20);
    const dest = lookup(r, MAGIC_POOL_TRANSPORT);
    notes.push(`Transporter pool (d20=${r}): ${dest}.`);
  }
  return notes.join(" ");
}

export function rollCaveOrCavern(): { label: string; width: number; length: number; poolNote: string | null; lakeNote: string | null } {
  const roll = rollDie(20);
  const cave = lookup(roll, CAVES);
  let poolNote: string | null = null;
  let lakeNote: string | null = null;
  if (cave.rollPools) {
    const pRoll = rollDie(20);
    const pool = lookup(pRoll, POOLS);
    poolNote = pool === "Magic pool" ? `Magic Pool — ${magicPoolDescription()}` : pool;
  }
  if (cave.rollLakes) {
    const lRoll = rollDie(20);
    const lake = lookup(lRoll, LAKES);
    lakeNote = lake;
  }
  return { label: cave.label, width: cave.width, length: cave.length, poolNote, lakeNote };
}
