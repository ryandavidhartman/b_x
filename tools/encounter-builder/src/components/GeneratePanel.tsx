// The single-button "Building a Stocked Location" flow: one Generate press produces a map plus a
// numbered key, formatted after a published module page (title/hook, a Random Encounters
// reference table, a signature-item callout, the map, then a two-column prose key) rather than
// the raw dice-trace this app started with. See generators/narrate.ts for what's genuinely
// achievable in that direction (templated prose from real rolls) versus what isn't (hand-authored,
// causally-interconnected plotting — out of reach for any dice procedure, not just this one).
import { useRef, useState } from "react";
import { rollDie } from "@shared/index";
import { mapStyleFor, isBuildingLayout, type LocationInput } from "../lib/locationInput";
import type { Scenario } from "../data/scenarios";
import {
  createInitialState,
  stepGeneration,
  generateWholeDungeon,
  straightenDeadEnds,
  rollAreaEncounterFor,
  STARTING_AREAS,
  type DungeonNode,
  type GenState,
} from "../generators/randomDungeon";
import { generateBuildingLayout, type BuildingEnvelope } from "../generators/buildingLayout";
import type { TempleShape } from "../generators/buildingShapes";
import { narrateArea, areaTitle } from "../generators/narrate";
import type { StockingEncounter } from "../generators/stockingRoom";
import { DungeonMap } from "./DungeonMap";
import { MonsterSummary } from "./Summaries";
import { InlineMarkdown } from "./InlineMarkdown";

type StartAreaChoice = "empty" | "roll" | 1 | 2 | 3 | 4 | 5 | 6;

function resolveStartArea(choice: StartAreaChoice): number | "empty" {
  if (choice === "empty") return "empty";
  if (choice === "roll") return rollDie(6);
  return choice;
}

const LOCATION_LABELS: Record<LocationInput["category"], string> = {
  dungeon: "Dungeon",
  wilderness: "Wilderness Site",
  urban: "Urban Hideout",
  castle: "Castle",
};

function rollRandomEncounterRows(locationInput: LocationInput, partyLevel: number): StockingEncounter[] {
  return Array.from({ length: 4 }, () => rollAreaEncounterFor(locationInput.category, locationInput.dungeonSubtype, locationInput.terrain, partyLevel));
}

function RandomEncountersBox({ rows }: { rows: StockingEncounter[] }) {
  return (
    <div className="random-encounters-box">
      <div className="random-encounters-header">Random Encounters</div>
      <table className="random-encounters-table">
        <thead>
          <tr>
            <th>d4</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.monster ? <MonsterSummary monster={r.monster} count={r.count} /> : "Nothing of note"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Illustrative — rolled independently, not tied to a placed area. Roll again at the table if a wandering check calls for one.</p>
    </div>
  );
}

function findSignatureItem(nodes: DungeonNode[]): { name: string; details: string } | null {
  const items = nodes.flatMap((n) => n.treasure?.magicItems ?? []);
  if (items.length === 0) return null;
  const item = items[Math.floor(Math.random() * items.length)];
  return { name: item.name, details: item.details.join(" ") };
}

function KeyEntry({ node, category }: { node: DungeonNode; category: LocationInput["category"] }) {
  const [showRolls, setShowRolls] = useState(false);
  const { paragraph, bullets } = narrateArea(node, category);
  return (
    <div className="key-entry">
      <p>
        <strong>
          {node.areaNumber}. {areaTitle(node, category)}.
        </strong>{" "}
        <InlineMarkdown text={paragraph} />
      </p>
      {bullets.length > 0 && (
        <ul className="key-bullets">
          {bullets.map((b, i) => (
            <li key={i}>
              <InlineMarkdown text={b} />
            </li>
          ))}
        </ul>
      )}
      {node.wanderingMonsters?.map((w, i) => (
        <div key={i} className="note">
          Wandering monster encountered en route: {w.monster ? <MonsterSummary monster={w.monster} count={w.count} /> : w.resultRaw}
        </div>
      ))}
      <button className="link-button" onClick={() => setShowRolls((s) => !s)}>
        {showRolls ? "Hide" : "Show"} roll transcript ({node.notes.length})
      </button>
      {showRolls && (
        <ul className="roll-transcript">
          {node.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GeneratePanel({ partyLevel, locationInput, scenario }: { partyLevel: number; locationInput: LocationInput; scenario: Scenario }) {
  const [maxNodes, setMaxNodes] = useState(10);
  const [straightenPercent, setStraightenPercent] = useState(0);
  const [startAreaChoice, setStartAreaChoice] = useState<StartAreaChoice>("empty");
  const [templeShape, setTempleShape] = useState<TempleShape>("rectangle");
  const [nodes, setNodes] = useState<DungeonNode[]>([]);
  const [envelope, setEnvelope] = useState<BuildingEnvelope | undefined>(undefined);
  const [randomEncounterRows, setRandomEncounterRows] = useState<StockingEncounter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [stepModeActive, setStepModeActive] = useState(false);
  const genStateRef = useRef<GenState | null>(null);

  const isDungeon = locationInput.category === "dungeon";
  const mapStyle = mapStyleFor(locationInput);
  const buildingLayout = isBuildingLayout(mapStyle);
  const buildingLayoutNote =
    mapStyle === "ruins"
      ? "A Ruins site reads as the recognizable footprint of a fallen building (rendered broken-down, not intact) rather than a branching dungeon crawl, so its rooms are laid out in a ring around a central hall/courtyard"
      : `A ${mapStyle === "castle" ? "Castle" : "Temple"} reads as one building, not a branching dungeon crawl, so its rooms are laid out in a ring around a central hall/courtyard`;
  const areaNodes = nodes.filter((n) => n.areaNumber !== undefined).sort((a, b) => a.areaNumber! - b.areaNumber!);
  const title = `${LOCATION_LABELS[locationInput.category]}${isDungeon ? ` (${locationInput.dungeonSubtype})` : locationInput.category === "wilderness" ? ` (${locationInput.terrain})` : ""} — Party Level ${partyLevel}`;

  function baseOptions() {
    return {
      category: locationInput.category,
      dungeonSubtype: locationInput.dungeonSubtype,
      terrain: locationInput.terrain,
      partyLevel,
      maxNodes,
      startArea: isDungeon ? resolveStartArea(startAreaChoice) : ("empty" as const),
    };
  }

  function reset() {
    setNodes([]);
    setEnvelope(undefined);
    setSelectedId(null);
    setFinished(false);
    setStepModeActive(false);
    genStateRef.current = null;
  }

  function generateWhole() {
    // Castle always uses the plain rectangle (see buildingLayout.ts) — the shape picker only
    // applies to Temple.
    const raw = buildingLayout
      ? generateBuildingLayout(baseOptions(), mapStyle === "temple" ? templeShape : "rectangle")
      : { nodes: generateWholeDungeon(baseOptions()), envelope: undefined };
    const result = straightenDeadEnds(raw.nodes, straightenPercent);
    setEnvelope(raw.envelope);
    setRandomEncounterRows(rollRandomEncounterRows(locationInput, partyLevel));
    genStateRef.current = null;
    setStepModeActive(false);
    setNodes(result);
    setFinished(true);
    // Prefer a numbered area over the literal first node — for a building layout that first node
    // is one of the long aisle-ring corridors spanning most of the map's width, whose highlight box
    // would otherwise blanket the top of the floor plan.
    setSelectedId(result.find((n) => n.areaNumber !== undefined)?.id ?? result[0]?.id ?? null);
  }

  function startStepByStep() {
    const state = createInitialState(baseOptions());
    genStateRef.current = state;
    setEnvelope(undefined); // step-through mode only ever drives the walk engine, never a building layout
    setRandomEncounterRows(rollRandomEncounterRows(locationInput, partyLevel));
    setStepModeActive(true);
    setNodes([...state.nodes]);
    setFinished(false);
    setSelectedId(state.nodes[0]?.id ?? null);
  }

  function nextRoom() {
    const state = genStateRef.current;
    if (!state) return;
    const more = stepGeneration(state);
    if (!more) {
      // Only straighten once the work queue is fully drained — trimming mid-generation could
      // remove a node that pending work still expects to attach to.
      const result = straightenDeadEnds(state.nodes, straightenPercent);
      setNodes(result);
      setFinished(true);
      setSelectedId((id) => (result.some((n) => n.id === id) ? id : (result[0]?.id ?? null)));
    } else {
      setNodes([...state.nodes]);
    }
  }

  const signatureItem = findSignatureItem(nodes);

  return (
    <div className="panel">
      <h2>Generate a Location</h2>
      <p className="note">
        Builds a stocked location — floor plan, monsters, treasure, dressing, and traps — in one pass, following Appendix E's own
        procedure end to end instead of one table at a time.
      </p>
      {buildingLayout && (
        <p className="note">
          Every room's own size, contents, treasure, and monsters still come straight from Appendix E's own tables, exactly like
          any other location — only the floor plan's shape is this app's own invention. {buildingLayoutNote} instead of Appendix
          E's own room-by-room/corridor-by-corridor walk (there's no book procedure for packing rooms into a building's footprint
          at all).
        </p>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="max-nodes">Number of Rooms</label>
          <input
            id="max-nodes"
            type="number"
            min={1}
            max={60}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Math.min(60, Math.max(1, Number(e.target.value) || 10)))}
          />
          <p className="hint">
            {buildingLayout
              ? "Counts rooms lining the building's outer wall, plus the central hall — this location's own ring-and-courtyard layout (not Appendix E's branching walk; see the map's own hint below), so a rare oversized room roll can occasionally come in just under this number instead of stopping exactly on it."
              : "Counts rooms, chambers, caves, and stairs — not the corridors connecting them. Guaranteed: if the layout runs into dead ends before reaching this many, generation adds another passage off an existing room rather than stopping short."}
          </p>
        </div>
        <div className="field">
          <label htmlFor="straighten-percent">Straighten Dead Ends (%)</label>
          <input
            id="straighten-percent"
            type="number"
            min={0}
            max={100}
            value={straightenPercent}
            onChange={(e) => setStraightenPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          />
          <p className="hint">
            Not part of Appendix E's own procedure — an optional cosmetic pass (borrowed from donjon.bin.sh's dungeon generator)
            that trims some percentage of dead-end corridor spurs back to the nearest junction or room, for a less mazelike
            map. 0 (default) leaves every rolled dead end in place. Never removes a room, chamber, cave, cavern, or stairs, and
            never a corridor holding a rolled wandering-monster encounter.
          </p>
        </div>
        {isDungeon && !buildingLayout && (
          <div className="field">
            <label htmlFor="start-area">Starting Area (Table 1)</label>
            <select id="start-area" value={startAreaChoice} onChange={(e) => setStartAreaChoice(e.target.value === "empty" || e.target.value === "roll" ? e.target.value : (Number(e.target.value) as StartAreaChoice))}>
              <option value="empty">Start from an empty area</option>
              <option value="roll">Roll 1d6</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {STARTING_AREAS[n].name}
                </option>
              ))}
            </select>
            <p className="hint">The six pre-drawn layouts are approximated by door count and layout, not traced pixel-for-pixel from the book's art.</p>
          </div>
        )}
        {mapStyle === "temple" && (
          <div className="field">
            <label htmlFor="temple-shape">Building Shape</label>
            <select id="temple-shape" value={templeShape} onChange={(e) => setTempleShape(e.target.value as TempleShape)}>
              <option value="rectangle">Rectangle</option>
              <option value="rhombus">Rhombus</option>
              <option value="hexagon">Hexagon</option>
              <option value="octagon">Octagon</option>
              <option value="star">Star</option>
              <option value="circle">Circle</option>
              <option value="oval">Oval</option>
            </select>
            <p className="hint">
              Not part of Appendix E's own procedure — this app's own choice of exterior footprint. Every room's own size,
              contents, treasure, and monsters still come from the book's own tables either way.
            </p>
          </div>
        )}
      </div>

      <div className="field-row">
        <button className="generate-button" onClick={generateWhole}>
          Generate
        </button>
        {nodes.length > 0 && <button onClick={reset}>Reset</button>}
      </div>
      {!buildingLayout && (
        <p className="hint">
          {stepModeActive ? (
            <button onClick={nextRoom} disabled={finished}>
              {finished ? "Finished" : "Next Room →"}
            </button>
          ) : (
            <button className="link-button" onClick={startStepByStep}>
              Or step through it live, one area at a time
            </button>
          )}
        </p>
      )}

      {nodes.length > 0 && (
        <div className="adventure-sheet">
          <div className="adventure-header">
            <h3>{title}</h3>
            <p className="scenario-hook">
              <em>{scenario.name}.</em> {scenario.description}
            </p>
          </div>

          <RandomEncountersBox rows={randomEncounterRows} />

          {signatureItem && (
            <div className="signature-item-box">
              <div className="signature-item-name">{signatureItem.name}</div>
              <p>{signatureItem.details}</p>
            </div>
          )}

          <div className="dungeon-map-col">
            <DungeonMap
              nodes={nodes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              category={locationInput.category}
              mapStyle={mapStyle}
              envelope={envelope}
              terrain={locationInput.terrain}
            />
          </div>

          <div className="adventure-key">
            {areaNodes.map((n) => (
              <KeyEntry key={n.id} node={n} category={locationInput.category} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
