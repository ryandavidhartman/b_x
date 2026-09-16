import { useState } from "react";
import type { HoardResult } from "@shared/index";
import type { LocationInput } from "../lib/locationInput";
import {
  stockRoom,
  rollTreasureCheck,
  rollUnguardedTreasureForParty,
  type StockRoomResult,
} from "../generators/stockingRoom";
import { rollTrap, rollHazard, type TrapRoll, type HazardEntry } from "../generators/traps";
import { EncounterSummary, TreasureSummary } from "./Summaries";

interface RoomLogEntry {
  id: string;
  result: StockRoomResult;
  trapFollowUp: TrapRoll | null;
  hazardFollowUp: HazardEntry[] | null;
  specialTreasureFollowUp: { roll: number; yes: boolean; treasure: HoardResult | null } | null;
}

let nextId = 0;
const newId = () => `room-${Date.now()}-${nextId++}`;

export function StockingRoomPanel({ partyLevel, locationInput }: { partyLevel: number; locationInput: LocationInput }) {
  const [log, setLog] = useState<RoomLogEntry[]>([]);
  const wildernessMissingTerrain = locationInput.category === "wilderness" && !locationInput.terrain;

  function roll() {
    if (wildernessMissingTerrain) return;
    const result = stockRoom(locationInput, partyLevel);
    setLog((prev) => [
      { id: newId(), result, trapFollowUp: null, hazardFollowUp: null, specialTreasureFollowUp: null },
      ...prev,
    ]);
  }

  function update(id: string, patch: Partial<RoomLogEntry>) {
    setLog((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="panel">
      <h2>Stocking a Room</h2>
      <p className="note">
        Roll <code>1d6</code> for Contents, then <code>1d6</code> on the matching Treasure? column — for a location that already has
        a floor plan.
      </p>
      {wildernessMissingTerrain && <p className="note warning">Pick a terrain above before rolling a wilderness room.</p>}
      <button onClick={roll} disabled={wildernessMissingTerrain}>
        Stock a Room
      </button>

      <div className="log">
        {log.map((entry) => (
          <div className="result-card" key={entry.id}>
            <div className="result-title">
              Contents: {entry.result.contents} (d6 = {entry.result.contentsRoll})
            </div>

            {entry.result.treasureRoll !== null && (
              <p className="note">
                Treasure? (d6 = {entry.result.treasureRoll}, {entry.result.contents} column): {entry.result.treasureYes ? "Yes" : "No"}
              </p>
            )}
            {entry.result.contents === "Special" && <p className="note">No Treasure? column of its own — DM's invention.</p>}

            {entry.result.encounter && <EncounterSummary result={entry.result.encounter} />}
            {entry.result.treasure && <TreasureSummary treasure={entry.result.treasure} />}

            {entry.result.contents === "Trap" && !entry.trapFollowUp && !entry.hazardFollowUp && (
              <div className="field-row">
                <button onClick={() => update(entry.id, { trapFollowUp: rollTrap() })}>Roll on Trap Table</button>
                <button onClick={() => update(entry.id, { hazardFollowUp: rollHazard() })}>Roll as Environmental Hazard</button>
              </div>
            )}
            {entry.trapFollowUp && <p className="note">Trap (d% = {entry.trapFollowUp.roll}): {entry.trapFollowUp.type}</p>}
            {entry.hazardFollowUp && (
              <p className="note">
                Hazard: {entry.hazardFollowUp.map((h) => `${h.column} (d12=${h.roll}): ${h.effect}`).join("; ")}
              </p>
            )}

            {entry.result.contents === "Special" && !entry.specialTreasureFollowUp && (
              <button
                onClick={() => {
                  const check = rollTreasureCheck("Empty");
                  const treasure = check.yes ? rollUnguardedTreasureForParty(partyLevel) : null;
                  update(entry.id, { specialTreasureFollowUp: { ...check, treasure } });
                }}
              >
                Roll Treasure via Empty Column
              </button>
            )}
            {entry.specialTreasureFollowUp && (
              <>
                <p className="note">
                  Treasure? (d6 = {entry.specialTreasureFollowUp.roll}, Empty column): {entry.specialTreasureFollowUp.yes ? "Yes" : "No"}
                </p>
                {entry.specialTreasureFollowUp.treasure && <TreasureSummary treasure={entry.specialTreasureFollowUp.treasure} />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
