import { useState } from "react";
import "./App.css";
import { LAIR_TREASURE, INDIVIDUAL_TREASURE, type DungeonLevel } from "./data/coinHoards";
import { dragonItemChance, dragonMonetaryChance, rollIndividualTreasure, rollLairTreasure, rollUnguardedTreasure } from "./generators/hoard";
import { rollMagicItem, type MagicItemColumn } from "./generators/magicItem";
import type { GenOptions } from "./generators/types";
import { ResultCard, type LogEntry } from "./components/ResultCard";

type Mode = "lair" | "individual" | "unguarded" | "single";

const LAIR_TYPES = LAIR_TREASURE.map((r) => r.type);
const INDIVIDUAL_TYPES = INDIVIDUAL_TREASURE.map((r) => r.type);
const UNGUARDED_LEVELS: DungeonLevel[] = ["1", "2", "3", "4-5", "6-7", "8+"];

const SINGLE_ITEM_COLUMNS: { value: MagicItemColumn; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "weaponOrArmor", label: "Weapon or Armor" },
  { value: "anyExcWeapons", label: "Any, Excluding Weapons" },
];

let nextId = 0;

function App() {
  const [mode, setMode] = useState<Mode>("lair");
  const [lairType, setLairType] = useState("A");
  const [individualType, setIndividualType] = useState("P");
  const [unguardedLevel, setUnguardedLevel] = useState<DungeonLevel>("1");
  const [singleColumn, setSingleColumn] = useState<MagicItemColumn>("any");
  const [checkIntelligentSwords, setCheckIntelligentSwords] = useState(true);
  const [dragonAge, setDragonAge] = useState(5);
  const [dragonHitDice, setDragonHitDice] = useState(10);
  const [log, setLog] = useState<LogEntry[]>([]);

  const options: GenOptions = { checkIntelligentSwords };

  function roll() {
    const timestamp = Date.now();
    const id = `${timestamp}-${nextId++}`;

    if (mode === "lair") {
      const hoard = rollLairTreasure(lairType, options, { ageCategory: dragonAge, hitDice: dragonHitDice });
      setLog((prev) => [{ id, timestamp, kind: "hoard", hoard }, ...prev]);
    } else if (mode === "individual") {
      const hoard = rollIndividualTreasure(individualType, options);
      setLog((prev) => [{ id, timestamp, kind: "hoard", hoard }, ...prev]);
    } else if (mode === "unguarded") {
      const hoard = rollUnguardedTreasure(unguardedLevel, options);
      setLog((prev) => [{ id, timestamp, kind: "hoard", hoard }, ...prev]);
    } else {
      const item = rollMagicItem(singleColumn, options);
      const source = SINGLE_ITEM_COLUMNS.find((c) => c.value === singleColumn)?.label ?? singleColumn;
      setLog((prev) => [{ id, timestamp, kind: "item", item, source }, ...prev]);
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>Appendix B: Treasure Generator</h1>
        <p>A companion roller for the B/X Expert Rulebook's treasure tables.</p>
      </header>

      <div className="panel">
        <div className="mode-tabs">
          <button className={mode === "lair" ? "active" : ""} onClick={() => setMode("lair")}>
            Lair Treasure
          </button>
          <button className={mode === "individual" ? "active" : ""} onClick={() => setMode("individual")}>
            Individual Treasure
          </button>
          <button className={mode === "unguarded" ? "active" : ""} onClick={() => setMode("unguarded")}>
            Unguarded Treasure
          </button>
          <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
            Single Magic Item
          </button>
        </div>

        {mode === "lair" && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="lair-type">Lair Treasure Type</label>
              <select id="lair-type" value={lairType} onChange={(e) => setLairType(e.target.value)}>
                {LAIR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                    {t === "H" ? " (Dragon)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {lairType === "H" && (
              <>
                <div className="field">
                  <label htmlFor="dragon-age">Dragon Age Category (2-7)</label>
                  <input
                    id="dragon-age"
                    type="number"
                    min={2}
                    max={7}
                    value={dragonAge}
                    onChange={(e) => setDragonAge(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dragon-hd">Dragon Hit Dice</label>
                  <input
                    id="dragon-hd"
                    type="number"
                    min={1}
                    value={dragonHitDice}
                    onChange={(e) => setDragonHitDice(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>
        )}
        {mode === "lair" && lairType === "H" && (
          <p className="hint">
            Monetary chance ≈ {dragonMonetaryChance(dragonAge)}% (interpolated from the book's 35% at 2nd category /
            85% at 7th); gems, jewelry, and magic items ≈ {dragonItemChance(dragonHitDice)}% (5% per Hit Die).
          </p>
        )}

        {mode === "individual" && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="individual-type">Individual Treasure Type</label>
              <select id="individual-type" value={individualType} onChange={(e) => setIndividualType(e.target.value)}>
                {INDIVIDUAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "unguarded" && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="unguarded-level">Dungeon Level</label>
              <select id="unguarded-level" value={unguardedLevel} onChange={(e) => setUnguardedLevel(e.target.value as DungeonLevel)}>
                {UNGUARDED_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "single" && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="single-column">Roll On</label>
              <select id="single-column" value={singleColumn} onChange={(e) => setSingleColumn(e.target.value as MagicItemColumn)}>
                {SINGLE_ITEM_COLUMNS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="field-row">
          <div className="checkbox-field">
            <input
              id="check-swords"
              type="checkbox"
              checked={checkIntelligentSwords}
              onChange={(e) => setCheckIntelligentSwords(e.target.checked)}
            />
            <label htmlFor="check-swords">Check swords for intelligence</label>
          </div>
        </div>

        <div className="field-row">
          <button className="roll-button" onClick={roll}>
            Roll
          </button>
          {log.length > 0 && (
            <button className="clear-button" onClick={() => setLog([])}>
              Clear Log
            </button>
          )}
        </div>
      </div>

      <div className="log">
        {log.length === 0 ? (
          <p className="empty-state">No rolls yet — pick a treasure type above and click Roll.</p>
        ) : (
          log.map((entry) => <ResultCard key={entry.id} entry={entry} />)
        )}
      </div>

      <footer>Source: D&amp;D Expert Rulebook, Part 7: Treasure (Appendix B).</footer>
    </>
  );
}

export default App;
