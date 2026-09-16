import { useState } from "react";
import { SEVERITY_LEVELS, SEVERITY_DESCRIPTIONS, HAZARD_COLUMNS, type Severity, type HazardColumn } from "../data/traps";
import { rollTrap, rollHazard, rollTrick, type TrapRoll, type HazardEntry, type TrickRoll } from "../generators/traps";

type SubTab = "trap" | "hazard" | "trick";

let nextId = 0;
const newId = () => `trap-${Date.now()}-${nextId++}`;

interface TrapLog {
  id: string;
  severity: Severity;
  roll: TrapRoll;
}
interface HazardLog {
  id: string;
  severity: Severity;
  entries: HazardEntry[];
}
interface TrickLog {
  id: string;
  roll: TrickRoll;
}

export function TrapsPanel() {
  const [subTab, setSubTab] = useState<SubTab>("trap");
  const [severity, setSeverity] = useState<Severity>("Hazardous");
  const [hazardColumns, setHazardColumns] = useState<HazardColumn[]>(["Movement"]);

  const [trapLog, setTrapLog] = useState<TrapLog[]>([]);
  const [hazardLog, setHazardLog] = useState<HazardLog[]>([]);
  const [trickLog, setTrickLog] = useState<TrickLog[]>([]);

  function toggleColumn(col: HazardColumn) {
    setHazardColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  }

  return (
    <div className="panel">
      <h2>Trap Generation and Placement</h2>
      <div className="sub-tabs">
        <button className={subTab === "trap" ? "active" : ""} onClick={() => setSubTab("trap")}>
          Trap
        </button>
        <button className={subTab === "hazard" ? "active" : ""} onClick={() => setSubTab("hazard")}>
          Environmental Hazard
        </button>
        <button className={subTab === "trick" ? "active" : ""} onClick={() => setSubTab("trick")}>
          Trick
        </button>
      </div>

      {subTab !== "trick" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              {SEVERITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <p className="note severity-note">{SEVERITY_DESCRIPTIONS[severity]}</p>
        </div>
      )}

      {subTab === "trap" && (
        <>
          <button onClick={() => setTrapLog((prev) => [{ id: newId(), severity, roll: rollTrap() }, ...prev])}>
            Roll on Random Trap Generation
          </button>
          <div className="log">
            {trapLog.map((entry) => (
              <div className="result-card" key={entry.id}>
                <div className="result-title">
                  {entry.severity}: {entry.roll.type}
                </div>
                <p className="note">d% = {entry.roll.roll}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {subTab === "hazard" && (
        <>
          <p className="note">Roll one column for a single-effect hazard, or check several to combine them into something worse.</p>
          <div className="field-row">
            {HAZARD_COLUMNS.map((col) => (
              <label key={col} className="checkbox-field">
                <input type="checkbox" checked={hazardColumns.includes(col)} onChange={() => toggleColumn(col)} />
                {col}
              </label>
            ))}
          </div>
          <button
            disabled={hazardColumns.length === 0}
            onClick={() => setHazardLog((prev) => [{ id: newId(), severity, entries: rollHazard(hazardColumns) }, ...prev])}
          >
            Roll Hazard
          </button>
          <div className="log">
            {hazardLog.map((entry) => (
              <div className="result-card" key={entry.id}>
                <div className="result-title">{entry.severity} Hazard</div>
                {entry.entries.map((h, i) => (
                  <p className="note" key={i}>
                    {h.column} (d12 = {h.roll}): {h.effect}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {subTab === "trick" && (
        <>
          <button onClick={() => setTrickLog((prev) => [{ id: newId(), roll: rollTrick() }, ...prev])}>Roll a Trick</button>
          <div className="log">
            {trickLog.map((entry) => (
              <div className="result-card" key={entry.id}>
                <div className="result-title">
                  {entry.roll.object}, {entry.roll.attribute}
                </div>
                <p className="note">
                  Trick Object (d% = {entry.roll.objectRoll}) · Trick Attribute (d% = {entry.roll.attributeRoll})
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
