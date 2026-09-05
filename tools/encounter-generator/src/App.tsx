import { useState } from "react";
import "./App.css";
import { rollDungeonEncounter, DUNGEON_LOCATION_NAMES } from "./generators/dungeonEncounter";
import {
  rollWildernessEncounter,
  TERRAIN_NAMES,
  checkBecomingLost,
  checkForaging,
  rollCastleEncounter,
  CASTLE_OWNERS,
} from "./generators/wildernessEncounter";
import { rollUrbanEncounter, rollUrbanMonsterEncounter, URBAN_LOCATION_NAMES, type TimeOfDay } from "./generators/urbanEncounter";
import { rollNewHex, checkPointOfInterest, rollCataclysm, TERRAIN_LOOP } from "./generators/hexCrawl";
import { rollNpcParty, rollRivalFlavor, ARCHETYPES, type Archetype } from "./generators/npcParty";
import { checkDungeonFrequency, checkWildernessFrequency, SETTLEMENT_ENCOUNTER_TURNS } from "./generators/encounterFrequency";
import { rollTreasureForType } from "./generators/treasureAward";
import { rollUnguardedTreasure } from "./treasure/generators/hoard";
import { type DungeonLevel } from "./treasure/data/coinHoards";
import { ResultCard, type LogEntry } from "./components/ResultCard";
import { LevelPicker } from "./components/LevelPicker";

const DUNGEON_LEVELS: DungeonLevel[] = ["1", "2", "3", "4-5", "6-7", "8+"];

type Mode = "dungeon" | "wilderness" | "urban" | "hexcrawl" | "npcparty" | "castle";

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

// Used to auto-resolve dragon treasure the moment a dragon is actually rolled — the DM can then
// adjust and reroll from the result card itself, so these numbers never need a home in the
// pre-roll panel where they'd be irrelevant to every non-dragon roll.
const DEFAULT_DRAGON_AGE = 5;
const DEFAULT_DRAGON_HD = 10;

function App() {
  const [mode, setMode] = useState<Mode>("dungeon");
  const [log, setLog] = useState<LogEntry[]>([]);

  // Dungeon
  const [dungeonLocation, setDungeonLocation] = useState(DUNGEON_LOCATION_NAMES[0]);
  const [dungeonPartyLevel, setDungeonPartyLevel] = useState(1);
  const [dungeonAwardTreasure, setDungeonAwardTreasure] = useState(true);

  // Wilderness
  const [terrain, setTerrain] = useState(TERRAIN_NAMES[0]);
  const [wildPartyLevel, setWildPartyLevel] = useState(1);
  const [airborne, setAirborne] = useState(false);
  const [wildAwardTreasure, setWildAwardTreasure] = useState(true);
  const [utilityResult, setUtilityResult] = useState<string | null>(null);
  const [castleOwner, setCastleOwner] = useState(CASTLE_OWNERS[0]);

  // Urban
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("night");
  const [urbanPartyLevel, setUrbanPartyLevel] = useState(3);
  const [urbanLocation, setUrbanLocation] = useState(URBAN_LOCATION_NAMES[0]);
  const [urbanMonsterAwardTreasure, setUrbanMonsterAwardTreasure] = useState(true);

  // Hex crawl
  const [currentHexTerrain, setCurrentHexTerrain] = useState(TERRAIN_LOOP[0]);
  const [unguardedTreasureLevel, setUnguardedTreasureLevel] = useState<DungeonLevel>(DUNGEON_LEVELS[0]);

  // NPC Party
  const [archetype, setArchetype] = useState<Archetype>(ARCHETYPES[0]);
  const [rollRival, setRollRival] = useState(false);

  function push(entry: LogEntry) {
    setLog((prev) => [entry, ...prev]);
  }

  function rollDungeon() {
    const result = rollDungeonEncounter(dungeonLocation, dungeonPartyLevel);
    const treasureType = result.monster?.stats["Treasure Type"];
    const treasure = dungeonAwardTreasure && treasureType
      ? rollTreasureForType(treasureType, undefined, { ageCategory: DEFAULT_DRAGON_AGE, hitDice: DEFAULT_DRAGON_HD })
      : null;
    push({ id: newId(), timestamp: Date.now(), kind: "dungeon", result, treasure });
  }

  function rollWilderness() {
    const result = rollWildernessEncounter(terrain, wildPartyLevel, airborne);
    const treasureType = result.monster?.stats["Treasure Type"];
    const treasure = wildAwardTreasure && treasureType
      ? rollTreasureForType(treasureType, undefined, { ageCategory: DEFAULT_DRAGON_AGE, hitDice: DEFAULT_DRAGON_HD }, true)
      : null;
    push({ id: newId(), timestamp: Date.now(), kind: "wilderness", result, treasure });
  }

  /** Recomputes just the treasure for one already-rolled dragon encounter with custom age/HD —
   * exposed from the result card, only shown when that roll actually was a dragon. */
  function rerollDragonTreasure(id: string, ageCategory: number, hitDice: number) {
    setLog((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        if (entry.kind === "dungeon" || entry.kind === "wilderness" || entry.kind === "urbanMonster") {
          const treasureType = entry.result.monster?.stats["Treasure Type"];
          if (!treasureType) return entry;
          const inLair = entry.kind !== "dungeon";
          return { ...entry, treasure: rollTreasureForType(treasureType, undefined, { ageCategory, hitDice }, inLair) };
        }
        return entry;
      }),
    );
  }

  function rollUrban() {
    const result = rollUrbanEncounter(timeOfDay);
    push({ id: newId(), timestamp: Date.now(), kind: "urban", result });
  }

  function rollUrbanMonster() {
    const result = rollUrbanMonsterEncounter(urbanLocation, urbanPartyLevel);
    const treasureType = result.monster?.stats["Treasure Type"];
    const treasure = urbanMonsterAwardTreasure && treasureType
      ? rollTreasureForType(treasureType, undefined, { ageCategory: DEFAULT_DRAGON_AGE, hitDice: DEFAULT_DRAGON_HD }, true)
      : null;
    push({ id: newId(), timestamp: Date.now(), kind: "urbanMonster", result, treasure });
  }

  function rollNpc() {
    const result = rollNpcParty(archetype);
    const rival = rollRival && result.alignment ? rollRivalFlavor(result.alignment) : null;
    push({ id: newId(), timestamp: Date.now(), kind: "npcParty", result, rival });
  }

  function rollCastle() {
    const result = rollCastleEncounter(castleOwner);
    push({ id: newId(), timestamp: Date.now(), kind: "castle", result });
  }

  function checkDungeonFreq() {
    push({ id: newId(), timestamp: Date.now(), kind: "dungeonFrequency", result: checkDungeonFrequency() });
  }

  function checkWildernessFreq() {
    push({ id: newId(), timestamp: Date.now(), kind: "wildernessFrequency", result: checkWildernessFrequency(terrain) });
  }

  return (
    <>
      <header className="app-header">
        <h1>Appendix D: Random Encounters</h1>
        <p>A companion roller for the B/X Expert Rulebook's wandering-monster, hex-crawl, and urban-encounter tables.</p>
      </header>

      <div className="panel">
        <div className="mode-tabs">
          {(["dungeon", "wilderness", "urban", "hexcrawl", "npcparty", "castle"] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
              {{ dungeon: "Dungeon", wilderness: "Wilderness", urban: "Urban", hexcrawl: "Hex Crawl", npcparty: "NPC Party", castle: "Castle" }[m]}
            </button>
          ))}
        </div>

        {mode === "dungeon" && (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="dungeon-location">Location</label>
                <select id="dungeon-location" value={dungeonLocation} onChange={(e) => setDungeonLocation(e.target.value)}>
                  {DUNGEON_LOCATION_NAMES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <LevelPicker id="dungeon-party-level" value={dungeonPartyLevel} onChange={setDungeonPartyLevel} />
              <div className="checkbox-field">
                <input id="dungeon-treasure" type="checkbox" checked={dungeonAwardTreasure} onChange={(e) => setDungeonAwardTreasure(e.target.checked)} />
                <label htmlFor="dungeon-treasure">Award treasure</label>
              </div>
            </div>
            <div className="sub-panel">
              <div className="sub-panel-title">Step B — Encounter Frequency (checked every 2 turns)</div>
              <div className="utility-row">
                <button onClick={checkDungeonFreq}>Check for Encounter</button>
              </div>
            </div>
            <div className="field-row">
              <button className="roll-button" onClick={rollDungeon}>
                Roll Encounter
              </button>
            </div>
          </>
        )}

        {mode === "wilderness" && (
          <>
            <div className="field-row">
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
              <LevelPicker id="wild-party-level" value={wildPartyLevel} onChange={setWildPartyLevel} />
              <div className="checkbox-field">
                <input id="airborne" type="checkbox" checked={airborne} onChange={(e) => setAirborne(e.target.checked)} />
                <label htmlFor="airborne">Party is airborne</label>
              </div>
              <div className="checkbox-field">
                <input id="wild-treasure" type="checkbox" checked={wildAwardTreasure} onChange={(e) => setWildAwardTreasure(e.target.checked)} />
                <label htmlFor="wild-treasure">Award treasure</label>
              </div>
            </div>
            <div className="field-row">
              <button className="roll-button" onClick={rollWilderness}>
                Roll Encounter
              </button>
            </div>

            <div className="sub-panel">
              <div className="sub-panel-title">Step B — Encounter Frequency (checked once per day by default)</div>
              <div className="utility-row">
                <button onClick={checkWildernessFreq}>Check for Encounter</button>
              </div>
            </div>

            <div className="sub-panel">
              <div className="sub-panel-title">Wilderness travel utilities</div>
              <div className="utility-row">
                <button onClick={() => { const r = checkBecomingLost(terrain); setUtilityResult(`Becoming Lost — 1d6 = ${r.roll} (vs. ${r.broadTerrain ?? "no direct table entry"}): ${r.lost ? "the party is lost today." : "on course."}`); }}>
                  Check Becoming Lost
                </button>
                <button onClick={() => { const r = checkForaging(); setUtilityResult(`Foraging — 1d6 = ${r.roll}: ${r.found ? `found enough for ${r.feeds} people today.` : "nothing found."}`); }}>
                  Check Foraging
                </button>
              </div>
              {utilityResult && <div className="utility-result">{utilityResult}</div>}
            </div>
          </>
        )}

        {mode === "castle" && (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="castle-owner">Owner</label>
                <select id="castle-owner" value={castleOwner} onChange={(e) => setCastleOwner(e.target.value)}>
                  {CASTLE_OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <button className="roll-button" onClick={rollCastle}>
                Roll Castle Encounter
              </button>
            </div>
          </>
        )}

        {mode === "urban" && (
          <>
            <p className="hint">
              Step B — Encounter Frequency: checked every {SETTLEMENT_ENCOUNTER_TURNS} turns of street activity, or as the DM
              desires — not a die roll, so there's nothing to check here beyond deciding it's time.
            </p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="time-of-day">Time of Day</label>
                <select id="time-of-day" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
                  <option value="day">Daytime</option>
                  <option value="night">Nighttime</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <button className="roll-button" onClick={rollUrban}>
                Roll Street Encounter
              </button>
            </div>

            <div className="sub-panel">
              <div className="sub-panel-title">Real monster encounter (Urban / Castle)</div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="urban-location">Location</label>
                  <select id="urban-location" value={urbanLocation} onChange={(e) => setUrbanLocation(e.target.value as typeof urbanLocation)}>
                    {URBAN_LOCATION_NAMES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <LevelPicker id="urban-party-level" value={urbanPartyLevel} onChange={setUrbanPartyLevel} />
                <div className="checkbox-field">
                  <input id="urban-monster-treasure" type="checkbox" checked={urbanMonsterAwardTreasure} onChange={(e) => setUrbanMonsterAwardTreasure(e.target.checked)} />
                  <label htmlFor="urban-monster-treasure">Award treasure</label>
                </div>
              </div>
              <div className="field-row">
                <button className="roll-button" onClick={rollUrbanMonster}>
                  Roll Monster Encounter
                </button>
              </div>
            </div>
          </>
        )}

        {mode === "hexcrawl" && (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="current-terrain">Current Hex Terrain</label>
                <select id="current-terrain" value={currentHexTerrain} onChange={(e) => setCurrentHexTerrain(e.target.value)}>
                  {TERRAIN_LOOP.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <button
                className="roll-button"
                onClick={() => {
                  const result = rollNewHex(currentHexTerrain);
                  setCurrentHexTerrain(result.terrain);
                  push({ id: newId(), timestamp: Date.now(), kind: "hexTerrain", result });
                }}
              >
                Roll New Hex
              </button>
              <button
                className="roll-button"
                onClick={() => push({ id: newId(), timestamp: Date.now(), kind: "hexPoi", result: checkPointOfInterest() })}
              >
                Check Point of Interest
              </button>
              <button
                className="roll-button"
                onClick={() => push({ id: newId(), timestamp: Date.now(), kind: "hexCataclysm", result: rollCataclysm() })}
              >
                Roll Cataclysm
              </button>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="unguarded-treasure-level">Unguarded Treasure — Dungeon Level</label>
                <select
                  id="unguarded-treasure-level"
                  value={unguardedTreasureLevel}
                  onChange={(e) => setUnguardedTreasureLevel(e.target.value as DungeonLevel)}
                >
                  {DUNGEON_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="roll-button"
                onClick={() =>
                  push({
                    id: newId(),
                    timestamp: Date.now(),
                    kind: "hexUnguardedTreasure",
                    level: unguardedTreasureLevel,
                    result: rollUnguardedTreasure(unguardedTreasureLevel),
                  })
                }
              >
                Roll Unguarded Treasure
              </button>
            </div>
          </>
        )}

        {mode === "npcparty" && (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="archetype">Archetype</label>
                <select id="archetype" value={archetype} onChange={(e) => setArchetype(e.target.value as Archetype)}>
                  {ARCHETYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="checkbox-field">
                <input id="roll-rival" type="checkbox" checked={rollRival} onChange={(e) => setRollRival(e.target.checked)} />
                <label htmlFor="roll-rival">Rival Adventuring Party flavor</label>
              </div>
            </div>
            <div className="field-row">
              <button className="roll-button" onClick={rollNpc}>
                Roll Party
              </button>
            </div>
          </>
        )}

        {log.length > 0 && (
          <div className="field-row">
            <button className="clear-button" onClick={() => setLog([])}>
              Clear Log
            </button>
          </div>
        )}
      </div>

      <div className="log">
        {log.length === 0 ? (
          <p className="empty-state">No rolls yet — pick a mode above and click Roll.</p>
        ) : (
          log.map((entry) => <ResultCard key={entry.id} entry={entry} onRerollDragonTreasure={rerollDragonTreasure} />)
        )}
      </div>

      <footer>Source: D&amp;D Basic/Expert Rulebooks &amp; OSRIC, Dungeons, Towns and Wildernesses (Appendix D).</footer>
    </>
  );
}

export default App;
