// "NPC Parties" (main body, reused throughout Appendix D for Dungeon/Wilderness/Hex Crawl "NPC
// Party" results) + the "Rival Adventuring Parties" flavor layer. Archetype compositions are
// hand-transcribed from the book's prose bullet list (not a table, so not auto-extracted) —
// see the section right before "Trader" in combined-monsters.md.
import npcData from "../data/generated/npcParties.json";
import type { Table } from "../data/generated/types";
import { rollDie, rollSpec, chance, pick } from "../lib/dice";
import { findRowByRoll, cellText } from "../lib/rangeTable";

const DATA = npcData as unknown as {
  raceMulticlass: Table;
  classAndLevel: Table;
  alignment: Table;
  rival: { renown: Table; secretOrGoal: Table; epithetAndName: Table };
};

export type Alignment = "Lawful" | "Neutral" | "Chaotic";

export function rollAlignment(): Alignment {
  const row = findRowByRoll(DATA.alignment.rows, "d6", rollDie(6));
  return cellText(row?.Alignment) as Alignment;
}

export interface NpcClassLevel {
  class: string;
  level: number;
}

function rollClassAndLevel(tier: "Basic" | "Expert"): NpcClassLevel {
  const row = findRowByRoll(DATA.classAndLevel.rows, "d8", rollDie(8));
  if (!row) throw new Error("NPC Adventurer Class and Level table roll out of range");
  return { class: cellText(row.Class), level: rollSpec(cellText(row[tier])) };
}

export interface DemiHumanResult {
  race: string;
  classes: NpcClassLevel[]; // additional classes beyond the member's rolled primary class
}

/** ~20% of party members are demi-human or multi-classed. About half of those who multiclass
 * carry two professions, another quarter three (the book gives no figure for the rest; treated
 * here as two as well). */
function rollDemiHumanFlavor(primary: NpcClassLevel): DemiHumanResult | null {
  if (!chance(20)) return null;
  const row = findRowByRoll(DATA.raceMulticlass.rows, "d%", rollDie(100), { percentile: true });
  if (!row) return null;
  const race = cellText(row.Race);
  const multiclassPct = parseInt(cellText(row["% Multi-Class"]), 10);
  if (!chance(multiclassPct)) return { race, classes: [] };
  // Book gives 50% two-profession / 25% three-profession; the unspecified remaining quarter is
  // folded into "three professions" per the comment above, so the real split is 50% one-extra vs.
  // 50% two-extra (25% explicit + 25% extrapolated), not a plain normalization of the two known buckets.
  const extraCount = chance(50) ? 2 : 1;
  const classes: NpcClassLevel[] = [];
  for (let i = 0; i < extraCount; i++) {
    let next = rollClassAndLevel("Expert");
    let guard = 0;
    while (next.class === primary.class && guard++ < 5) next = rollClassAndLevel("Expert");
    classes.push(next);
  }
  return { race, classes };
}

export interface NpcPartyMember {
  role: string; // "Leader", "Follower", "Retainer", "Apprentice", "Mercenary", or "" for a rank-and-file adventurer
  classLevel: NpcClassLevel;
  demiHuman: DemiHumanResult | null;
}

export interface NpcPartyResult {
  archetype: string;
  members: NpcPartyMember[];
  alignment: Alignment | null; // null when alignment was rolled per-member instead of once
  mounted: boolean | null; // wilderness-only 75% chance, Expert-derived parties
  notes: string[];
}

function member(role: string, tier: "Basic" | "Expert", overrideClass?: string, overrideLevel?: number): NpcPartyMember {
  const classLevel = overrideClass
    ? { class: overrideClass, level: overrideLevel ?? rollSpec("1d4") }
    : rollClassAndLevel(tier);
  return { role, classLevel, demiHuman: rollDemiHumanFlavor(classLevel) };
}

export type Archetype = "Basic Adventurers" | "Expert Adventurers" | "High-Level Cleric" | "High-Level Fighter" | "High-Level Magic-User";

export const ARCHETYPES: Archetype[] = [
  "Basic Adventurers", "Expert Adventurers", "High-Level Cleric", "High-Level Fighter", "High-Level Magic-User",
];

export function rollNpcParty(archetype: Archetype, opts: { inWilderness?: boolean; perMemberAlignment?: boolean } = {}): NpcPartyResult {
  const notes: string[] = [];
  let mounted: boolean | null = null;
  const partyAlignment = opts.perMemberAlignment ? null : rollAlignment();
  const rollMemberAlignmentNote = () => (opts.perMemberAlignment ? notes.push(`(alignment rolled per member, not shown here)`) : undefined);

  switch (archetype) {
    case "Basic Adventurers": {
      const count = rollSpec("1d4+4");
      const members = Array.from({ length: count }, () => member("", "Basic"));
      rollMemberAlignmentNote();
      return { archetype, members, alignment: partyAlignment, mounted: null, notes };
    }
    case "Expert Adventurers": {
      const count = rollSpec("1d6+3");
      const members = Array.from({ length: count }, () => member("", "Expert"));
      if (opts.inWilderness) mounted = chance(75);
      notes.push("Magic items: each member has a 5%-per-level chance of one item (book: \"each appropriate sub-table\" — simplified here to a single roll on Any).");
      rollMemberAlignmentNote();
      return { archetype, members, alignment: partyAlignment, mounted, notes };
    }
    case "High-Level Cleric": {
      const leader = member("Leader", "Expert", "Cleric", rollSpec("1d6+6"));
      const followers = Array.from({ length: rollSpec("1d4") }, () => member("Follower", "Expert", "Cleric", rollSpec("1d4+1")));
      const retainers = Array.from({ length: rollSpec("1d3") }, () => member("Retainer", "Expert", "Fighter", rollSpec("1d6")));
      if (opts.inWilderness) mounted = chance(75);
      return { archetype, members: [leader, ...followers, ...retainers], alignment: partyAlignment, mounted, notes };
    }
    case "High-Level Fighter": {
      const leader = member("Leader", "Expert", "Fighter", rollSpec("1d4+6"));
      const retainers = Array.from({ length: rollSpec("2d4") }, () => member("Retainer", "Expert", undefined, rollSpec("1d4+2")));
      if (opts.inWilderness) mounted = chance(75);
      return { archetype, members: [leader, ...retainers], alignment: partyAlignment, mounted, notes };
    }
    case "High-Level Magic-User": {
      const leader = member("Leader", "Expert", "Magic-User", rollSpec("1d4+6"));
      const apprentices = Array.from({ length: rollSpec("1d4") }, () => member("Apprentice", "Expert", "Magic-User", rollSpec("1d3")));
      const mercenaries = Array.from({ length: rollSpec("1d4") }, () => member("Mercenary", "Expert", "Fighter", rollSpec("1d4+1")));
      notes.push("Apprentices share the leader's alignment; mercenaries may be of any alignment.");
      if (opts.inWilderness) mounted = chance(75);
      return { archetype, members: [leader, ...apprentices, ...mercenaries], alignment: partyAlignment, mounted, notes };
    }
  }
}

export interface RivalPartyFlavor {
  renown: string;
  secretOrGoal: string;
  behavior: string;
  name: string;
}

const ALIGNMENT_BEHAVIOR: Record<Alignment, string> = {
  Lawful: "Negotiates openly and honors deals, even with rivals.",
  Neutral: "Avoids unnecessary conflict and deals fairly, but coldly.",
  Chaotic: "Ambushes rivals when convenient and takes what it wants.",
};

export function rollRivalFlavor(alignment: Alignment): RivalPartyFlavor {
  const renownRow = findRowByRoll(DATA.rival.renown.rows, "d6", rollDie(6));
  const secretRow = findRowByRoll(DATA.rival.secretOrGoal.rows, "d10", rollDie(10));
  const epithet = pick(DATA.rival.epithetAndName.rows).Epithet;
  const name = pick(DATA.rival.epithetAndName.rows).Name;
  return {
    renown: cellText(renownRow?.Renown),
    secretOrGoal: cellText(secretRow?.["Secret or Goal"]),
    behavior: ALIGNMENT_BEHAVIOR[alignment],
    name: `${cellText(epithet)} ${cellText(name)}`,
  };
}
