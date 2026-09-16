// Compact renderers for the shapes tools/shared's generators return — reused by any panel that
// resolves a monster or rolls treasure (Stocking a Room today; Random Dungeon Generation later).
import type { ResolvedMonster, HoardResult } from "@shared/index";
import type { StockingEncounter } from "../generators/stockingRoom";

export function MonsterSummary({ monster, count }: { monster: ResolvedMonster; count: number | null }) {
  const displayName =
    monster.variant && monster.variant !== monster.headingName ? `${monster.headingName}, ${monster.variant}` : monster.headingName;
  return (
    <div className="monster-summary">
      <div className="monster-name">
        {count !== null ? `${count} × ` : ""}
        {displayName}
      </div>
      {monster.fallbackKind === "open-choice" && (
        <p className="note">
          "{monster.requestedLabel}" doesn't name a specific type here —{" "}
          {monster.biased ? `picked ${displayName} as the best fit.` : `randomly picked ${displayName}.`}
        </p>
      )}
      {monster.fallbackKind === "no-match" && (
        <p className="note">
          Requested "{monster.requestedLabel}" — this book doesn't stat that specific type; showing {displayName}'s figures instead.
        </p>
      )}
      <p className="stat-line">
        AC {monster.stats["Armor Class"] ?? "?"} · HD {monster.stats["Hit Dice"] ?? "?"} · Move {monster.stats.Move ?? "?"} ·{" "}
        {monster.stats.Attacks ?? "?"} ({monster.stats.Damage ?? "?"}) · Save As {monster.stats["Save As"] ?? "?"} · Morale{" "}
        {monster.stats.Morale ?? "?"} · Treasure {monster.stats["Treasure Type"] ?? "Nil"} · {monster.stats.Alignment ?? "?"}
      </p>
    </div>
  );
}

// Table cells that list several possible monsters are written as raw markdown source
// ("[Label](#anchor), [Label 2](#anchor2), ..."), and a borrowed-level annotation carries the
// book's own italic markup ("*(as Level N)*") — strip both rather than let markdown syntax leak
// into the UI unrendered. `choiceNote` (a separate, clean "picked at random among N option(s) ->
// X" sentence) is shown alongside, not instead of, the raw table result, so the DM can see both
// the full candidate pool and which one was actually picked.
function stripMarkdown(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*/g, "");
}

export function EncounterSummary({ result }: { result: StockingEncounter }) {
  return (
    <div>
      <p className="note">
        Level {result.levelRoll} table result: {stripMarkdown(result.resultRaw)}
        {result.borrowedFromLevel ? ` (borrowed from Level ${result.borrowedFromLevel})` : ""}
      </p>
      {"choiceNote" in result && result.choiceNote && <p className="note">{result.choiceNote}</p>}
      {"loneNpc" in result && result.loneNpc && <p className="note">Lone NPC encounter: {result.loneNpc.archetype}</p>}
      {result.monster ? (
        <MonsterSummary monster={result.monster} count={result.count} />
      ) : (
        <p className="note">No monster indicated at this level/location.</p>
      )}
      {result.purpose && <p className="note">Why it's here: {result.purpose.purpose}</p>}
    </div>
  );
}

export function TreasureSummary({ treasure }: { treasure: HoardResult }) {
  const totalGp = treasure.totalCoinValueGp + treasure.totalGemValueGp + treasure.totalJewelryValueGp;
  return (
    <div className="treasure-summary">
      <div className="treasure-label">{treasure.label}</div>
      {treasure.coins.length === 0 && treasure.gems.length === 0 && treasure.jewelry.length === 0 && treasure.magicItems.length === 0 ? (
        <p className="note">Nothing rolled.</p>
      ) : (
        <>
          {treasure.coins.length > 0 && (
            <p className="note">Coins: {treasure.coins.map((c) => `${c.amount} ${c.denomination}`).join(", ")}</p>
          )}
          {treasure.gems.length > 0 && (
            <p className="note">Gems: {treasure.gems.map((g) => `${g.gemType} (${g.finalValue} gp)`).join(", ")}</p>
          )}
          {treasure.jewelry.length > 0 && (
            <p className="note">Jewelry: {treasure.jewelry.map((j) => `${j.jewelryType} (${j.value} gp)`).join(", ")}</p>
          )}
          {treasure.magicItems.length > 0 && (
            <p className="note">Magic items: {treasure.magicItems.map((m) => m.name).join(", ")}</p>
          )}
          <p className="note">Total value: {totalGp.toLocaleString()} gp</p>
        </>
      )}
      {treasure.notes.map((n, i) => (
        <p className="note" key={i}>
          {n}
        </p>
      ))}
    </div>
  );
}
