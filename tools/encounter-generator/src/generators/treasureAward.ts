// Step F of "Building an Encounter": if a monster's stat block gives a Treasure Type, roll it
// on the Lair Treasure Types table (Appendix B). Stat blocks write this as one or more letters
// (Lair A-O, Individual P-V), sometimes with a flat gp bonus ("E + 5000 gp") or combined with
// another type ("U + V", used by NPC parties). This adapts that raw string into the existing
// treasure engine (copied from tools/treasure-generator — see that app for the full chain).
import { LAIR_TREASURE, INDIVIDUAL_TREASURE } from "../treasure/data/coinHoards";
import { rollLairTreasure, rollIndividualTreasure, type DragonOptions } from "../treasure/generators/hoard";
import { DEFAULT_GEN_OPTIONS, type GenOptions, type HoardResult } from "../treasure/generators/types";

const LAIR_TYPES = new Set(LAIR_TREASURE.map((r) => r.type));
const INDIVIDUAL_TYPES = new Set(INDIVIDUAL_TREASURE.map((r) => r.type));

const NIL_PATTERN = /^(nil|none|-|—)$/i;

function mergeHoards(hoards: HoardResult[], label: string): HoardResult {
  return {
    label,
    coins: hoards.flatMap((h) => h.coins),
    gems: hoards.flatMap((h) => h.gems),
    jewelry: hoards.flatMap((h) => h.jewelry),
    magicItems: hoards.flatMap((h) => h.magicItems),
    totalCoinValueGp: hoards.reduce((s, h) => s + h.totalCoinValueGp, 0),
    totalGemValueGp: hoards.reduce((s, h) => s + h.totalGemValueGp, 0),
    totalJewelryValueGp: hoards.reduce((s, h) => s + h.totalJewelryValueGp, 0),
    notes: hoards.flatMap((h) => h.notes),
  };
}

/** Returns null when the monster's Treasure Type is Nil/None (nothing to roll). */
export function rollTreasureForType(
  treasureType: string,
  options: GenOptions = DEFAULT_GEN_OPTIONS,
  dragon?: DragonOptions,
): HoardResult | null {
  const trimmed = treasureType.trim();
  if (!trimmed || NIL_PATTERN.test(trimmed)) return null;

  // Split "E + 5000 gp" into letter tokens and an optional flat gp bonus; "U + V" splits into
  // two letter tokens with no bonus (neither side is a bare number).
  const tokens = trimmed.split(/[,+]/).map((t) => t.trim()).filter(Boolean);
  const letters: string[] = [];
  let bonusGp = 0;
  for (const token of tokens) {
    const gpMatch = token.match(/^(\d[\d,]*)\s*gp$/i);
    if (gpMatch) {
      bonusGp += parseInt(gpMatch[1].replace(/,/g, ""), 10);
      continue;
    }
    letters.push(token.toUpperCase());
  }

  const hoards: HoardResult[] = letters.map((letter) => {
    if (LAIR_TYPES.has(letter)) return rollLairTreasure(letter, options, dragon);
    if (INDIVIDUAL_TYPES.has(letter)) return rollIndividualTreasure(letter, options);
    return {
      label: `Unrecognized Treasure Type "${letter}"`,
      coins: [], gems: [], jewelry: [], magicItems: [],
      totalCoinValueGp: 0, totalGemValueGp: 0, totalJewelryValueGp: 0,
      notes: [`"${letter}" isn't a known Lair (A-O) or Individual (P-V) treasure type — check the source text.`],
    };
  });

  if (bonusGp > 0) {
    hoards.push({
      label: "Flat bonus",
      coins: [{ denomination: "Gold", amount: bonusGp }],
      gems: [], jewelry: [], magicItems: [],
      totalCoinValueGp: bonusGp, totalGemValueGp: 0, totalJewelryValueGp: 0,
      notes: [],
    });
  }

  if (hoards.length === 0) return null;
  return mergeHoards(hoards, `Treasure Type ${trimmed}`);
}
