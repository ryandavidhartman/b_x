// Shared party-level input (1-20) — Dungeon, Wilderness, and Urban's monster-encounter panels
// all key their table lookup directly off this same number now (see generate-appendix-d-tables.mjs),
// so they share one control instead of each re-implementing the same <input type="number">.
export function LevelPicker({ id, value, onChange }: { id: string; value: number; onChange: (level: number) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>Party Level</label>
      <input id={id} type="number" min={1} max={20} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
