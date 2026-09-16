import { useRef, useState } from "react";
import { rollDie } from "@shared/index";
import type { LocationInput } from "../lib/locationInput";
import { createInitialState, stepGeneration, generateWholeDungeon, type DungeonNode, type GenState } from "../generators/randomDungeon";
import { DungeonMap } from "./DungeonMap";
import { EncounterSummary, TreasureSummary } from "./Summaries";

type StartAreaChoice = "empty" | "roll" | 1 | 2 | 3 | 4 | 5 | 6;

function resolveStartArea(choice: StartAreaChoice): number | "empty" {
  if (choice === "empty") return "empty";
  if (choice === "roll") return rollDie(6);
  return choice;
}

function NodeDetail({ node }: { node: DungeonNode }) {
  const [showRolls, setShowRolls] = useState(false);
  return (
    <div className="result-card">
      <div className="result-title">{node.label}</div>
      {node.contents && <p className="note">Contents: {node.contents}</p>}
      {node.encounter && <EncounterSummary result={node.encounter} />}
      {node.wanderingMonsters?.map((w, i) => (
        <div key={i}>
          <p className="note">Wandering monster encountered en route:</p>
          <EncounterSummary result={w} />
        </div>
      ))}
      {node.treasure && <TreasureSummary treasure={node.treasure} />}
      {node.container && (
        <p className="note">
          Container: {node.container}
          {node.guard ? ` — Guarded: ${node.guard}` : ""}
          {node.hidden ? ` — Hidden: ${node.hidden}` : ""}
        </p>
      )}
      {node.trap && <p className="note">Trap: {node.trap}</p>}
      {node.hazard && <p className="note">Environmental Hazard: {node.hazard}</p>}
      {node.trick && <p className="note">Trick: {node.trick}</p>}
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

export function RandomDungeonPanel({ partyLevel, locationInput }: { partyLevel: number; locationInput: LocationInput }) {
  const [maxNodes, setMaxNodes] = useState(60);
  const [startAreaChoice, setStartAreaChoice] = useState<StartAreaChoice>("empty");
  const [nodes, setNodes] = useState<DungeonNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [stepModeActive, setStepModeActive] = useState(false);
  const genStateRef = useRef<GenState | null>(null);

  const subtype = locationInput.category === "dungeon" ? locationInput.dungeonSubtype : undefined;

  if (!subtype) {
    return (
      <div className="panel">
        <h2>Random Dungeon Generation</h2>
        <p className="note warning">
          This tool builds a dungeon floor plan — pick one of the six dungeon location subtypes above (Standard Dungeon, Cave/Cavern
          Network, Tomb/Crypt, Evil Temple/Shrine, Sewer, or Ruins) to use it.
        </p>
      </div>
    );
  }

  function reset() {
    setNodes([]);
    setSelectedId(null);
    setFinished(false);
    setStepModeActive(false);
    genStateRef.current = null;
  }

  function generateWhole() {
    const startArea = resolveStartArea(startAreaChoice);
    const result = generateWholeDungeon({ subtype: subtype!, partyLevel, maxNodes, startArea });
    genStateRef.current = null;
    setStepModeActive(false);
    setNodes(result);
    setFinished(true);
    setSelectedId(result[0]?.id ?? null);
  }

  function startStepByStep() {
    const startArea = resolveStartArea(startAreaChoice);
    const state = createInitialState({ subtype: subtype!, partyLevel, maxNodes, startArea });
    genStateRef.current = state;
    setStepModeActive(true);
    setNodes([...state.nodes]);
    setFinished(false);
    setSelectedId(state.nodes[0]?.id ?? null);
  }

  function nextRoom() {
    const state = genStateRef.current;
    if (!state) return;
    const before = state.nodes.length;
    const more = stepGeneration(state);
    setNodes([...state.nodes]);
    const added = state.nodes.slice(before);
    setSelectedId(added[added.length - 1]?.id ?? selectedId);
    if (!more) setFinished(true);
  }

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="panel">
      <h2>Random Dungeon Generation</h2>
      <p className="note">
        Builds a floor plan room by room from Tables 1-23 — for a location with no map yet. Roll the whole thing before a session, or
        step through it live.
      </p>

      <div className="field-row">
        <div className="field">
          <label htmlFor="max-nodes">Max Rooms</label>
          <input
            id="max-nodes"
            type="number"
            min={5}
            max={150}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Math.min(150, Math.max(5, Number(e.target.value) || 60)))}
          />
        </div>
        <div className="field">
          <label htmlFor="start-area">Starting Area (Table 1)</label>
          <select id="start-area" value={startAreaChoice} onChange={(e) => setStartAreaChoice(e.target.value === "empty" || e.target.value === "roll" ? e.target.value : (Number(e.target.value) as StartAreaChoice))}>
            <option value="empty">Start from an empty area</option>
            <option value="roll">Roll 1d6</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Use Area {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <button onClick={generateWhole}>Generate Whole Dungeon</button>
        <button onClick={startStepByStep}>Start Step by Step</button>
        {stepModeActive && (
          <button onClick={nextRoom} disabled={finished}>
            {finished ? "Finished" : "Next Room →"}
          </button>
        )}
        {nodes.length > 0 && <button onClick={reset}>Reset</button>}
      </div>

      {nodes.length > 0 && (
        <div className="dungeon-layout">
          <div className="dungeon-map-col">
            <DungeonMap nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="dungeon-log-col">
            <div className="dungeon-room-list">
              {nodes.map((n) => (
                <button key={n.id} className={`room-list-item ${n.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(n.id)}>
                  {n.label}
                </button>
              ))}
            </div>
            {selected && <NodeDetail node={selected} />}
          </div>
        </div>
      )}
    </div>
  );
}
