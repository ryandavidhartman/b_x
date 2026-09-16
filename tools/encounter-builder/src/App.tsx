import { useState } from "react";
import "./App.css";
import { LevelPicker } from "@shared/components/LevelPicker";
import { TERRAIN_NAMES } from "@shared/index";
import { LOCATION_TYPES, categoryFor, dungeonDataKeyFor, type LocationType, type LocationInput } from "./lib/locationInput";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { StockingRoomPanel } from "./components/StockingRoomPanel";
import { DressingPanel } from "./components/DressingPanel";
import { TrapsPanel } from "./components/TrapsPanel";
import { RandomDungeonPanel } from "./components/RandomDungeonPanel";

const TABS = ["Scenario", "Stock a Room", "Dressing", "Traps", "Random Dungeon"] as const;
type Tab = (typeof TABS)[number];

function App() {
  const [partyLevel, setPartyLevel] = useState(1);
  const [locationType, setLocationType] = useState<LocationType>(LOCATION_TYPES[0]);
  const [terrain, setTerrain] = useState(TERRAIN_NAMES[0]);
  const [tab, setTab] = useState<Tab>("Scenario");

  const category = categoryFor(locationType);
  const locationInput: LocationInput = {
    category,
    dungeonSubtype: dungeonDataKeyFor(locationType) ?? undefined,
    terrain: category === "wilderness" ? terrain : undefined,
  };

  return (
    <>
      <header className="app-header">
        <h1>Appendix E: The Encounter Builder</h1>
        <p>Building a deliberately-stocked location — scenario, monsters, floor plan, dressing, and traps.</p>
      </header>

      <div className="panel">
        <div className="field-row">
          <LevelPicker id="party-level" value={partyLevel} onChange={setPartyLevel} />
          <div className="field">
            <label htmlFor="location-type">Location Type</label>
            <select id="location-type" value={locationType} onChange={(e) => setLocationType(e.target.value as LocationType)}>
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          {category === "wilderness" && (
            <div className="field">
              <label htmlFor="terrain">Terrain</label>
              <select id="terrain" value={terrain} onChange={(e) => setTerrain(e.target.value)}>
                {TERRAIN_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Scenario" && <ScenarioPanel />}
      {tab === "Stock a Room" && <StockingRoomPanel partyLevel={partyLevel} locationInput={locationInput} />}
      {tab === "Dressing" && <DressingPanel />}
      {tab === "Traps" && <TrapsPanel />}
      {tab === "Random Dungeon" && <RandomDungeonPanel partyLevel={partyLevel} locationInput={locationInput} />}
    </>
  );
}

export default App;
