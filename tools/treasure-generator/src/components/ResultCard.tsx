import type { HoardResult } from "../generators/types";
import type { RolledMagicItem } from "../generators/types";

export type LogEntry =
  | { id: string; timestamp: number; kind: "hoard"; hoard: HoardResult }
  | { id: string; timestamp: number; kind: "item"; item: RolledMagicItem; source: string };

function formatGp(value: number): string {
  return `${Math.round(value * 100) / 100} gp`;
}

/** Collapse duplicate rows (same description + value) into a "3x ..." count. */
function groupByLabel<T>(items: T[], describe: (item: T) => { label: string; value: number }): { label: string; value: number; count: number }[] {
  const groups = new Map<string, { label: string; value: number; count: number }>();
  for (const item of items) {
    const { label, value } = describe(item);
    const key = `${label}|${value}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { label, value, count: 1 });
  }
  return [...groups.values()];
}

function MagicItemEntry({ item }: { item: RolledMagicItem }) {
  return (
    <li className="item-entry">
      <span className="item-name">{item.name}</span>
      <span className="item-category">{item.category}</span>
      {item.details.length > 0 && (
        <ul>
          {item.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function HoardCard({ hoard }: { hoard: HoardResult }) {
  const hasCoins = hoard.coins.length > 0;
  const hasGems = hoard.gems.length > 0;
  const hasJewelry = hoard.jewelry.length > 0;
  const hasMagic = hoard.magicItems.length > 0;
  const nothing = !hasCoins && !hasGems && !hasJewelry && !hasMagic;

  return (
    <>
      {nothing && <p className="hint">Nothing here — the percentile rolls all came up empty.</p>}

      {hasCoins && (
        <div className="section">
          <div className="section-heading">Coins</div>
          <ul className="coin-list">
            {hoard.coins.map((c, i) => (
              <li key={i}>
                {c.amount.toLocaleString()} {c.denomination}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasGems && (
        <div className="section">
          <div className="section-heading">
            Gems ({hoard.gems.length})
          </div>
          <ul className="gem-list">
            {groupByLabel(hoard.gems, (g) => ({
              label: `${g.gemType} (${g.category})${g.adjustmentNote ? ` — ${g.adjustmentNote}` : ""}`,
              value: g.finalValue,
            })).map((g, i) => (
              <li key={i}>
                {g.count > 1 ? `${g.count}x ` : ""}
                {g.label} — {formatGp(g.value)}
                {g.count > 1 ? " each" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasJewelry && (
        <div className="section">
          <div className="section-heading">
            Jewelry ({hoard.jewelry.length})
          </div>
          <ul className="gem-list">
            {groupByLabel(hoard.jewelry, (j) => ({ label: j.jewelryType, value: j.value })).map((j, i) => (
              <li key={i}>
                {j.count > 1 ? `${j.count}x ` : ""}
                {j.label} — {formatGp(j.value)}
                {j.count > 1 ? " each" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasMagic && (
        <div className="section">
          <div className="section-heading">Magic Items ({hoard.magicItems.length})</div>
          <ul className="item-list">
            {hoard.magicItems.map((item, i) => (
              <MagicItemEntry key={i} item={item} />
            ))}
          </ul>
        </div>
      )}

      {!nothing && (
        <div className="totals">
          Coin value: {formatGp(hoard.totalCoinValueGp)} · Gems: {formatGp(hoard.totalGemValueGp)} · Jewelry:{" "}
          {formatGp(hoard.totalJewelryValueGp)} · Total (excl. magic items): {formatGp(hoard.totalCoinValueGp + hoard.totalGemValueGp + hoard.totalJewelryValueGp)}
        </div>
      )}
    </>
  );
}

export function ResultCard({ entry }: { entry: LogEntry }) {
  const title = entry.kind === "hoard" ? entry.hoard.label : `Single Magic Item — ${entry.source}`;
  return (
    <div className="card">
      <div className="card-title">
        <h3>{title}</h3>
        <span className="timestamp">{new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      {entry.kind === "hoard" ? (
        <HoardCard hoard={entry.hoard} />
      ) : (
        <ul className="item-list">
          <MagicItemEntry item={entry.item} />
        </ul>
      )}
    </div>
  );
}
