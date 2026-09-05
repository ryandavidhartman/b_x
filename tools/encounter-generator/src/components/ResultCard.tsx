import type { ResolvedMonster } from "../lib/resolveMonster";
import type { DungeonEncounterResult } from "../generators/dungeonEncounter";
import type { WildernessEncounterResult, CastleEncounterResult, LoneNpcResult } from "../generators/wildernessEncounter";
import type { UrbanEncounterResult, UrbanMonsterEncounterResult } from "../generators/urbanEncounter";
import type { EncounterPurposeResult, FrequencyResult, WildernessFrequencyResult } from "../generators/encounterFrequency";
import type { NewHexResult, PointOfInterestResult } from "../generators/hexCrawl";
import type { NpcPartyResult, RivalPartyFlavor } from "../generators/npcParty";
import type { HoardResult } from "../treasure/generators/types";
import type { DungeonLevel } from "../treasure/data/coinHoards";
import { RollableText } from "./RollableText";
import { useState } from "react";

export type LogEntry =
  | { id: string; timestamp: number; kind: "dungeon"; result: DungeonEncounterResult; treasure: HoardResult | null }
  | { id: string; timestamp: number; kind: "wilderness"; result: WildernessEncounterResult; treasure: HoardResult | null }
  | { id: string; timestamp: number; kind: "urban"; result: UrbanEncounterResult }
  | { id: string; timestamp: number; kind: "urbanMonster"; result: UrbanMonsterEncounterResult; treasure: HoardResult | null }
  | { id: string; timestamp: number; kind: "hexTerrain"; result: NewHexResult }
  | { id: string; timestamp: number; kind: "hexPoi"; result: PointOfInterestResult }
  | { id: string; timestamp: number; kind: "hexCataclysm"; result: string[] }
  | { id: string; timestamp: number; kind: "hexUnguardedTreasure"; level: DungeonLevel; result: HoardResult }
  | { id: string; timestamp: number; kind: "npcParty"; result: NpcPartyResult; rival: RivalPartyFlavor | null }
  | { id: string; timestamp: number; kind: "castle"; result: CastleEncounterResult }
  | { id: string; timestamp: number; kind: "dungeonFrequency"; result: FrequencyResult }
  | { id: string; timestamp: number; kind: "wildernessFrequency"; result: WildernessFrequencyResult };

function formatGp(value: number): string {
  return `${Math.round(value * 100) / 100} gp`;
}

function TreasureBlock({ hoard }: { hoard: HoardResult }) {
  const hasAny = hoard.coins.length + hoard.gems.length + hoard.jewelry.length + hoard.magicItems.length > 0;
  return (
    <div className="section">
      <div className="section-heading">Treasure</div>
      {hoard.notes.length > 0 && (
        <p className="fallback-note">{hoard.notes.join(" ")}</p>
      )}
      {!hasAny && hoard.notes.length === 0 && <p className="hint">Nothing here — the percentile rolls all came up empty.</p>}
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

// Shared render path for Dungeon/Wilderness/Urban monster encounters — all three now use the
// exact same terrain/location + level pool mechanism (see generate-appendix-d-tables.mjs), so
// their result shapes only differ in the field name for "where" (terrain vs. location) and in
// Wilderness's extra Lone NPC pre-check.
function MonsterEncounterCard({
  place,
  levelRoll,
  choiceNote,
  monster,
  count,
  resultRaw,
  borrowedFromLevel,
  loneNpc,
  purpose,
  treasure,
  onRerollDragonTreasure,
}: {
  place: string;
  levelRoll: number;
  choiceNote?: string;
  monster: ResolvedMonster | null;
  count: number | null;
  resultRaw: string;
  borrowedFromLevel: string | null;
  loneNpc?: LoneNpcResult | null;
  purpose: EncounterPurposeResult | null;
  treasure: HoardResult | null;
  onRerollDragonTreasure: (ageCategory: number, hitDice: number) => void;
}) {
  const isDragon = monster?.headingName === "Dragon";
  return (
    <>
      <p className="roll-trail">
        {place} · party level = {levelRoll}
        {choiceNote ? ` · ${choiceNote}` : ""}
      </p>
      {loneNpc && (
        <div className="fallback-note">
          Lone NPC encounter (d% = {loneNpc.roll}): {loneNpc.archetype} — see Lone NPC Encounters for what this archetype means.
        </div>
      )}
      {monster && <MonsterStats monster={monster} count={count} />}
      {!monster && !loneNpc && <p className="hint"><RollableText text={resultRaw} /></p>}
      {purpose && (
        <p className="hint">
          Why it's here (d8 = {purpose.roll}): {purpose.purpose}
        </p>
      )}
      {borrowedFromLevel && (
        <div className="fallback-note">
          Nothing tagged here right at party level {levelRoll} — borrowed from Level {borrowedFromLevel} instead.
        </div>
      )}
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
      return `Dungeon Encounter — ${entry.result.location}`;
    case "wilderness":
      return `Wilderness Encounter — ${entry.result.terrain}`;
    case "urban":
      return `Urban Encounter — ${entry.result.timeOfDay === "day" ? "Daytime" : "Nighttime"}`;
    case "urbanMonster":
      return `${entry.result.location} Monster Encounter`;
    case "hexTerrain":
      return "Hex Crawl — New Hex";
    case "hexPoi":
      return "Hex Crawl — Point of Interest";
    case "hexCataclysm":
      return "Hex Crawl — Cataclysm";
    case "hexUnguardedTreasure":
      return "Hex Crawl — Unguarded Treasure";
    case "npcParty":
      return `NPC Party — ${entry.result.archetype}`;
    case "castle":
      return `Castle Encounter — ${entry.result.owner}`;
    case "dungeonFrequency":
      return "Encounter Frequency — Dungeon";
    case "wildernessFrequency":
      return "Encounter Frequency — Wilderness";
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
        <MonsterEncounterCard
          place={entry.result.location}
          levelRoll={entry.result.levelRoll}
          choiceNote={entry.result.choiceNote}
          monster={entry.result.monster}
          count={entry.result.count}
          resultRaw={entry.result.resultRaw}
          borrowedFromLevel={entry.result.borrowedFromLevel}
          purpose={entry.result.purpose}
          treasure={entry.treasure}
          onRerollDragonTreasure={(age, hd) => onRerollDragonTreasure(entry.id, age, hd)}
        />
      )}
      {entry.kind === "wilderness" && (
        <MonsterEncounterCard
          place={entry.result.terrain}
          levelRoll={entry.result.levelRoll}
          choiceNote={entry.result.choiceNote}
          monster={entry.result.monster}
          count={entry.result.count}
          resultRaw={entry.result.resultRaw}
          borrowedFromLevel={entry.result.borrowedFromLevel}
          loneNpc={entry.result.loneNpc}
          purpose={entry.result.purpose}
          treasure={entry.treasure}
          onRerollDragonTreasure={(age, hd) => onRerollDragonTreasure(entry.id, age, hd)}
        />
      )}
      {entry.kind === "urban" && <UrbanCard result={entry.result} />}
      {entry.kind === "urbanMonster" && (
        <MonsterEncounterCard
          place={entry.result.location}
          levelRoll={entry.result.levelRoll}
          choiceNote={entry.result.choiceNote}
          monster={entry.result.monster}
          count={entry.result.count}
          resultRaw={entry.result.resultRaw}
          borrowedFromLevel={entry.result.borrowedFromLevel}
          purpose={entry.result.purpose}
          treasure={entry.treasure}
          onRerollDragonTreasure={(age, hd) => onRerollDragonTreasure(entry.id, age, hd)}
        />
      )}
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
      {entry.kind === "hexUnguardedTreasure" && (
        <>
          <p className="roll-trail">Dungeon Level {entry.level}</p>
          <TreasureBlock hoard={entry.result} />
        </>
      )}
      {entry.kind === "castle" && (
        <p>
          Level {entry.result.level} · Patrol: {entry.result.patrol}
          <br />
          1d6 = {entry.result.reactionRoll} → <strong>{entry.result.reaction}</strong>
        </p>
      )}
      {entry.kind === "dungeonFrequency" && (
        <p>
          1d6 = {entry.result.roll} →{" "}
          <strong>{entry.result.occurs ? "a Wandering Monster occurs this turn." : "no encounter."}</strong>
        </p>
      )}
      {entry.kind === "wildernessFrequency" && (
        <p>
          Treated as <strong>{entry.result.broadTerrain ?? "an unmapped terrain"}</strong>
          {entry.result.chanceRaw ? ` (encounter on ${entry.result.chanceRaw})` : ""} · 1d6 = {entry.result.roll} →{" "}
          <strong>{entry.result.occurs ? "an encounter occurs." : "no encounter."}</strong>
        </p>
      )}
    </div>
  );
}
