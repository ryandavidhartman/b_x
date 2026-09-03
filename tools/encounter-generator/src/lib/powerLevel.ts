// A reusable "is this too dangerous for the party" check, applied consistently across every
// encounter-generation path — party/dungeon level must be a first-class AND actually-effective
// parameter everywhere, not just present as an input (see feedback_bx_encounter_gen_fidelity
// memory). Mirrors Urban's existing `outOfPlace` mechanic in urbanEncounter.ts: warn, don't
// auto-reroll or block, so the DM stays in control. This is meant as a permanent defense-in-depth
// layer, not a stopgap for still-unfixed book tables — even a correctly-authored table can put a
// rare, high-HD "Special"/"Dragon"-style result in front of a low-level party by design (a low
// percentage chance of a genuinely dangerous surprise), and the DM should see that flagged either
// way.
//
// Threshold mirrors the book's own Wilderness Encounter Level three-tier die split
// (1d8/1d14/1d20 for party levels 1-3/4-6/7+) and is reused for Dungeon level via
// levelBandForDungeonLevel, so both modes judge "appropriate danger" by the same rule.

export type PartyLevelBand = "1-3" | "4-6" | "7+";

const BAND_ORDER: PartyLevelBand[] = ["1-3", "4-6", "7+"];

const HD_CEILING: Record<PartyLevelBand, number> = {
  "1-3": 5,
  "4-6": 9,
  "7+": Infinity,
};

/** Parses a stat block's "Hit Dice" string into a representative number for comparison — takes
 * the upper end of a range ("3-7*" -> 7), strips trailing modifiers/asterisks. Returns null for
 * "Variable" (Elementals) or otherwise unparseable HD, which is treated as maximally cautious. */
export function parseHitDice(raw: string | undefined): number | null {
  if (!raw || /variable/i.test(raw)) return null;
  const m = raw.match(/(\d+)(?:-(\d+))?/);
  if (!m) return null;
  return m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
}

function minimumAppropriateBand(hd: number | null): PartyLevelBand {
  if (hd === null) return "7+";
  if (hd <= HD_CEILING["1-3"]) return "1-3";
  if (hd <= HD_CEILING["4-6"]) return "4-6";
  return "7+";
}

export function levelBandForDungeonLevel(dungeonLevel: string): PartyLevelBand {
  const n = parseInt(dungeonLevel, 10) || 1;
  if (n <= 3) return "1-3";
  if (n <= 8) return "4-6";
  return "7+";
}

/** Returns the band this monster is actually appropriate for (e.g. "7+") when it exceeds the
 * given current band, or null when the current band already covers it. */
export function checkPowerMismatch(hitDiceRaw: string | undefined, currentBand: PartyLevelBand): PartyLevelBand | null {
  const needed = minimumAppropriateBand(parseHitDice(hitDiceRaw));
  return BAND_ORDER.indexOf(needed) > BAND_ORDER.indexOf(currentBand) ? needed : null;
}
