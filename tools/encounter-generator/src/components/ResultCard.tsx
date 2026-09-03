import type { ResolvedMonster } from "../lib/resolveMonster";
import type { DungeonEncounterResult } from "../generators/dungeonEncounter";
import type { WildernessEncounterResult, CastleEncounterResult } from "../generators/wildernessEncounter";
import type { UrbanEncounterResult } from "../generators/urbanEncounter";
import type { NewHexResult, PointOfInterestResult } from "../generators/hexCrawl";
import type { NpcPartyResult, RivalPartyFlavor } from "../generators/npcParty";
import type { HoardResult } from "../treasure/generators/types";
import { RollableText } from "./RollableText";
import { useState } from "react";

export type LogEntry =
  | { id: string; timestamp: number; kind: "dungeon"; result: DungeonEncounterResult; treasure: HoardResult | null }
  | { id: string; timestamp: number; kind: "wilderness"; result: WildernessEncounterResult; treasure: HoardResult | null }
  | { id: string; timestamp: number; kind: "urban"; result: UrbanEncounterResult }
  | { id: string; timestamp: number; kind: "hexTerrain"; result: NewHexResult }
  | { id: string; timestamp: number; kind: "hexPoi"; result: PointOfInterestResult }
  | { id: string; timestamp: number; kind: "hexCataclysm"; result: string[] }
  | { id: string; timestamp: number; kind: "npcParty"; result: NpcPartyResult; rival: RivalPartyFlavor | null }
  | { id: string; timestamp: number; kind: "castle"; result: CastleEncounterResult };

function formatGp(value: number): string {
  return `${Math.round(value * 100) / 100} gp`;
}

function TreasureBlock({ hoard }: { hoard: HoardResult }) {
  const hasAny = hoard.coins.length + hoard.gems.length + hoard.jewelry.length + hoard.magicItems.length > 0;
  return (
    <div className="section">
      <div className="section-heading">Treasure</div>
      {!hasAny && <p className="hint">Nothing here — the percentile rolls all came up empty.</p>}
      {hoard.coins.length > 0 && (
        <ul className="coin-list">
          {hoard.coins.map((c, i) => (
            <li key={i}>
              {c.amount.toLocaleString()} {c.denomination}
            </li>
          ))}
        </ul>
      )}
      {hoard.gems.length > 0 && <p>{hoard.gems.length} gem(s) — {formatGp(hoard.totalGemValueGp)}</p>}
      {hoard.jewelry.length > 0 && <p>{hoard.jewelry.length} piece(s) of jewelry — {formatGp(hoard.totalJewelryValueGp)}</p>}
      {hoard.magicItems.length > 0 && (
        <ul className="item-list">
          {hoard.magicItems.map((item, i) => (
            <li className="item-entry" key={i}>
              <span className="item-name">{item.name}</span>
              <span className="item-category">{item.category}</span>
              {item.details.length > 0 && (
                <ul>
                  {item.details.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasAny && (
        <div className="totals">
          Total (excl. magic items): {formatGp(hoard.totalCoinValueGp + hoard.totalGemValueGp + hoard.totalJewelryValueGp)}
        </div>
      )}
    </div>
  );
}

function MonsterStats({ monster, count }: { monster: ResolvedMonster; count: number | null }) {
  const displayName = monster.variant && monster.variant !== monster.headingName ? `${monster.headingName}, ${monster.variant}` : monster.headingName;
  const otherVariants = monster.allVariants?.filter((v) => v !== monster.variant) ?? [];
  return (
    <div className="section">
      {monster.fallbackKind === "open-choice" && (
        <div className="fallback-note">
          "{monster.requestedLabel}" doesn't name a specific type here — {monster.biased ? `picked ${displayName} as the best fit` : `randomly picked ${displayName}`}
          {otherVariants.length > 0 ? ` (could equally have been: ${otherVariants.join(", ")})` : ""}.
        </div>
      )}
      {monster.fallbackKind === "no-match" && (
        <div className="fallback-note">
          Requested "{monster.requestedLabel}" — this book doesn't stat that specific type; showing {displayName}'s figures instead.
        </div>
      )}
      <div className="section-heading">
        {count !== null ? `${count}x ` : ""}
        {displayName}
      </div>
      <p className="hint">
        AC {monster.stats["Armor Class"] ?? "?"} · HD {monster.stats["Hit Dice"] ?? "?"} · Move {monster.stats.Move ?? "?"} ·{" "}
        {monster.stats.Attacks ?? "?"} ({monster.stats.Damage ?? "?"}) · Save As {monster.stats["Save As"] ?? "?"} · Morale{" "}
        {monster.stats.Morale ?? "?"} · Treasure {monster.stats["Treasure Type"] ?? "Nil"} · {monster.stats.Alignment ?? "?"}
      </p>
    </div>
  );
}

function DragonTreasureControls({ onReroll }: { onReroll: (ageCategory: number, hitDice: number) => void }) {
  const [age, setAge] = useState(5);
  const [hd, setHd] = useState(10);
  return (
    <div className="sub-panel">
      <div className="sub-panel-title">Dragon treasure — age category &amp; Hit Dice</div>
      <div className="utility-row">
        <label>
          Age (2-7) <input type="number" min={2} max={7} value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ width: "3.5rem" }} />
        </label>
        <label>
          Hit Dice <input type="number" min={1} value={hd} onChange={(e) => setHd(Number(e.target.value))} style={{ width: "3.5rem" }} />
        </label>
        <button onClick={() => onReroll(age, hd)}>Reroll Treasure</button>
      </div>
    </div>
  );
}

function DungeonCard({
  result,
  treasure,
  onRerollDragonTreasure,
}: {
  result: DungeonEncounterResult;
  treasure: HoardResult | null;
  onRerollDragonTreasure: (ageCategory: number, hitDice: number) => void;
}) {
  return (
    <>
      <p className="roll-trail">
        Dungeon Level {result.dungeonLevel} · 1d12 = {result.matrixRoll} → Monster Level {result.monsterLevel} · d% ={" "}
        {result.tableRoll}
        {result.choiceNote ? ` · ${result.choiceNote}` : ""}
      </p>
      {result.dragon && (
        <p className="hint">
          Dragon sub-table: {result.dragon.age}, {result.dragon.hitPointsPerHd} hp/HD
        </p>
      )}
      {result.dragon?.monster && <MonsterStats monster={result.dragon.monster} count={1} />}
      {result.isNpcParty && (
        <div className="fallback-note">
          NPC Party rolled — use the NPC Party mode to generate it{result.npcLevelBoost > 0 ? ` (level +${result.npcLevelBoost} for the dungeon-depth mismatch)` : ""}.
        </div>
      )}
      {result.monster && <MonsterStats monster={result.monster} count={result.adjustedCount} />}
      {!result.isNpcParty && !result.dragon && !result.monster && <p className="hint">{result.monsterLabel}</p>}
      {result.adjustedCount !== result.rolledCount && !result.isNpcParty && (
        <p className="hint">Base roll {result.rolledCount}, adjusted to {result.adjustedCount} for the dungeon-level mismatch.</p>
      )}
      {treasure && <TreasureBlock hoard={treasure} />}
      {result.dragon && <DragonTreasureControls onReroll={onRerollDragonTreasure} />}
    </>
  );
}

function WildernessCard({
  result,
  treasure,
  onRerollDragonTreasure,
}: {
  result: WildernessEncounterResult;
  treasure: HoardResult | null;
  onRerollDragonTreasure: (ageCategory: number, hitDice: number) => void;
}) {
  const isDragon = result.monster?.headingName === "Dragon";
  return (
    <>
      <p className="roll-trail">
        {result.terrain} · category = {result.category} · roll = {result.levelRoll}
        {result.choiceNote ? ` · ${result.choiceNote}` : ""}
      </p>
      {result.dinosaur && (
        <p className="hint">
          Dinosaur sub-table: {result.dinosaur.subCategory} ({result.dinosaur.era})
        </p>
      )}
      {result.monster && <MonsterStats monster={result.monster} count={result.count} />}
      {result.npcParty && (
        <div className="fallback-note">NPC Party rolled ({result.npcParty.archetype}) — see the NPC Party mode for full details.</div>
      )}
      {!result.monster && !result.npcParty && <p className="hint"><RollableText text={result.resultRaw} /></p>}
      {treasure && <TreasureBlock hoard={treasure} />}
      {isDragon && <DragonTreasureControls onReroll={onRerollDragonTreasure} />}
    </>
  );
}

function UrbanCard({ result }: { result: UrbanEncounterResult }) {
  return (
    <>
      <p className="roll-trail">
        {result.timeOfDay === "day" ? "Daytime" : "Nighttime"} · d% = {result.roll}
      </p>
      <div className="section-heading">{result.encounter}</div>
      {result.notes && (
        <p>
          <RollableText text={result.notes} />
        </p>
      )}
      {result.outOfPlace && (
        <div className="fallback-note">
          Out of place for a party under level {result.outOfPlace} — consider rerolling, a rumor/sighting instead, or let it stand as a dangerous surprise.
        </div>
      )}
      {result.autoSubRolls.length > 0 && (
        <ul className="coin-list">
          {result.autoSubRolls.map((s, i) => (
            <li key={i}>
              {s.table}: {s.result}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NpcPartyCard({ result, rival }: { result: NpcPartyResult; rival: RivalPartyFlavor | null }) {
  return (
    <>
      <p className="roll-trail">
        {result.archetype}
        {result.alignment ? ` · ${result.alignment}` : ""}
        {result.mounted !== null ? ` · ${result.mounted ? "mounted" : "on foot"}` : ""}
      </p>
      <ul className="item-list">
        {result.members.map((m, i) => (
          <li className="item-entry" key={i}>
            <span className="item-name">
              {m.role ? `${m.role}: ` : ""}
              {m.classLevel.class} {m.classLevel.level}
            </span>
            {m.demiHuman && (
              <span className="item-category">
                {m.demiHuman.race}
                {m.demiHuman.classes.length > 0 ? ` / ${m.demiHuman.classes.map((c) => `${c.class} ${c.level}`).join(" / ")}` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
      {result.notes.map((n, i) => (
        <p key={i} className="notes-block">
          {n}
        </p>
      ))}
      {rival && (
        <div className="sub-panel">
          <div className="sub-panel-title">Rival Adventuring Party — {rival.name}</div>
          <p className="hint">
            Renown: {rival.renown} · Secret/Goal: {rival.secretOrGoal}
            <br />
            {rival.behavior}
          </p>
        </div>
      )}
    </>
  );
}

function titleFor(entry: LogEntry): string {
  switch (entry.kind) {
    case "dungeon":
      return `Dungeon Encounter — Level ${entry.result.dungeonLevel}`;
    case "wilderness":
      return `Wilderness Encounter — ${entry.result.terrain}`;
    case "urban":
      return `Urban Encounter — ${entry.result.timeOfDay === "day" ? "Daytime" : "Nighttime"}`;
    case "hexTerrain":
      return "Hex Crawl — New Hex";
    case "hexPoi":
      return "Hex Crawl — Point of Interest";
    case "hexCataclysm":
      return "Hex Crawl — Cataclysm";
    case "npcParty":
      return `NPC Party — ${entry.result.archetype}`;
    case "castle":
      return `Castle Encounter — ${entry.result.owner}`;
  }
}

export function ResultCard({
  entry,
  onRerollDragonTreasure,
}: {
  entry: LogEntry;
  onRerollDragonTreasure: (id: string, ageCategory: number, hitDice: number) => void;
}) {
  return (
    <div className="card">
      <div className="card-title">
        <h3>{titleFor(entry)}</h3>
        <span className="timestamp">{new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      {entry.kind === "dungeon" && (
        <DungeonCard result={entry.result} treasure={entry.treasure} onRerollDragonTreasure={(age, hd) => onRerollDragonTreasure(entry.id, age, hd)} />
      )}
      {entry.kind === "wilderness" && (
        <WildernessCard result={entry.result} treasure={entry.treasure} onRerollDragonTreasure={(age, hd) => onRerollDragonTreasure(entry.id, age, hd)} />
      )}
      {entry.kind === "urban" && <UrbanCard result={entry.result} />}
      {entry.kind === "npcParty" && <NpcPartyCard result={entry.result} rival={entry.rival} />}
      {entry.kind === "hexTerrain" && (
        <p>
          Rolled 2d6 = {entry.result.roll}: {entry.result.ruleText} → <strong>{entry.result.terrain}</strong>
        </p>
      )}
      {entry.kind === "hexPoi" && (
        <p>
          1d6 = {entry.result.checkRoll}
          {entry.result.hasPoi ? (
            <>
              {" "}
              — a point of interest! <strong>{entry.result.location}</strong>
              <br />
              <RollableText text={entry.result.development ?? ""} />
            </>
          ) : (
            " — nothing here."
          )}
        </p>
      )}
      {entry.kind === "hexCataclysm" && (
        <ul className="coin-list">
          {entry.result.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
      {entry.kind === "castle" && (
        <p>
          Level {entry.result.level} · Patrol: {entry.result.patrol}
          <br />
          1d6 = {entry.result.reactionRoll} → <strong>{entry.result.reaction}</strong>
        </p>
      )}
    </div>
  );
}
