import { useState } from "react";
import { DRESSING_CATEGORIES, type DressingCategory } from "../data/dungeonDressing";
import { rollDressing, rollScene, rollRoomName, type DressingRoll } from "../generators/dungeonDressing";

let nextId = 0;
const newId = () => `dress-${Date.now()}-${nextId++}`;

interface LogEntry {
  id: string;
  label: string;
  rolls: DressingRoll[];
}

export function DressingPanel() {
  const [category, setCategory] = useState<DressingCategory>(DRESSING_CATEGORIES[0]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [roomName, setRoomName] = useState<string | null>(null);

  function rollOne() {
    setLog((prev) => [{ id: newId(), label: category, rolls: [rollDressing(category)] }, ...prev]);
  }

  function rollSceneEntry() {
    setLog((prev) => [{ id: newId(), label: "Scene (Air Currents, Odours, Noises, General)", rolls: rollScene() }, ...prev]);
  }

  return (
    <div className="panel">
      <h2>Dungeon Dressing</h2>
      <p className="note">Sensory detail for a room that holds nothing of mechanical importance — roll <code>d%</code> on any table.</p>

      <div className="field-row">
        <div className="field">
          <label htmlFor="dressing-category">Category</label>
          <select id="dressing-category" value={category} onChange={(e) => setCategory(e.target.value as DressingCategory)}>
            {DRESSING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button onClick={rollOne}>Roll</button>
        <button onClick={rollSceneEntry}>Roll a Scene</button>
        <button
          onClick={() => {
            const name = rollRoomName();
            setRoomName(name);
          }}
        >
          Roll Room Name
        </button>
      </div>

      {roomName && (
        <div className="result-card">
          <div className="result-title">Room Name: {roomName}</div>
        </div>
      )}

      <div className="log">
        {log.map((entry) => (
          <div className="result-card" key={entry.id}>
            <div className="result-title">{entry.label}</div>
            {entry.rolls.map((r, i) => (
              <p className="note" key={i}>
                {r.category} (d% = {r.roll}): {r.result}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
