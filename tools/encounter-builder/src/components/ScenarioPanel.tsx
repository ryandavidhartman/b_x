import { useState } from "react";
import { SCENARIOS, type Scenario } from "../data/scenarios";
import { rollScenario } from "../generators/scenarios";

export function ScenarioPanel() {
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);

  return (
    <div className="panel">
      <h2>Scenario</h2>
      <p className="note">A background theme that gives the location a reason to exist — pick one, or roll <code>1d10</code>.</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="scenario-select">Scenario</label>
          <select
            id="scenario-select"
            value={scenario.d10}
            onChange={(e) => setScenario(SCENARIOS[Number(e.target.value) - 1])}
          >
            {SCENARIOS.map((s) => (
              <option key={s.d10} value={s.d10}>
                {s.d10}. {s.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setScenario(rollScenario())}>Roll d10</button>
      </div>
      <div className="result-card">
        <div className="result-title">{scenario.name}</div>
        <p className="note">{scenario.description}</p>
      </div>
    </div>
  );
}
