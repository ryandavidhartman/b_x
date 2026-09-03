// A handful of table cells reference more than one monster in a single result, e.g.
// "Clay Golem (1-3) or Flesh Golem (4-6) on 1d6" or "Barbed Devil or Bone Devil" (no die given).
// This resolves a cell down to one link: mechanically, when the cell spells out ranges and a
// die to roll them on, otherwise a uniform random pick among the linked options.
import { pick, rollDie } from "./dice";
import type { Cell, Link } from "../data/generated/types";

export interface CellChoice {
  chosenLink: Link | null;
  note?: string;
}

export function pickLinkFromCell(cell: Cell): CellChoice {
  if (cell.links.length === 0) return { chosenLink: null };
  if (cell.links.length === 1) return { chosenLink: cell.links[0] };

  const dieMatch = cell.raw.match(/on\s*1?d(\d+)/i);
  const ranges = [...cell.raw.matchAll(/\((\d+)-(\d+)\)/g)];
  if (dieMatch && ranges.length === cell.links.length) {
    const sides = parseInt(dieMatch[1], 10);
    const roll = rollDie(sides);
    const idx = ranges.findIndex(([, lo, hi]) => roll >= parseInt(lo, 10) && roll <= parseInt(hi, 10));
    const chosen = cell.links[idx === -1 ? 0 : idx];
    return { chosenLink: chosen, note: `rolled 1d${sides} = ${roll} -> ${chosen.label}` };
  }

  const chosen = pick(cell.links);
  return { chosenLink: chosen, note: `picked at random among ${cell.links.length} options -> ${chosen.label}` };
}
